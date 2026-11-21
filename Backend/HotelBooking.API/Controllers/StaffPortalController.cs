using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using PersistenceDbContext = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using BookingDataDbContext = HotelBooking.Infrastructure.Data.HotelBookingDBContext;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/staff/portal")]
[Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
public class StaffPortalController(
    PersistenceDbContext roomDb,
    BookingDataDbContext bookingDb, HotelBooking.Application.Rooms.StaffCalendarService calendar,
    HotelBooking.Infrastructure.Persistence.NotificationReadStore notificationReads) : ControllerBase
{
    private sealed record StaffNotificationDto(
        string Id,
        string Type,
        string Title,
        string Description,
        string Icon,
        DateTime OccurredAt);

    private long ActorId
    {
        get
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return long.TryParse(claim, out var id) ? id : 1;
        }
    }

    private bool IsAdmin => User.IsInRole(SystemRoles.Admin);

    private async Task<HashSet<int>?> GetAllowedAreaIdsAsync(CancellationToken ct)
    {
        if (IsAdmin) return null;

        var assignedIds = await roomDb.StaffAreaAssignments
            .AsNoTracking()
            .Where(x => x.UserId == ActorId && x.IsActive)
            .Select(x => x.AreaId)
            .ToListAsync(ct);

        if (assignedIds.Count == 0) return new HashSet<int>();

        return (await roomDb.HotelAreas
                .AsNoTracking()
                .Where(x => assignedIds.Contains(x.AreaId) ||
                            (x.ParentAreaId.HasValue && assignedIds.Contains(x.ParentAreaId.Value)))
                .Select(x => x.AreaId)
                .ToListAsync(ct))
            .ToHashSet();
    }

    private async Task<HashSet<long>?> GetAllowedRoomIdsAsync(CancellationToken ct)
    {
        var areaIds = await GetAllowedAreaIdsAsync(ct);
        if (areaIds is null) return null;
        if (areaIds.Count == 0) return new HashSet<long>();

        return (await roomDb.Rooms.AsNoTracking()
                .Where(x => areaIds.Contains(x.AreaId))
                .Select(x => x.RoomId)
                .ToListAsync(ct))
            .ToHashSet();
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddDays(-30);
        var allowedAreaIds = await GetAllowedAreaIdsAsync(ct);
        var allowedRoomIds = await GetAllowedRoomIdsAsync(ct);
        if (!IsAdmin && (allowedAreaIds is null || allowedAreaIds.Count == 0))
            return Ok(new { success = true, data = Array.Empty<StaffNotificationDto>() });

        var notifications = new List<StaffNotificationDto>();

        var bookingQuery = bookingDb.Bookings
            .AsNoTracking()
            .Where(booking => booking.CreatedAt >= since);
        if (allowedRoomIds is not null)
            bookingQuery = bookingQuery.Where(booking => booking.BookingDetails.Any(detail => allowedRoomIds.Contains(detail.RoomId)));

        var recentBookings = await bookingQuery
            .OrderByDescending(booking => booking.CreatedAt)
            .Take(20)
            .Select(booking => new
            {
                booking.BookingId,
                booking.BookingCode,
                booking.CustomerId,
                booking.TotalAmount,
                booking.CreatedAt,
                RoomIds = booking.BookingDetails.Select(detail => detail.RoomId).ToList()
            })
            .ToListAsync(ct);
        var customerIds = recentBookings.Select(booking => booking.CustomerId).Distinct().ToList();
        var customerNames = await roomDb.Users.AsNoTracking()
            .Where(user => customerIds.Contains(user.UserId))
            .ToDictionaryAsync(user => user.UserId, user => user.FullName, ct);
        var bookingRoomIds = recentBookings.SelectMany(booking => booking.RoomIds).Distinct().ToList();
        var roomNumbers = await roomDb.Rooms.AsNoTracking()
            .Where(room => bookingRoomIds.Contains(room.RoomId))
            .ToDictionaryAsync(room => room.RoomId, room => room.RoomNumber, ct);

        notifications.AddRange(recentBookings.Select(booking =>
        {
            var rooms = booking.RoomIds
                .Where(roomId => allowedRoomIds is null || allowedRoomIds.Contains(roomId))
                .Select(roomId => roomNumbers.GetValueOrDefault(roomId))
                .Where(number => !string.IsNullOrWhiteSpace(number));
            var customerName = customerNames.GetValueOrDefault(booking.CustomerId) ?? $"Khách hàng #{booking.CustomerId}";
            return new StaffNotificationDto(
                $"booking-{booking.BookingId}",
                "BookingCreated",
                "Booking mới",
                $"{booking.BookingCode} · {customerName} · Phòng {string.Join(", ", rooms)} · {booking.TotalAmount:N0} ₫",
                "event_available",
                booking.CreatedAt);
        }));

        if (!IsAdmin)
        {
            var assignmentEvents = await roomDb.StaffAreaAssignments
                .AsNoTracking()
                .Include(assignment => assignment.Area)
                .Where(assignment => assignment.UserId == ActorId && assignment.IsActive && assignment.AssignedAt >= since)
                .OrderByDescending(assignment => assignment.AssignedAt)
                .Take(20)
                .ToListAsync(ct);
            notifications.AddRange(assignmentEvents.Select(assignment => new StaffNotificationDto(
                $"assignment-{assignment.AssignmentId}-{assignment.AssignedAt.Ticks}",
                "AreaAssignmentChanged",
                "Phân công khu vực thay đổi",
                $"Bạn được phân công {assignment.Area?.AreaName ?? $"khu vực #{assignment.AreaId}"} tại khách sạn #{assignment.Area?.HotelId}.",
                "assignment_ind",
                assignment.AssignedAt)));
        }

        var roomTypeQuery = roomDb.RoomTypes.AsNoTracking();
        if (allowedAreaIds is not null)
            roomTypeQuery = roomTypeQuery.Where(roomType => allowedAreaIds.Contains(roomType.AreaId));
        var roomTypes = await roomTypeQuery
            .Select(roomType => new { roomType.RoomTypeId, roomType.RoomTypeName })
            .ToDictionaryAsync(roomType => roomType.RoomTypeId, roomType => roomType.RoomTypeName, ct);
        var roomTypeIds = roomTypes.Keys.ToList();
        var priceEvents = await bookingDb.RoomPriceHistories
            .AsNoTracking()
            .Where(history => roomTypeIds.Contains(history.RoomTypeId) && history.CreatedAt >= since)
            .OrderByDescending(history => history.CreatedAt)
            .Take(20)
            .ToListAsync(ct);
        notifications.AddRange(priceEvents.Select(history => new StaffNotificationDto(
            $"price-{history.PriceHistoryId}",
            "RoomPriceChanged",
            "Giá phòng thay đổi",
            $"{roomTypes.GetValueOrDefault(history.RoomTypeId) ?? $"Hạng phòng #{history.RoomTypeId}"} · {history.Price:N0} ₫ · Hiệu lực {history.EffectiveFrom:dd/MM/yyyy}",
            "sell",
            history.CreatedAt)));

        var latest = notifications
            .OrderByDescending(notification => notification.OccurredAt)
            .Take(30)
            .ToList();
        // Trạng thái đã đọc lưu ở server theo tài khoản → đồng bộ giữa các thiết bị.
        var readKeys = await notificationReads.ReadKeysAsync(ActorId, latest.Select(n => n.Id), ct);
        return Ok(new
        {
            success = true,
            data = latest.Select(n => new { n.Id, n.Type, n.Title, n.Description, n.Icon, n.OccurredAt, IsRead = readKeys.Contains(n.Id) }).ToList()
        });
    }

    [HttpGet("bookings"), RequirePermission(SystemPermissions.BookingView)]
    public async Task<IActionResult> GetBookings(
        [FromServices] HotelBooking.Application.Interfaces.IPaymentRepository paymentRepo, CancellationToken ct)
    {
        var allowedRoomIds = await GetAllowedRoomIdsAsync(ct);
        if (allowedRoomIds is { Count: 0 })
            return Ok(new { success = true, data = new { bookings = Array.Empty<object>(), metrics = EmptyMetrics() } });

        var query = bookingDb.Bookings
            .AsNoTracking()
            .Include(x => x.BookingDetails)
            .Include(x => x.BookingGuests)
            .AsQueryable();

        if (allowedRoomIds is not null)
            query = query.Where(x => x.BookingDetails.Any(d => allowedRoomIds.Contains(d.RoomId)));

        var bookings = await query
            .OrderByDescending(x => x.CreatedAt)
            .Take(200)
            .ToListAsync(ct);

        var roomIds = bookings.SelectMany(x => x.BookingDetails).Select(x => x.RoomId).Distinct().ToList();
        var rooms = await roomDb.Rooms.AsNoTracking()
            .Include(x => x.RoomType)
            .Include(x => x.Area)
            .Where(x => roomIds.Contains(x.RoomId))
            .ToDictionaryAsync(x => x.RoomId, ct);

        var customerIds = bookings.Select(x => x.CustomerId).Distinct().ToList();
        var customers = await roomDb.Users.AsNoTracking()
            .Where(x => customerIds.Contains(x.UserId))
            .ToDictionaryAsync(x => x.UserId, ct);

        // Số tiền hoàn thật (theo chính sách hủy) cho các đơn đã hủy có hoàn tiền.
        var refundAmounts = new Dictionary<long, decimal>();
        foreach (var b in bookings.Where(x => x.PaymentStatus is "RefundPending" or "Refunded"))
        {
            var refund = (await paymentRepo.GetByBookingIdAsync(b.BookingId))?
                .FirstOrDefault(p => p.PaymentType == HotelBooking.Domain.Enums.PaymentType.Refund);
            if (refund != null) refundAmounts[b.BookingId] = refund.Amount;
        }

        var result = bookings.Select(booking =>
        {
            customers.TryGetValue(booking.CustomerId, out var customer);
            var primaryGuest = booking.BookingGuests.FirstOrDefault(x => x.IsPrimaryGuest)
                ?? booking.BookingGuests.FirstOrDefault();
            var roomInfo = booking.BookingDetails
                .Select(x => rooms.GetValueOrDefault(x.RoomId))
                .Where(x => x is not null)
                .ToList();
            var roomNumbers = roomInfo.Select(x => x!.RoomNumber).Distinct().ToList();
            var roomTypes = roomInfo.Select(x => x!.RoomType.RoomTypeName).Distinct().ToList();
            var areas = roomInfo.Select(x => x!.Area.AreaName).Distinct().ToList();

            return new
            {
                bookingId = booking.BookingId,
                booking.BookingCode,
                booking.CustomerId,
                customerName = customer?.FullName ?? primaryGuest?.FullName ?? $"Khách hàng #{booking.CustomerId}",
                customerPhone = customer?.Phone ?? primaryGuest?.Phone,
                customerEmail = customer?.Email ?? primaryGuest?.Email,
                roomNumbers,
                roomTypes,
                areas,
                booking.CheckInDate,
                booking.CheckOutDate,
                booking.NumberOfGuests,
                bookingStatus = booking.BookingStatus.ToString(),
                booking.PaymentStatus,
                booking.TotalAmount,
                paidAmount = Math.Max(0, booking.TotalAmount - booking.RemainingAmount),
                booking.RemainingAmount,
                booking.DepositAmount,
                refundAmount = refundAmounts.TryGetValue(booking.BookingId, out var ra) ? ra : (decimal?)null,
                booking.SpecialRequests,
                booking.CreatedAt,
                booking.UpdatedAt
            };
        }).ToList();

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var createdToday = bookings.Count(x => DateOnly.FromDateTime(x.CreatedAt) == today);
        var checkIns = bookings.Where(x => x.CheckInDate == today).ToList();
        var checkOuts = bookings.Where(x => x.CheckOutDate == today).ToList();
        var metrics = new
        {
            totalToday = createdToday,
            totalChangePercent = 0,
            pendingDepositCount = bookings.Count(x => x.PaymentStatus is "Unpaid" or "Pending"),
            checkInTodayCount = checkIns.Sum(x => x.BookingDetails.Count),
            checkInCompletedCount = checkIns.Where(x => x.BookingStatus == BookingStatus.CheckedIn).Sum(x => x.BookingDetails.Count),
            checkInRemainingCount = checkIns.Where(x => x.BookingStatus is BookingStatus.Pending or BookingStatus.Confirmed).Sum(x => x.BookingDetails.Count),
            checkOutTodayCount = checkOuts.Sum(x => x.BookingDetails.Count),
            checkOutCompletedCount = checkOuts.Where(x => x.BookingStatus is BookingStatus.CheckedOut or BookingStatus.Completed).Sum(x => x.BookingDetails.Count),
            checkOutPendingKeyCount = checkOuts.Where(x => x.BookingStatus == BookingStatus.CheckedIn).Sum(x => x.BookingDetails.Count)
        };

        return Ok(new { success = true, data = new { bookings = result, metrics } });
    }

    private static object EmptyMetrics() => new
    {
        totalToday = 0,
        totalChangePercent = 0,
        pendingDepositCount = 0,
        checkInTodayCount = 0,
        checkInCompletedCount = 0,
        checkInRemainingCount = 0,
        checkOutTodayCount = 0,
        checkOutCompletedCount = 0,
        checkOutPendingKeyCount = 0
    };

    /// <summary>
    /// Lấy danh sách khách hàng CRM phục vụ cho lễ tân/quản lý
    /// </summary>
    [HttpGet("customers"), RequirePermission(SystemPermissions.BookingView)]
    public async Task<IActionResult> GetCustomers(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var allowedRoomIds = await GetAllowedRoomIdsAsync(ct);
        if (allowedRoomIds is { Count: 0 })
            return Ok(new { success = true, data = Array.Empty<object>() });

        var bookingsQuery = bookingDb.Bookings
            .AsNoTracking()
            .Where(b => b.BookingDetails.Any());
        if (allowedRoomIds is not null)
            bookingsQuery = bookingsQuery.Where(b => b.BookingDetails.Any(d => allowedRoomIds.Contains(d.RoomId)));

        var bookings = await bookingsQuery
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.BookingId,
                b.BookingCode,
                b.CustomerId,
                b.BookingStatus,
                b.CheckInDate,
                b.CheckOutDate,
                b.TotalAmount,
                b.SpecialRequests,
                RoomIds = b.BookingDetails.Select(d => d.RoomId).ToList()
            })
            .ToListAsync(ct);

        var userIds = bookings.Select(x => x.CustomerId).Distinct().ToList();
        var users = await roomDb.Users.AsNoTracking()
            .Where(u => u.IsActive && userIds.Contains(u.UserId))
            .OrderByDescending(u => u.UserId)
            .Select(u => new
            {
                u.UserId,
                u.FullName,
                u.Email,
                u.Phone,
                u.DateOfBirth,
                u.CreatedAt
            })
            .ToListAsync(ct);

        var allRoomIds = bookings.SelectMany(b => b.RoomIds).Distinct().ToList();
        var roomsDict = await roomDb.Rooms
            .Include(r => r.RoomType)
            .Where(r => allRoomIds.Contains(r.RoomId))
            .ToDictionaryAsync(r => r.RoomId, r => new
            {
                r.RoomNumber,
                RoomTypeName = r.RoomType != null ? r.RoomType.RoomTypeName : "Phòng tiêu chuẩn"
            }, ct);

        var result = users.Select(u =>
        {
            var userBookings = bookings.Where(b => b.CustomerId == u.UserId).ToList();
            var completedCount = userBookings.Count(b => b.BookingStatus is BookingStatus.CheckedOut or BookingStatus.Completed);
            var totalSpend = userBookings
                .Where(b => b.BookingStatus is BookingStatus.Confirmed or BookingStatus.CheckedIn or BookingStatus.CheckedOut or BookingStatus.Completed)
                .Sum(b => b.TotalAmount);

            var activeStay = userBookings.FirstOrDefault(b =>
                b.BookingStatus == BookingStatus.CheckedIn ||
                (b.BookingStatus == BookingStatus.Confirmed && b.CheckInDate <= today && b.CheckOutDate >= today));

            var tier = totalSpend >= 50000000m ? "PLATINUM" :
                       totalSpend >= 20000000m ? "GOLD" :
                       totalSpend >= 5000000m ? "SILVER" : "STANDARD";

            var nameParts = (u.FullName ?? "Khách Hàng").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var initials = nameParts.Length >= 2
                ? $"{nameParts[0][0]}{nameParts[^1][0]}".ToUpper()
                : (nameParts.Length == 1 ? nameParts[0][..1].ToUpper() : "KH");

            var recentBookings = userBookings.Take(3).Select(b =>
            {
                var firstRoomId = b.RoomIds.FirstOrDefault();
                roomsDict.TryGetValue(firstRoomId, out var rInfo);

                return new
                {
                    bookingCode = b.BookingCode,
                    roomName = rInfo?.RoomTypeName ?? "Phòng tiêu chuẩn",
                    roomNumber = rInfo?.RoomNumber ?? "P.---",
                    dates = $"{b.CheckInDate:dd/MM} - {b.CheckOutDate:dd/MM/yyyy}",
                    amount = $"{b.TotalAmount:N0} ₫",
                    status = b.BookingStatus.ToString(),
                    isActive = b.BookingStatus is BookingStatus.Confirmed or BookingStatus.CheckedIn
                };
            }).ToList();

            string? currentRoom = null;
            if (activeStay != null && activeStay.RoomIds.Count > 0)
            {
                var roomNumbers = activeStay.RoomIds
                    .Select(id => roomsDict.TryGetValue(id, out var info) ? info.RoomNumber : null)
                    .Where(num => !string.IsNullOrEmpty(num))
                    .ToList();
                currentRoom = roomNumbers.Count > 0 ? string.Join(", ", roomNumbers) : null;
            }

            var lastBooking = userBookings.FirstOrDefault();
            string lastStayInfo = "Chưa có lưu trú";
            if (lastBooking != null)
            {
                roomsDict.TryGetValue(lastBooking.RoomIds.FirstOrDefault(), out var lbInfo);
                lastStayInfo = $"{lastBooking.CheckInDate:dd/MM/yyyy} ({lbInfo?.RoomTypeName ?? "Phòng"})";
            }

            return new
            {
                id = u.UserId.ToString(),
                customerCode = $"KH{u.UserId:D4}",
                name = u.FullName,
                initials,
                tier,
                phone = u.Phone ?? "Chưa cập nhật",
                email = u.Email,
                birthDate = u.DateOfBirth.HasValue ? u.DateOfBirth.Value.ToString("yyyy-MM-dd") : string.Empty,
                isStaying = activeStay != null,
                currentRoom,
                lastStayInfo,
                totalSpend,
                totalSpendFormatted = $"{totalSpend:N0} ₫",
                totalCompletedBookings = completedCount,
                serviceNotesTags = userBookings
                    .Where(b => !string.IsNullOrWhiteSpace(b.SpecialRequests))
                    .Select(b => b.SpecialRequests!)
                    .Distinct()
                    .Take(3)
                    .ToList(),
                recentBookings,
                memberSinceYear = u.CreatedAt.Year.ToString()
            };
        }).ToList();

        return Ok(new { success = true, data = result });
    }

    /// <summary>
    /// Lấy lịch buồng phòng theo ma trận ngày và danh mục phòng (Calendar matrix)
    /// </summary>
    [HttpGet("calendar"), RequirePermission(SystemPermissions.InventoryView)]
    public async Task<IActionResult> GetCalendar([FromQuery] int days = 7, [FromQuery] int? hotelId = null, CancellationToken ct = default)
        => Ok(new { success = true, data = await calendar.Get(ActorId, IsAdmin, days, hotelId, ct) });
}