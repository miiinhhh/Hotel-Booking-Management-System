using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelBooking.Infrastructure.Persistence;

/// <summary>
/// Worker ngầm dự phòng: đơn đang lưu trú (CheckedIn) đã qua ngày trả phòng mà nhân viên quên check-out
/// sẽ tự chuyển sang Completed, để khách có thể đánh giá kỳ nghỉ.
/// </summary>
public sealed class BookingAutoCompleteWorker(
    IServiceScopeFactory scopes,
    ILogger<BookingAutoCompleteWorker> logger) : BackgroundService
{
    /// <summary>Giờ Việt Nam (UTC+7) — ngày trả phòng lưu theo lịch địa phương.</summary>
    private static DateOnly TodayVietnam() => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunSafelyAsync(stoppingToken); // chạy ngay khi khởi động
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await RunSafelyAsync(stoppingToken);
    }

    private async Task RunSafelyAsync(CancellationToken ct)
    {
        try { await ProcessOverdueStaysAsync(ct); }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Lỗi khi tự hoàn tất các kỳ lưu trú đã quá ngày trả phòng; sẽ thử lại sau.");
        }
    }

    public async Task<int> ProcessOverdueStaysAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelBooking.Infrastructure.Data.HotelBookingDBContext>();
        var today = TodayVietnam();
        var now = DateTime.UtcNow;

        // Chỉ đơn đã QUA ngày trả phòng (không đóng trong ngày trả phòng khi khách có thể chưa làm thủ tục).
        var overdue = await db.Bookings
            .Where(b => b.BookingStatus == BookingStatus.CheckedIn && b.CheckOutDate < today)
            .Take(200)
            .ToListAsync(ct);
        if (overdue.Count == 0) return 0;

        foreach (var booking in overdue)
        {
            booking.BookingStatus = BookingStatus.Completed;
            booking.UpdatedAt = now;
            db.BookingStatusHistory.Add(new BookingStatusHistory
            {
                BookingId = booking.BookingId,
                OldStatus = BookingStatus.CheckedIn.ToString(),
                NewStatus = BookingStatus.Completed.ToString(),
                ChangedByUserId = null,
                ChangedAt = now,
                Note = "Hệ thống tự động hoàn tất kỳ lưu trú do đã qua ngày trả phòng."
            });
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Đã tự hoàn tất {Count} kỳ lưu trú quá ngày trả phòng.", overdue.Count);
        return overdue.Count;
    }
}
