using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using RoomDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Infrastructure.Repositories;

public sealed class StaffCalendarRepository(RoomDb rooms, HotelBookingDBContext bookings) : IStaffCalendarRepository
{
    public async Task<StaffCalendarSource> Load(long actorId, bool isAdmin, int? hotelId, DateOnly from, DateOnly to, CancellationToken ct)
    {
        var query = rooms.RoomTypes.AsNoTracking().Include(t => t.Rooms).Include(t => t.Area)
            .Where(t => t.IsActive && t.Hotel.IsActive && t.Area.IsActive && t.Area.HotelId == t.HotelId);
        if (hotelId.HasValue) query = query.Where(t => t.HotelId == hotelId.Value);
        if (!isAdmin)
            query = query.Where(t => rooms.StaffAreaAssignments.Any(a => a.UserId == actorId && a.IsActive &&
                a.Area != null && a.Area.IsActive && a.Area.HotelId == t.HotelId && (a.AreaId == t.AreaId || a.AreaId == t.Area.ParentAreaId)));
        var types = await query.OrderBy(t => t.HotelId).ThenBy(t => t.AreaId).ThenBy(t => t.RoomTypeId).ToListAsync(ct);
        var sourceTypes = types.Select(t => new CalendarType(t.RoomTypeId, t.HotelId, t.AreaId, t.Area.AreaName,
            t.RoomTypeName, t.Capacity, t.BasePrice, t.Rooms.Where(r => r.IsActive && r.AreaId == t.AreaId)
                .Select(r => new CalendarRoom(r.RoomId, r.Status == RoomStatus.Available)).ToArray())).ToArray();
        var ids = sourceTypes.SelectMany(t => t.Rooms).Select(r => r.RoomId).ToArray();
        if (ids.Length == 0) return new(sourceTypes, [], []);
        var now = DateTime.UtcNow;
        var busy = await bookings.BookingDetails.AsNoTracking().Where(d => ids.Contains(d.RoomId) &&
            d.Booking.CheckInDate < to && d.Booking.CheckOutDate > from &&
            (d.Booking.BookingStatus == BookingStatus.Confirmed || d.Booking.BookingStatus == BookingStatus.CheckedIn ||
             (d.Booking.BookingStatus == BookingStatus.Pending && (d.Booking.HoldExpiresAt == null || d.Booking.HoldExpiresAt > now))))
            .Select(d => new CalendarBooking(d.RoomId, d.Booking.CheckInDate, d.Booking.CheckOutDate)).ToListAsync(ct);
        var start = from.ToDateTime(TimeOnly.MinValue);
        var end = to.ToDateTime(TimeOnly.MinValue);
        var locks = await bookings.Set<RoomEmergencyLock>().AsNoTracking().Where(l => ids.Contains(l.RoomId) &&
            !l.IsReleased && l.StartsAt < end && l.EndsAt > start)
            .Select(l => new CalendarLock(l.RoomId, l.StartsAt, l.EndsAt)).ToListAsync(ct);
        return new(sourceTypes, busy, locks);
    }
}
