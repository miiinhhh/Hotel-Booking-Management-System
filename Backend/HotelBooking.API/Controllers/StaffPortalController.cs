using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Authentication;
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
    BookingDataDbContext bookingDb) : ControllerBase
{
    private long ActorId
    {
        get
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return long.TryParse(claim, out var id) ? id : 1;
        }
    }

    /// <summary>
    /// Lấy danh sách khách hàng CRM phục vụ cho lễ tân/quản lý
    /// </summary>
    [HttpGet("customers")]
    public async Task<IActionResult> GetCustomers(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var users = await roomDb.Users
            .Where(u => u.IsActive)
            .OrderByDescending(u => u.UserId)
            .Take(50)
            .Select(u => new
            {
                u.UserId,
                u.FullName,
                u.Email,
                u.Phone,
                u.CreatedAt
            })
            .ToListAsync(ct);

        var userIds = users.Select(u => u.UserId).ToList();

        var bookings = await bookingDb.Bookings
            .Where(b => userIds.Contains(b.CustomerId))
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
                country = "Việt Nam",
                phone = u.Phone ?? "Chưa cập nhật",
                email = u.Email,
                identityCard = "07909" + u.UserId.ToString("D7"),
                birthDate = "1995-01-01",
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
                preferences = new[]
                {
                    new { icon = "Sparkles", text = "Khách hàng thân thiết", colorClass = "text-amber-600 bg-amber-50" }
                },
                recentBookings,
                memberSinceYear = u.CreatedAt.Year.ToString()
            };
        }).ToList();

        return Ok(new { success = true, data = result });
    }

    /// <summary>
    /// Lấy lịch buồng phòng theo ma trận ngày và danh mục phòng (Calendar matrix)
    /// </summary>
    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar([FromQuery] int days = 7, [FromQuery] int? hotelId = null, CancellationToken ct = default)
    {
        if (days is not (7 or 14 or 30)) days = 7;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var endDate = today.AddDays(days);

        // Lấy danh sách RoomTypes và Rooms
        var query = roomDb.RoomTypes
            .Include(rt => rt.Area)
            .Include(rt => rt.Rooms)
            .Where(rt => rt.IsActive);

        if (hotelId.HasValue)
        {
            query = query.Where(rt => rt.HotelId == hotelId.Value);
        }

        var roomTypes = await query.ToListAsync(ct);
        if (roomTypes.Count == 0)
        {
            return Ok(new { success = true, data = Array.Empty<object>() });
        }

        var startDt = today.ToDateTime(TimeOnly.MinValue);
        var endDt = endDate.ToDateTime(TimeOnly.MinValue);

        // Lấy các bookings trong khoảng thời gian này từ bookingDb
        var activeBookings = await bookingDb.BookingDetails
            .Include(bd => bd.Booking)
            .Where(bd => bd.Booking.CheckInDate < endDate && bd.Booking.CheckOutDate > today &&
                         (bd.Booking.BookingStatus == BookingStatus.Confirmed ||
                          bd.Booking.BookingStatus == BookingStatus.CheckedIn ||
                          (bd.Booking.BookingStatus == BookingStatus.Pending && (bd.Booking.HoldExpiresAt == null || bd.Booking.HoldExpiresAt > DateTime.UtcNow))))
            .Select(bd => new
            {
                bd.RoomId,
                bd.Booking.CheckInDate,
                bd.Booking.CheckOutDate,
                bd.Booking.BookingStatus
            })
            .ToListAsync(ct);

        // Lấy các khóa khẩn cấp từ bookingDb (Set<RoomEmergencyLock>)
        var activeLocks = await bookingDb.Set<RoomEmergencyLock>()
            .Where(l => !l.IsReleased && l.StartsAt < endDt && l.EndsAt > startDt)
            .ToListAsync(ct);

        var schedules = roomTypes.Select(rt =>
        {
            var areaName = rt.Area?.AreaName ?? "Tòa A";
            var buildingName = areaName.Contains("Tòa B") ? "Tòa B" : "Tòa A";
            var totalRooms = rt.Rooms.Count(r => r.IsActive);
            var roomIds = rt.Rooms.Where(r => r.IsActive).Select(r => r.RoomId).ToHashSet();

            var dayList = new List<object>();
            for (int i = 0; i < days; i++)
            {
                var curDay = today.AddDays(i);
                var curDt = curDay.ToDateTime(TimeOnly.MinValue);
                var nextDt = curDay.AddDays(1).ToDateTime(TimeOnly.MinValue);

                var occupiedRoomsCount = activeBookings
                    .Where(b => roomIds.Contains(b.RoomId) && b.CheckInDate <= curDay && b.CheckOutDate > curDay)
                    .Select(b => b.RoomId)
                    .Distinct()
                    .Count();

                var lockedRoomsCount = activeLocks
                    .Where(l => roomIds.Contains(l.RoomId) && l.StartsAt < nextDt && l.EndsAt > curDt)
                    .Select(l => l.RoomId)
                    .Distinct()
                    .Count();

                var totalBusy = Math.Min(totalRooms, occupiedRoomsCount + lockedRoomsCount);
                var availableCount = Math.Max(0, totalRooms - totalBusy);
                var occupancyPercent = totalRooms > 0 ? (int)Math.Round((double)totalBusy * 100 / totalRooms) : 0;

                string status = "available";
                if (lockedRoomsCount > 0) status = "locked";
                else if (availableCount == 0) status = "full";
                else if (occupancyPercent >= 70) status = "low";

                var dayOfWeekName = curDay.DayOfWeek switch
                {
                    DayOfWeek.Sunday => "CN",
                    DayOfWeek.Monday => "T2",
                    DayOfWeek.Tuesday => "T3",
                    DayOfWeek.Wednesday => "T4",
                    DayOfWeek.Thursday => "T5",
                    DayOfWeek.Friday => "T6",
                    DayOfWeek.Saturday => "T7",
                    _ => ""
                };

                var dayTag = i == 0 ? "Hôm nay" :
                             curDay.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday ? "Cuối tuần" :
                             curDay.DayOfWeek == DayOfWeek.Monday ? "Đầu tuần" : "Trong tuần";

                dayList.Add(new
                {
                    date = curDay.ToString("yyyy-MM-dd"),
                    dayOfWeek = dayOfWeekName,
                    dateFormatted = $"{curDay.Day:D2}/{curDay.Month:D2}",
                    dayTag,
                    isToday = i == 0,
                    occupancyPercent,
                    availableCount,
                    totalCount = totalRooms,
                    status,
                    statusNote = status == "locked" ? "Có phòng khóa sự cố" : (status == "full" ? "Hết phòng" : $"{availableCount} phòng trống"),
                    isEmergencyLocked = lockedRoomsCount > 0
                });
            }

            return new
            {
                id = rt.RoomTypeId.ToString(),
                building = buildingName,
                categoryGroup = $"Phân khu {areaName} · {rt.RoomTypeName}",
                name = rt.RoomTypeName,
                totalRooms,
                roomSpecs = $"{rt.Capacity} khách • Giá cơ bản: {rt.BasePrice:N0} ₫",
                days = dayList
            };
        }).ToList();

        return Ok(new { success = true, data = schedules });
    }
}
