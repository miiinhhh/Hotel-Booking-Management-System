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
/// Worker ngầm tự động quét và giải phóng các đơn đặt phòng Pending đã hết thời hạn giữ chỗ (15 phút)
/// </summary>
public sealed class BookingHoldExpirationWorker(
    IServiceScopeFactory scopes,
    ILogger<BookingHoldExpirationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Quét định kỳ mỗi 30 giây
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ProcessExpiredHoldsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogWarning(ex, "Đã xảy ra lỗi khi quét đơn đặt phòng hết hạn giữ chỗ; sẽ thử lại sau.");
            }
        }
    }

    public async Task ProcessExpiredHoldsAsync(CancellationToken ct)
    {
        using var scope = scopes.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelBooking.Infrastructure.Data.HotelBookingDBContext>();
        var now = DateTime.UtcNow;

        var expiredBookings = await db.Bookings
            .Where(b => b.BookingStatus == BookingStatus.Pending 
                     && b.HoldExpiresAt != null 
                     && b.HoldExpiresAt <= now)
            .Take(100)
            .ToListAsync(ct);

        if (expiredBookings.Count == 0) return;

        logger.LogInformation("Phát hiện {Count} đơn đặt phòng quá hạn giữ chỗ 15 phút. Tiến hành chuyển sang Expired.", expiredBookings.Count);

        foreach (var booking in expiredBookings)
        {
            booking.BookingStatus = BookingStatus.Expired;
            booking.UpdatedAt = now;

            db.BookingStatusHistory.Add(new BookingStatusHistory
            {
                BookingId = booking.BookingId,
                OldStatus = BookingStatus.Pending.ToString(),
                NewStatus = BookingStatus.Expired.ToString(),
                ChangedByUserId = null,
                ChangedAt = now,
                Note = "Hệ thống tự động giải phóng phòng do quá thời hạn thanh toán cọc 15 phút."
            });
        }

        await db.SaveChangesAsync(ct);
    }
}
