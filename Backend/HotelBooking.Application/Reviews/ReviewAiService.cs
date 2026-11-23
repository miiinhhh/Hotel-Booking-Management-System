using System.Text.Json;
using System.Text.Json.Serialization;
using HotelBooking.Application.Ai;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;

namespace HotelBooking.Application.Reviews;

/// <summary>Đánh giá chờ duyệt cần AI xem.</summary>
public sealed record AiReviewInput(long ReviewId, byte Rating, string? Comment);

/// <summary>Đề xuất của AI cho một đánh giá. Decision: show | hide | review.</summary>
public sealed record AiReviewSuggestion(long ReviewId, string Decision, double Confidence, IReadOnlyList<string> Labels, string Reason, string Provider, DateTime ScannedAt);

public sealed record AiApplyRequest(double MinConfidence = 0.85);
public sealed record AiApplyResult(int Shown, int Hidden, int Skipped);

/// <summary>
/// AI duyệt sơ bộ đánh giá: chỉ ĐỀ XUẤT (lưu vào lịch sử kiểm duyệt với Action = "AiModeration");
/// nhân viên quyết định từng cái hoặc áp dụng hàng loạt các đề xuất có độ tin cậy cao.
/// </summary>
public sealed class ReviewAiService(IReviewRepository repository, IAiChatClient ai, ReviewService reviews)
{
    public const string AiAction = "AiModeration";
    public const int BatchSize = 10;

    private static readonly JsonSerializerOptions Json = new() { PropertyNameCaseInsensitive = true, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull };

    private const string SystemPrompt = """
        Bạn là người kiểm duyệt đánh giá khách sạn. Với mỗi đánh giá (id, số sao 1-5, nội dung), hãy phân loại:
        - "show": nội dung bình thường, kể cả chê bai gay gắt nhưng lịch sự. KHÔNG BAO GIỜ ẩn một đánh giá chỉ vì nó tiêu cực.
        - "hide": spam/quảng cáo/đường link, chứa thông tin cá nhân (số điện thoại, email, số giấy tờ), xúc phạm/thù ghét nhắm vào cá nhân, nội dung tình dục, hoàn toàn không liên quan tới kỳ nghỉ.
        - "review": trường hợp lửng lơ, ví dụ phàn nàn có thật nhưng dùng từ ngữ thô tục, hoặc nghi ngờ không chắc chắn.
        Nhãn (labels) chọn trong: profanity, harassment, spam, personal_info, off_topic, sexual, none.
        confidence từ 0 đến 1. reason: một câu ngắn tiếng Việt giải thích.
        Chỉ trả về JSON đúng dạng: {"results":[{"id":123,"decision":"show","confidence":0.95,"labels":["none"],"reason":"..."}]}
        """;

    public bool IsAvailable => ai.IsConfigured;

    public Task<IReadOnlyList<AiReviewInput>> Pending(int hotelId, CancellationToken ct) => repository.PendingForAi(hotelId, AiAction, ct);

    /// <summary>Quét một lô; trả về số đánh giá đã có kết quả. Ném AiUnavailableException khi mọi nguồn AI đều lỗi.</summary>
    public async Task<int> ScanBatch(IReadOnlyList<AiReviewInput> batch, long actorId, CancellationToken ct)
    {
        if (batch.Count == 0) return 0;
        var payload = JsonSerializer.Serialize(batch.Select(r => new { id = r.ReviewId, rating = r.Rating, text = (r.Comment ?? "").Length > 1500 ? r.Comment![..1500] : r.Comment ?? "" }));
        var answer = await ai.CompleteAsync(SystemPrompt, payload, ct) ?? throw new AiUnavailableException();

        var results = Parse(answer.Content);
        var known = batch.ToDictionary(r => r.ReviewId);
        var saved = 0;
        foreach (var r in results)
        {
            if (!known.ContainsKey(r.Id)) continue;
            var decision = r.Decision?.Trim().ToLowerInvariant() is "show" or "hide" or "review" ? r.Decision!.Trim().ToLowerInvariant() : "review";
            var stored = JsonSerializer.Serialize(new StoredSuggestion(decision, Math.Clamp(r.Confidence, 0, 1),
                (r.Labels ?? []).Take(5).ToArray(), Truncate(r.Reason, 220), answer.Provider), Json);
            repository.Audit(new ReviewModerationHistory(r.Id, actorId, ReviewStatus.Hidden, ReviewStatus.Hidden, AiAction, Truncate(stored, 500)));
            saved++;
        }
        await repository.Save(ct);
        return saved;
    }

    public async Task<IReadOnlyList<AiReviewSuggestion>> Suggestions(int hotelId, CancellationToken ct)
    {
        var rows = await repository.LatestAiResults(hotelId, AiAction, ct);
        var list = new List<AiReviewSuggestion>();
        foreach (var h in rows)
        {
            try
            {
                var s = JsonSerializer.Deserialize<StoredSuggestion>(h.Reason ?? "", Json);
                if (s is not null) list.Add(new(h.ReviewId, s.D, s.C, s.L ?? [], s.R ?? "", s.P ?? "", h.CreatedAt));
            }
            catch (JsonException) { /* bỏ qua bản ghi hỏng */ }
        }
        return list;
    }

    /// <summary>Áp dụng hàng loạt các đề xuất show/hide có độ tin cậy ≥ ngưỡng; "review" luôn để người quyết.</summary>
    public async Task<AiApplyResult> Apply(int hotelId, long actorId, double minConfidence, CancellationToken ct)
    {
        var threshold = Math.Clamp(minConfidence, 0.5, 1);
        int shown = 0, hidden = 0, skipped = 0;
        foreach (var s in await Suggestions(hotelId, ct))
        {
            if (s.Decision == "review" || s.Confidence < threshold) { skipped++; continue; }
            try
            {
                if (s.Decision == "show")
                {
                    await reviews.Moderate(hotelId, s.ReviewId, actorId, new ModerateReviewRequest(ReviewStatus.Visible, null), ct);
                    shown++;
                }
                else
                {
                    // Đã ở trạng thái ẩn: ghi nhận quyết định ẩn (có lý do) để không còn nằm trong hàng chờ.
                    repository.Audit(new ReviewModerationHistory(s.ReviewId, actorId, ReviewStatus.Hidden, ReviewStatus.Hidden, "Moderation",
                        Truncate($"Ẩn theo đề xuất AI: {s.Reason}", 500)));
                    await repository.Save(ct);
                    hidden++;
                }
            }
            catch (Exception ex) when (ex is DomainRuleException or ConflictException or NotFoundException)
            {
                skipped++;
            }
        }
        return new(shown, hidden, skipped);
    }

    private static List<RawResult> Parse(string content)
    {
        var start = content.IndexOf('{');
        var end = content.LastIndexOf('}');
        if (start < 0 || end <= start) return [];
        try
        {
            return JsonSerializer.Deserialize<RawEnvelope>(content[start..(end + 1)], Json)?.Results ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string Truncate(string? value, int max) => string.IsNullOrEmpty(value) ? "" : value.Length <= max ? value : value[..max];

    private sealed record RawEnvelope(List<RawResult>? Results);
    private sealed record RawResult(long Id, string? Decision, double Confidence, List<string>? Labels, string? Reason);
    /// <summary>Dạng gọn lưu trong cột Reason (≤ 500 ký tự).</summary>
    private sealed record StoredSuggestion(string D, double C, string[]? L, string? R, string? P);
}

public sealed class AiUnavailableException() : Exception("Tất cả nguồn AI hiện không khả dụng (hết hạn mức hoặc lỗi kết nối).");
