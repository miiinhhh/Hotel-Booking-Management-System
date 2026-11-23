using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Persistence;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PersistenceDbContext = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using BookingDataDbContext = HotelBooking.Infrastructure.Data.HotelBookingDBContext;

namespace HotelBooking.API.Controllers;

/// <summary>Một thông báo đã tổng hợp. Id ổn định cho cùng một tình huống, đổi khi có sự kiện mới.</summary>
public sealed record NotificationDto(
    string Id, string Type, string Severity, string Title, string Description, string Icon,
    DateTime OccurredAt, string? Link, bool IsRead);

public sealed record MarkNotificationsReadRequest([Required, MaxLength(NotificationReadStore.MaxKeysPerRequest)] string[] Keys);

/// <summary>Đánh dấu đã đọc — dùng chung cho Admin và Staff (đồng bộ giữa các thiết bị).</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController(NotificationReadStore reads) : ControllerBase
{
    [HttpPost("read")]
    public async Task<IActionResult> MarkRead(MarkNotificationsReadRequest request, CancellationToken ct)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var added = await reads.MarkReadAsync(userId, request.Keys ?? [], ct);
        return Ok(new { success = true, data = new { marked = added } });
    }
}

/// <summary>
/// Thông báo cho Admin: chỉ những việc cần quyết định hoặc bất thường cần chú ý.
/// Mỗi nhóm chỉ hiện khi tài khoản có quyền tương ứng.
/// </summary>
[ApiController]
[Route("api/admin/notifications")]
[Authorize(Roles = SystemRoles.Admin)]
public sealed class AdminNotificationsController(
    PersistenceDbContext coreDb, BookingDataDbContext bookingDb, HotelBooking.Infrastructure.Persistence.HotelDbContext hotelDb, NotificationReadStore reads,
    HotelBooking.Infrastructure.Data.HotelBookingDbContext authDb) : ControllerBase
{
    private const string Action = "action"; // Cần xử lý
    private const string Info = "info";     // Để ý

    private long ActorId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private bool Can(string permission) => User.HasClaim(PermissionAuthorization.ClaimType, permission);

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var items = new List<NotificationDto>();
        NotificationDto N(string id, string type, string severity, string title, string description, string icon, DateTime at, string? link)
            => new(id, type, severity, title, description, icon, at, link, false);

        // ---------- Đánh giá ----------
        if (Can(SystemPermissions.ReviewsManage))
        {
            var reviews = bookingDb.Set<Review>().AsNoTracking();
            var history = bookingDb.Set<ReviewModerationHistory>().AsNoTracking();
            // Chờ duyệt = đang ẩn và chưa có lần kiểm duyệt nào sau lần gửi/sửa gần nhất.
            var pending = await reviews
                .Where(r => r.Status == ReviewStatus.Hidden &&
                    !history.Any(h => h.ReviewId == r.ReviewId && h.Action == "Moderation" && h.CreatedAt >= (r.UpdatedAt ?? r.CreatedAt)))
                .Select(r => new { r.ReviewId, At = r.UpdatedAt ?? r.CreatedAt })
                .ToListAsync(ct);
            if (pending.Count > 0)
            {
                var latest = pending.MaxBy(x => x.At)!;
                items.Add(N($"reviews-pending-{pending.Count}-{latest.ReviewId}-{latest.At.Ticks}", "ReviewsPending", Action,
                    "Đánh giá chờ duyệt", $"{pending.Count} đánh giá mới hoặc vừa sửa đang chờ hiển thị.", "rate_review", latest.At, "reviews"));
            }
            var since = now.AddDays(-7);
            var lowRatings = await reviews
                .Where(r => r.Rating <= 2 && r.Status != ReviewStatus.Deleted && r.CreatedAt >= since)
                .OrderByDescending(r => r.CreatedAt).Take(5)
                .Select(r => new { r.ReviewId, r.Rating, r.BookingId, r.CreatedAt })
                .ToListAsync(ct);
            items.AddRange(lowRatings.Select(r => N($"review-low-{r.ReviewId}", "ReviewLowRating", Info,
                "Đánh giá điểm thấp", $"Đánh giá #{r.ReviewId} ({r.Rating}/5 sao) cho booking #{r.BookingId}.", "sentiment_dissatisfied", r.CreatedAt, "reviews")));
        }

        // ---------- Thanh toán / hoàn tiền ----------
        if (Can(SystemPermissions.PaymentManage))
        {
            var overdue = now.AddHours(-24);
            var refunds = await bookingDb.Bookings.AsNoTracking()
                .Where(b => b.PaymentStatus == "RefundPending" && (b.CancelledAt ?? b.UpdatedAt ?? b.CreatedAt) <= overdue)
                .OrderBy(b => b.CancelledAt).Take(10)
                .Select(b => new { b.BookingId, b.BookingCode, At = b.CancelledAt ?? b.UpdatedAt ?? b.CreatedAt })
                .ToListAsync(ct);
            if (refunds.Count > 0)
                items.Add(N($"refunds-overdue-{string.Join('.', refunds.Select(r => r.BookingId))}", "RefundOverdue", Action,
                    "Hoàn tiền quá 24 giờ", $"{refunds.Count} booking đã hủy chờ hoàn tiền: {string.Join(", ", refunds.Take(3).Select(r => r.BookingCode))}{(refunds.Count > 3 ? "…" : "")}.",
                    "currency_exchange", refunds.Min(r => r.At), null));
        }
        if (Can(SystemPermissions.PaymentView) || Can(SystemPermissions.PaymentManage))
        {
            var since = now.AddDays(-3);
            var failed = await bookingDb.Set<ReportPayment>().AsNoTracking()
                .Where(p => p.Status == nameof(PaymentStatus.Failed) && p.CreatedAt >= since)
                .OrderByDescending(p => p.CreatedAt).Take(20)
                .Select(p => new { p.PaymentId, p.BookingId, p.CreatedAt })
                .ToListAsync(ct);
            if (failed.Count > 0)
                items.Add(N($"payments-failed-{failed[0].PaymentId}-{failed.Count}", "PaymentFailed", Action,
                    "Thanh toán thất bại", $"{failed.Count} giao dịch thất bại trong 3 ngày qua (gần nhất: booking #{failed[0].BookingId}).",
                    "credit_card_off", failed[0].CreatedAt, null));
        }

        // ---------- Booking ----------
        if (Can(SystemPermissions.BookingView))
        {
            var weekStart = now.AddDays(-7);
            var baseStart = now.AddDays(-35);
            var stats = await bookingDb.Bookings.AsNoTracking()
                .Where(b => b.CreatedAt >= baseStart)
                .Select(b => new { b.CreatedAt, Cancelled = b.BookingStatus == BookingStatus.Cancelled })
                .ToListAsync(ct);
            var week = stats.Where(x => x.CreatedAt >= weekStart).ToList();
            var baseline = stats.Where(x => x.CreatedAt < weekStart).ToList();
            var weekCancelled = week.Count(x => x.Cancelled);
            var weekRate = week.Count == 0 ? 0 : (decimal)weekCancelled / week.Count;
            var baseRate = baseline.Count == 0 ? 0 : (decimal)baseline.Count(x => x.Cancelled) / baseline.Count;
            if (weekCancelled >= 3 && weekRate >= baseRate + 0.10m)
                items.Add(N($"cancel-spike-{today:yyyyMMdd}", "CancellationSpike", Info,
                    "Tỷ lệ hủy tăng bất thường", $"7 ngày qua hủy {weekRate:P0} ({weekCancelled}/{week.Count} booking), so với {baseRate:P0} của 4 tuần trước.",
                    "trending_up", now, "overview"));

            var dayStart = now.AddDays(-1);
            var expired = await bookingDb.Bookings.AsNoTracking()
                .Where(b => b.BookingStatus == BookingStatus.Expired && (b.UpdatedAt ?? b.HoldExpiresAt ?? b.CreatedAt) >= dayStart)
                .Select(b => b.BookingId).ToListAsync(ct);
            if (expired.Count > 0)
                items.Add(N($"expired-{today:yyyyMMdd}-{expired.Count}", "BookingsExpired", Info,
                    "Booking hết hạn giữ chỗ", $"{expired.Count} booking hết hạn trong 24 giờ qua do khách không thanh toán kịp.",
                    "timer_off", now, "overview"));
        }

        // ---------- Phòng / kho phòng ----------
        if (Can(SystemPermissions.InventoryView))
        {
            var hotelNames = await hotelDb.Hotels.AsNoTracking().ToDictionaryAsync(h => h.HotelId, h => h.HotelName, ct);
            var since = now.AddDays(-7);
            var locks = await bookingDb.Set<RoomEmergencyLock>().AsNoTracking()
                .Where(l => !l.IsReleased && l.CreatedAt >= since && l.EndsAt > now)
                .ToListAsync(ct);
            var actorIds = locks.Select(l => l.CreatedByUserId).Distinct().ToList();
            var actors = await coreDb.Users.AsNoTracking().Where(u => actorIds.Contains(u.UserId)).ToDictionaryAsync(u => u.UserId, u => u.FullName, ct);
            var lockRoomIds = locks.Select(l => l.RoomId).Distinct().ToList();
            var lockRooms = await bookingDb.Set<InventoryRoom>().AsNoTracking().Where(r => lockRoomIds.Contains(r.RoomId)).ToDictionaryAsync(r => r.RoomId, r => r.RoomNumber, ct);
            foreach (var batch in locks.GroupBy(l => l.BatchId).OrderByDescending(g => g.Max(l => l.CreatedAt)).Take(10))
            {
                var first = batch.First();
                var rooms = string.Join(", ", batch.Select(l => lockRooms.GetValueOrDefault(l.RoomId) ?? $"#{l.RoomId}").Distinct().Take(5));
                items.Add(N($"lock-{first.BatchId}", "EmergencyLock", Info, "Khóa phòng khẩn cấp",
                    $"{actors.GetValueOrDefault(first.CreatedByUserId) ?? $"Nhân viên #{first.CreatedByUserId}"} khóa phòng {rooms} tại {hotelNames.GetValueOrDefault(first.HotelId) ?? $"khách sạn #{first.HotelId}"} đến {first.EndsAt:dd/MM HH:mm}. Lý do: {first.Reason}",
                    "shield_lock", first.CreatedAt, "inventory"));
            }

            // Công suất ≥ 90% trong 7 ngày tới (theo phòng đang hoạt động)
            var rooms7 = await (from r in bookingDb.Set<InventoryRoom>().AsNoTracking()
                                join a in bookingDb.Set<InventoryArea>().AsNoTracking() on r.AreaId equals a.AreaId
                                where r.IsActive
                                select new { r.RoomId, a.HotelId }).ToListAsync(ct);
            var roomHotel = rooms7.ToDictionary(x => x.RoomId, x => x.HotelId);
            var horizon = today.AddDays(7);
            var occupied = await bookingDb.Bookings.AsNoTracking()
                .Where(b => (b.BookingStatus == BookingStatus.Confirmed || b.BookingStatus == BookingStatus.CheckedIn || b.BookingStatus == BookingStatus.Pending)
                    && b.CheckInDate < horizon && b.CheckOutDate > today)
                .SelectMany(b => b.BookingDetails.Select(d => new { d.RoomId, b.CheckInDate, b.CheckOutDate }))
                .ToListAsync(ct);
            foreach (var hotel in rooms7.GroupBy(x => x.HotelId))
            {
                var total = hotel.Count();
                if (total == 0) continue;
                var peak = Enumerable.Range(0, 7).Select(offset =>
                {
                    var day = today.AddDays(offset);
                    var count = occupied.Where(o => roomHotel.GetValueOrDefault(o.RoomId) == hotel.Key && o.CheckInDate <= day && o.CheckOutDate > day)
                        .Select(o => o.RoomId).Distinct().Count();
                    return (day, rate: (decimal)count / total);
                }).MaxBy(x => x.rate);
                if (peak.rate >= 0.9m)
                    items.Add(N($"occupancy-{hotel.Key}-{peak.day:yyyyMMdd}", "HighOccupancy", Info, "Sắp kín phòng",
                        $"{hotelNames.GetValueOrDefault(hotel.Key) ?? $"Khách sạn #{hotel.Key}"} đạt {peak.rate:P0} công suất ngày {peak.day:dd/MM}.",
                        "hotel", now, "inventory"));
            }
        }

        // ---------- Khuyến mãi ----------
        if (Can(SystemPermissions.VoucherView))
        {
            var soon = now.AddDays(7);
            var vouchers = await bookingDb.Vouchers.AsNoTracking()
                .Where(v => v.IsActive && v.EndAt > now && (v.EndAt <= soon || (v.UsageLimit != null && v.UsageLimit > 0 && v.UsedCount * 10 >= v.UsageLimit * 8)))
                .OrderBy(v => v.EndAt).Take(10).ToListAsync(ct);
            items.AddRange(vouchers.Select(v =>
            {
                var nearLimit = v.UsageLimit is > 0 && v.UsedCount * 10 >= v.UsageLimit * 8;
                var desc = nearLimit
                    ? $"Mã {v.Code} đã dùng {v.UsedCount}/{v.UsageLimit} lượt."
                    : $"Mã {v.Code} hết hạn lúc {v.EndAt:dd/MM/yyyy HH:mm}.";
                return N($"voucher-{v.VoucherId}-{(nearLimit ? $"use{v.UsedCount}" : "expiring")}", "VoucherAttention", Info,
                    nearLimit ? "Voucher sắp hết lượt" : "Voucher sắp hết hạn", desc, "confirmation_number", v.UpdatedAt ?? v.CreatedAt, "vouchers");
            }));
        }

        // ---------- Nhân sự / tài khoản ----------
        if (Can(SystemPermissions.StaffView))
        {
            // Nhân viên nội bộ (Hotel Staff hoặc vai trò có quyền nghiệp vụ) — đọc qua context xác thực,
            // vì context nghiệp vụ (coreDb) không ánh xạ RolePermissions.
            var internalCodes = PortalAccess.InternalPermissions.ToArray();
            var staff = await authDb.Users.AsNoTracking()
                .Where(u => u.IsActive && u.UserRoles.Any(r => r.Role.IsActive && (r.Role.RoleName == SystemRoles.HotelStaff
                        || r.Role.RolePermissions.Any(p => p.Permission.IsActive && internalCodes.Contains(p.Permission.PermissionCode))))
                    && !u.UserRoles.Any(r => r.Role.RoleName == SystemRoles.Admin))
                .OrderBy(u => u.UserId).Select(u => new { u.UserId, u.FullName }).ToListAsync(ct);
            var staffIds = staff.Select(u => u.UserId).ToList();
            var assigned = (await coreDb.StaffAreaAssignments.AsNoTracking()
                .Where(a => a.IsActive && staffIds.Contains(a.UserId)).Select(a => a.UserId).Distinct().ToListAsync(ct)).ToHashSet();
            var unassigned = staff.Where(u => !assigned.Contains(u.UserId)).ToList();
            if (unassigned.Count > 0)
                items.Add(N($"staff-unassigned-{string.Join('.', unassigned.Select(u => u.UserId))}", "StaffUnassigned", Action,
                    "Nhân viên chưa được phân công", $"{unassigned.Count} nhân viên chưa có khu vực phụ trách: {string.Join(", ", unassigned.Take(3).Select(u => u.FullName))}{(unassigned.Count > 3 ? "…" : "")}.",
                    "person_alert", now, "staff"));
        }
        if (Can(SystemPermissions.AccountsManage))
        {
            var lockedOut = await coreDb.Users.AsNoTracking()
                .Where(u => u.LockoutEnd != null && u.LockoutEnd > now)
                .Select(u => new { u.UserId, u.FullName, u.LockoutEnd }).ToListAsync(ct);
            items.AddRange(lockedOut.Select(u => N($"lockout-{u.UserId}-{u.LockoutEnd!.Value.Ticks}", "AccountLockedOut", Info,
                "Tài khoản bị khóa tạm thời", $"{u.FullName} bị khóa đăng nhập đến {u.LockoutEnd:dd/MM HH:mm} do nhập sai mật khẩu nhiều lần.",
                "lock_person", u.LockoutEnd!.Value, "accounts")));
        }

        var readKeys = await reads.ReadKeysAsync(ActorId, items.Select(i => i.Id), ct);
        var result = items
            .Select(i => i with { IsRead = readKeys.Contains(i.Id) })
            .OrderBy(i => i.Severity == Action ? 0 : 1)
            .ThenByDescending(i => i.OccurredAt)
            .Take(50)
            .ToList();
        return Ok(new { success = true, data = result });
    }
}
