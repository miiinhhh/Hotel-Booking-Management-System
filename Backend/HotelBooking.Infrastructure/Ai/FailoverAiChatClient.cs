using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HotelBooking.Application.Ai;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HotelBooking.Infrastructure.Ai;

/// <summary>
/// Gọi lần lượt các nguồn AI tương thích OpenAI (Gemini AI Studio, Groq, OpenRouter…).
/// Hết hạn mức (429), sai/khóa key (401/403), lỗi máy chủ (5xx) hoặc quá thời gian → nguồn đó tạm nghỉ
/// rồi chuyển sang nguồn kế tiếp. Không ghi API key ra log.
/// </summary>
public sealed class FailoverAiChatClient(
    IHttpClientFactory httpFactory,
    IOptionsMonitor<AiOptions> options,
    ILogger<FailoverAiChatClient> logger) : IAiChatClient
{
    /// <summary>Thời điểm từng nguồn được dùng lại (dùng chung toàn ứng dụng).</summary>
    private static readonly ConcurrentDictionary<string, DateTime> CoolDownUntil = new(StringComparer.OrdinalIgnoreCase);

    private IEnumerable<AiProviderOptions> Providers => options.CurrentValue.Providers
        .Where(p => p.Enabled && !string.IsNullOrWhiteSpace(p.BaseUrl) && !string.IsNullOrWhiteSpace(p.ApiKey) && !string.IsNullOrWhiteSpace(p.Model));

    public bool IsConfigured => Providers.Any();

    public async Task<AiChatResult?> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct)
    {
        foreach (var provider in Providers)
        {
            var key = string.IsNullOrWhiteSpace(provider.Name) ? provider.BaseUrl : provider.Name;
            if (CoolDownUntil.TryGetValue(key, out var until) && until > DateTime.UtcNow) continue;

            try
            {
                using var http = httpFactory.CreateClient("ai");
                http.Timeout = TimeSpan.FromSeconds(Math.Clamp(provider.TimeoutSeconds, 5, 120));
                using var request = new HttpRequestMessage(HttpMethod.Post, provider.BaseUrl.TrimEnd('/') + "/chat/completions")
                {
                    Content = JsonContent.Create(BuildBody(provider, systemPrompt, userPrompt)),
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", provider.ApiKey);

                using var response = await http.SendAsync(request, ct);
                if (!response.IsSuccessStatusCode)
                {
                    var pause = response.StatusCode switch
                    {
                        HttpStatusCode.TooManyRequests => TimeSpan.FromMinutes(2),
                        // Key sai/khóa, hết credit, hoặc model không tồn tại / không còn nhà cung cấp phục vụ.
                        HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.PaymentRequired or HttpStatusCode.NotFound => TimeSpan.FromMinutes(30),
                        _ => TimeSpan.FromMinutes(1),
                    };
                    CoolDownUntil[key] = DateTime.UtcNow.Add(pause);
                    logger.LogWarning("Nguồn AI {Provider} trả {Status}; tạm nghỉ {Minutes} phút và chuyển nguồn kế tiếp.", key, (int)response.StatusCode, pause.TotalMinutes);
                    continue;
                }

                using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
                var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString();
                if (string.IsNullOrWhiteSpace(content))
                {
                    CoolDownUntil[key] = DateTime.UtcNow.AddMinutes(1);
                    continue;
                }
                return new AiChatResult(content, key);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                // Quá thời gian, lỗi mạng hoặc phản hồi sai định dạng.
                CoolDownUntil[key] = DateTime.UtcNow.AddMinutes(1);
                logger.LogWarning("Nguồn AI {Provider} lỗi ({Error}); chuyển nguồn kế tiếp.", key, ex.GetType().Name);
            }
        }
        return null;
    }

    /// <summary>Thân yêu cầu chuẩn OpenAI; chỉ thêm "models" (dự phòng của OpenRouter) khi có cấu hình.</summary>
    private static Dictionary<string, object> BuildBody(AiProviderOptions provider, string systemPrompt, string userPrompt)
    {
        var body = new Dictionary<string, object>
        {
            ["model"] = provider.Model,
            ["temperature"] = 0,
            ["messages"] = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt },
            },
        };
        var fallbacks = provider.FallbackModels.Where(m => !string.IsNullOrWhiteSpace(m) && m != provider.Model).Distinct().ToList();
        if (fallbacks.Count > 0) body["models"] = new List<string> { provider.Model }.Concat(fallbacks).ToList();
        return body;
    }
}
