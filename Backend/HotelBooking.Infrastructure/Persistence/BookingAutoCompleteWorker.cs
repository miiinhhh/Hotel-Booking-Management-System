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
/// Worker ngầm (mỗi giờ):
///  - Đơn đang lưu trú (CheckedIn) đã qua ngày trả phòng mà nhân viên quên check-out → Completed (khách đánh giá được).
///  - Đơn đã xác nhận (Confirmed) đã qua ngày nhận phòng mà khách không đến → hủy No-show, giữ tiền cọc (không hoàn).
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
        try { await ProcessOverdueStaysAsync(ct); await ProcessNoShowsAsync(ct); }
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

    public async Task<int> ProcessNoShowsAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelBooking.Infrastructure.Data.HotelBookingDBContext>();
        var today = TodayVietnam();
        var now = DateTime.UtcNow;

        // Ngày nhận phòng đã qua (sang ngày hôm sau) mà vẫn chưa check-in.
        var noShows = await db.Bookings
            .Where(b => b.BookingStatus == BookingStatus.Confirmed && b.CheckInDate < today)
            .Take(200)
            .ToListAsync(ct);
        if (noShows.Count == 0) return 0;

        foreach (var booking in noShows)
        {
            booking.BookingStatus = BookingStatus.Cancelled;
            booking.CancellationReason = "No-Show: Khách không đến nhận phòng theo lịch hẹn (hệ thống tự động).";
            booking.CancelledAt = now;
            booking.UpdatedAt = now;
            db.BookingStatusHistory.Add(new BookingStatusHistory
            {
                BookingId = booking.BookingId,
                OldStatus = BookingStatus.Confirmed.ToString(),
                NewStatus = BookingStatus.Cancelled.ToString(),
                ChangedByUserId = null,
                ChangedAt = now,
                Note = "Hệ thống tự động hủy do khách không đến nhận phòng (No-show). Tiền cọc không được hoàn."
            });
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Đã tự động hủy {Count} đơn No-show.", noShows.Count);
        return noShows.Count;
    }
}
