namespace HotelBooking.Application.Ai;

/// <summary>
/// Gọi mô hình ngôn ngữ (chuẩn OpenAI chat/completions) qua nhiều nguồn theo thứ tự ưu tiên.
/// Nguồn hết hạn mức / lỗi sẽ tạm nghỉ và tự chuyển sang nguồn kế tiếp.
/// </summary>
public interface IAiChatClient
{
    /// <summary>Có ít nhất một nguồn AI được cấu hình hay không.</summary>
    bool IsConfigured { get; }

    /// <summary>Trả về nội dung trả lời, hoặc null khi mọi nguồn đều không khả dụng.</summary>
    Task<AiChatResult?> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct);
}

public sealed record AiChatResult(string Content, string Provider);

/// <summary>Một nguồn AI trong cấu hình "Ai:Providers" (thứ tự trong mảng = thứ tự ưu tiên).</summary>
public sealed class AiProviderOptions
{
    public string Name { get; set; } = "";
    /// <summary>Gốc API tương thích OpenAI, VD https://generativelanguage.googleapis.com/v1beta/openai</summary>
    public string BaseUrl { get; set; } = "";
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "";
    /// <summary>
    /// (OpenRouter) Model dự phòng gửi qua tham số "models": model chính lỗi/quá tải thì OpenRouter tự chuyển.
    /// VD ["openrouter/free"] = chọn ngẫu nhiên một model miễn phí. Chỉ nên liệt kê model miễn phí.
    /// </summary>
    public List<string> FallbackModels { get; set; } = new();
    public bool Enabled { get; set; } = true;
    public int TimeoutSeconds { get; set; } = 30;
}

public sealed class AiOptions
{
    public const string SectionName = "Ai";
    public List<AiProviderOptions> Providers { get; set; } = new();
}
