using System.Collections.Concurrent;
using HotelBooking.Application.Reviews;

namespace HotelBooking.API.Services;

public sealed record AiScanStatus(Guid JobId, int HotelId, string State, int Total, int Processed, int Suggested, string? Message, DateTime StartedAt, DateTime? FinishedAt);

/// <summary>
/// Quản lý tác vụ "AI quét đánh giá chờ duyệt" chạy nền (lưu trong bộ nhớ, đủ cho một máy chủ).
/// Mỗi khách sạn chỉ một tác vụ chạy cùng lúc để tránh tiêu hao hạn mức AI gấp đôi.
/// </summary>
public sealed class ReviewAiScanJobs(IServiceScopeFactory scopes, ILogger<ReviewAiScanJobs> logger)
{
    private readonly ConcurrentDictionary<Guid, AiScanStatus> _jobs = new();
    private readonly ConcurrentDictionary<int, Guid> _runningByHotel = new();

    public AiScanStatus? Get(Guid jobId) => _jobs.TryGetValue(jobId, out var s) ? s : null;

    public async Task<AiScanStatus> StartAsync(int hotelId, long actorId, CancellationToken ct)
    {
        if (_runningByHotel.TryGetValue(hotelId, out var running) && Get(running) is { State: "running" } current)
            return current;

        IReadOnlyList<AiReviewInput> pending;
        using (var scope = scopes.CreateScope())
        {
            var ai = scope.ServiceProvider.GetRequiredService<ReviewAiService>();
            if (!ai.IsAvailable)
                return Save(new(Guid.NewGuid(), hotelId, "failed", 0, 0, 0, "Chưa cấu hình nguồn AI nào (Ai:Providers).", DateTime.UtcNow, DateTime.UtcNow));
            pending = await ai.Pending(hotelId, ct);
        }

        var job = Save(new(Guid.NewGuid(), hotelId, pending.Count == 0 ? "completed" : "running", pending.Count, 0, 0,
            pending.Count == 0 ? "Không có đánh giá mới cần AI quét." : null, DateTime.UtcNow, pending.Count == 0 ? DateTime.UtcNow : null));
        if (pending.Count == 0) return job;

        _runningByHotel[hotelId] = job.JobId;
        _ = Task.Run(() => RunAsync(job, pending, actorId));
        return job;
    }

    private async Task RunAsync(AiScanStatus job, IReadOnlyList<AiReviewInput> pending, long actorId)
    {
        var processed = 0; var suggested = 0;
        try
        {
            for (var i = 0; i < pending.Count; i += ReviewAiService.BatchSize)
            {
                var batch = pending.Skip(i).Take(ReviewAiService.BatchSize).ToList();
                using var scope = scopes.CreateScope();
                var ai = scope.ServiceProvider.GetRequiredService<ReviewAiService>();
                suggested += await ai.ScanBatch(batch, actorId, CancellationToken.None);
                processed += batch.Count;
                Save(job with { Processed = processed, Suggested = suggested });
            }
            Save(job with { State = "completed", Processed = processed, Suggested = suggested, FinishedAt = DateTime.UtcNow });
        }
        catch (AiUnavailableException ex)
        {
            Save(job with { State = "failed", Processed = processed, Suggested = suggested, Message = $"Đã quét {processed}/{pending.Count}. {ex.Message}", FinishedAt = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Tác vụ AI quét đánh giá {JobId} lỗi.", job.JobId);
            Save(job with { State = "failed", Processed = processed, Suggested = suggested, Message = $"Đã quét {processed}/{pending.Count}. Có lỗi khi quét, vui lòng thử lại.", FinishedAt = DateTime.UtcNow });
        }
        finally
        {
            _runningByHotel.TryRemove(job.HotelId, out _);
        }
    }

    private AiScanStatus Save(AiScanStatus status) { _jobs[status.JobId] = status; return status; }
}
