using System.Security.Claims;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BookingDataDbContext = HotelBooking.Infrastructure.Data.HotelBookingDBContext;

namespace HotelBooking.API.Controllers;

/// <summary>
/// Thông báo của khách hàng. Nội dung chữ do frontend dựng theo <see cref="Type"/> (hỗ trợ đa ngôn ngữ);
/// Id ổn định cho cùng một sự kiện để lưu trạng thái đã đọc.
/// </summary>
public sealed record CustomerNotificationDto(
    string Id, string Type, string Severity, DateTime OccurredAt, bool IsRead,
    long? BookingId, string? BookingCode, string? HotelName, string? Detail, decimal? Amount, DateOnly? Date);

[ApiController]
[Route("api/me/notifications")]
[Authorize]
public sealed class CustomerNotificationsController(
    BookingDataDbContext bookingDb, HotelDbContext hotelDb, NotificationReadStore reads) : ControllerBase
{
    private const string Action = "action";
    private const string Info = "info";
    /// <summary>Chỉ xét sự kiện trong khoảng này để danh sách gọn.</summary>
    private static readonly TimeSpan Window = TimeSpan.FromDays(45);

    private long UserId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var userId = UserId;
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var since = now - Window;
        var items = new List<CustomerNotificationDto>();

        var bookings = await bookingDb.Bookings.AsNoTracking()
            .Where(b => b.CustomerId == userId && (b.CreatedAt >= since || b.UpdatedAt >= since || b.CheckOutDate >= DateOnly.FromDateTime(since)))
            .Select(b => new
            {
                b.BookingId, b.BookingCode, b.BookingStatus, b.PaymentStatus, b.CheckInDate, b.CheckOutDate,
                b.HoldExpiresAt, b.RemainingAmount, b.DepositAmount, b.CreatedAt, b.UpdatedAt, b.CancelledAt,
                RoomIds = b.BookingDetails.Select(d => d.RoomId).ToList()
            })
            .ToListAsync(ct);
        if (bookings.Count == 0) return Ok(new { success = true, data = Array.Empty<CustomerNotificationDto>() });

        // Tên khách sạn của từng đơn (qua phòng → hạng phòng → khách sạn).
        var roomIds = bookings.SelectMany(b => b.RoomIds).Distinct().ToList();
        var roomHotel = await (from room in bookingDb.Set<InventoryRoom>().AsNoTracking()
                               join type in bookingDb.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
                               where roomIds.Contains(room.RoomId)
                               select new { room.RoomId, type.HotelId }).ToListAsync(ct);
        var hotelIds = roomHotel.Select(x => x.HotelId).Distinct().ToList();
        var hotelNames = await hotelDb.Hotels.AsNoTracking().Where(h => hotelIds.Contains(h.HotelId))
            .ToDictionaryAsync(h => h.HotelId, h => h.HotelName, ct);
        var roomToHotel = roomHotel.ToDictionary(x => x.RoomId, x => x.HotelId);
        string? HotelOf(List<long> rooms) => rooms.Select(r => roomToHotel.TryGetValue(r, out var h) ? hotelNames.GetValueOrDefault(h) : null)
            .FirstOrDefault(n => n is not null);
        var info = bookings.ToDictionary(b => b.BookingId, b => (b.BookingCode, Hotel: HotelOf(b.RoomIds)));

        CustomerNotificationDto N(string id, string type, string severity, DateTime at, long bookingId,
            string? detail = null, decimal? amount = null, DateOnly? date = null)
            => new(id, type, severity, at, false, bookingId, info[bookingId].BookingCode, info[bookingId].Hotel, detail, amount, date);

        foreach (var b in bookings)
        {
            // 1. Đơn đang giữ chỗ chờ thanh toán cọc.
            if (b.BookingStatus == BookingStatus.Pending && b.HoldExpiresAt > now)
                items.Add(N($"c-hold-{b.BookingId}", "PaymentDue", Action, b.CreatedAt, b.BookingId, amount: b.DepositAmount > 0 ? b.DepositAmount : null));

            // 2. Sắp nhận phòng (trong 2 ngày tới).
            if (b.BookingStatus == BookingStatus.Confirmed && b.CheckInDate >= today && b.CheckInDate.DayNumber - today.DayNumber <= 2)
                items.Add(N($"c-soon-{b.BookingId}-{b.CheckInDate:yyyyMMdd}", "CheckInSoon", Info,
                    b.CheckInDate.AddDays(-2).ToDateTime(TimeOnly.MinValue) < now ? now.Date : b.CheckInDate.AddDays(-2).ToDateTime(TimeOnly.MinValue),
                    b.BookingId, amount: b.RemainingAmount > 0 ? b.RemainingAmount : null, date: b.CheckInDate));

            // 3. Hoàn tiền.
            if (b.PaymentStatus is "RefundPending" or "Refunded")
                items.Add(N($"c-refund-{b.BookingId}-{b.PaymentStatus}", b.PaymentStatus == "Refunded" ? "Refunded" : "RefundPending", Info,
                    b.UpdatedAt ?? b.CancelledAt ?? b.CreatedAt, b.BookingId));
        }

        // 4. Thay đổi trạng thái đơn do khách sạn/hệ thống (bỏ qua thao tác do chính khách thực hiện).
        var bookingIds = bookings.Select(b => b.BookingId).ToList();
        var history = await bookingDb.BookingStatusHistory.AsNoTracking()
            .Where(h => bookingIds.Contains(h.BookingId) && h.ChangedAt >= since && h.ChangedByUserId != userId)
            .OrderByDescending(h => h.ChangedAt).Take(60).ToListAsync(ct);
        foreach (var h in history)
        {
            var type = h.NewStatus switch
            {
                nameof(BookingStatus.Confirmed) => "BookingConfirmed",
                nameof(BookingStatus.CheckedIn) => "CheckedIn",
                nameof(BookingStatus.CheckedOut) or nameof(BookingStatus.Completed) => "CheckedOut",
                nameof(BookingStatus.Cancelled) => "BookingCancelled",
                nameof(BookingStatus.Expired) => "BookingExpired",
                _ => null,
            };
            // Hoàn tất tự động sau khi đã trả phòng không cần báo lần nữa.
            // Dòng giữ nguyên trạng thái (đổi lịch, xếp phòng) không phải sự kiện xác nhận/nhận phòng mới.
            if (type is null || h.OldStatus == h.NewStatus || (h.NewStatus == nameof(BookingStatus.Completed) && h.OldStatus == nameof(BookingStatus.CheckedOut))) continue;
            items.Add(N($"c-st-{h.BookingStatusHistoryId}", type, type is "BookingCancelled" or "BookingExpired" ? Action : Info, h.ChangedAt, h.BookingId, detail: h.Note));
        }

        // 5. Mời đánh giá: đã trả phòng trong 30 ngày, chưa có đánh giá.
        var reviewed = await bookingDb.Set<Review>().AsNoTracking().Where(r => bookingIds.Contains(r.BookingId))
            .Select(r => new { r.ReviewId, r.BookingId }).ToListAsync(ct);
        var reviewedIds = reviewed.Select(r => r.BookingId).ToHashSet();
        foreach (var b in bookings.Where(b => b.BookingStatus is BookingStatus.Completed or BookingStatus.CheckedOut
                     && !reviewedIds.Contains(b.BookingId) && (b.UpdatedAt ?? b.CreatedAt) >= now.AddDays(-30)))
            items.Add(N($"c-review-{b.BookingId}", "ReviewInvite", Action, b.UpdatedAt ?? b.CreatedAt, b.BookingId));

        // 6. Kết quả kiểm duyệt đánh giá.
        var reviewIds = reviewed.Select(r => r.ReviewId).ToList();
        var reviewBooking = reviewed.ToDictionary(r => r.ReviewId, r => r.BookingId);
        var moderation = await bookingDb.Set<ReviewModerationHistory>().AsNoTracking()
            .Where(m => reviewIds.Contains(m.ReviewId) && m.Action == "Moderation" && m.CreatedAt >= since)
            .ToListAsync(ct);
        foreach (var m in moderation)
            items.Add(N($"c-rv-{m.HistoryId}", m.NewStatus == ReviewStatus.Visible ? "ReviewPublished" : "ReviewHidden",
                m.NewStatus == ReviewStatus.Visible ? Info : Action, m.CreatedAt, reviewBooking[m.ReviewId],
                detail: m.NewStatus == ReviewStatus.Hidden ? m.Reason : null));

        var readKeys = await reads.ReadKeysAsync(userId, items.Select(i => i.Id), ct);
        var result = items
            .Select(i => i with { IsRead = readKeys.Contains(i.Id) })
            .OrderByDescending(i => i.OccurredAt)
            .Take(40)
            .ToList();
        return Ok(new { success = true, data = result });
    }
}
