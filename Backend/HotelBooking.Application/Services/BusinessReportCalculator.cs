using HotelBooking.Application.DTOs;

namespace HotelBooking.Application.Services;

public static class BusinessReportCalculator
{
    public static BusinessReport Calculate(ReportFilter filter, ReportSource source)
    {
        var rooms = source.Rooms.ToHashSet();
        var days = new List<ReportDay>();
        for (var date = filter.From; date < filter.To; date = date.AddDays(1))
        {
            var start = date.ToDateTime(TimeOnly.MinValue); var end = start.AddDays(1);
            var blocked = source.Locks.Where(x => rooms.Contains(x.RoomId) && x.StartsAt < end && x.EndsAt > start).Select(x => x.RoomId).ToHashSet();
            var occupied = source.Stays.Where(x => rooms.Contains(x.RoomId) && x.CheckIn <= date && x.CheckOut > date && !blocked.Contains(x.RoomId)).Select(x => x.RoomId).Distinct().Count();
            days.Add(new(date, source.Receipts.Where(p => p.PaidAt >= start && p.PaidAt < end).Sum(p => p.SignedAmount),
                source.Bookings.Count(b => b.CreatedAt >= start && b.CreatedAt < end), occupied, rooms.Count - blocked.Count));
        }
        var occupiedTotal = days.Sum(d => d.OccupiedRoomNights); var availableTotal = days.Sum(d => d.AvailableRoomNights);
        var count = days.Sum(d => d.Bookings);
        var cancelled = source.Bookings.Count(b => b.IsCancelled && b.CreatedAt >= filter.From.ToDateTime(TimeOnly.MinValue) && b.CreatedAt < filter.To.ToDateTime(TimeOnly.MinValue));
        return new(filter.From, filter.To, filter.HotelId, days.Sum(d => d.Revenue), count, cancelled,
            count == 0 ? 0 : Math.Round(cancelled * 100m / count, 2), occupiedTotal, availableTotal,
            availableTotal == 0 ? 0 : Math.Round(occupiedTotal * 100m / availableTotal, 2), days);
    }
}
