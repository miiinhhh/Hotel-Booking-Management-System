namespace HotelBooking.Application.Rooms;

public sealed record CalendarRoom(long RoomId, bool Sellable);
public sealed record CalendarType(int RoomTypeId, int HotelId, int AreaId, string AreaName,
    string Name, int Capacity, decimal BasePrice, IReadOnlyList<CalendarRoom> Rooms);
public sealed record CalendarBooking(long RoomId, DateOnly CheckIn, DateOnly CheckOut);
public sealed record CalendarLock(long RoomId, DateTime StartsAt, DateTime EndsAt);
public sealed record StaffCalendarSource(IReadOnlyList<CalendarType> Types,
    IReadOnlyList<CalendarBooking> Bookings, IReadOnlyList<CalendarLock> Locks);
public interface IStaffCalendarRepository
{
    Task<StaffCalendarSource> Load(long actorId, bool isAdmin, int? hotelId, DateOnly from, DateOnly to, CancellationToken ct);
}
public sealed record CalendarDay(string Date, string DayOfWeek, string DateFormatted, string DayTag, bool IsToday,
    int OccupancyPercent, int AvailableCount, int TotalCount, int LockedCount, string Status, string StatusNote, bool IsEmergencyLocked);
public sealed record StaffCalendarType(string Id, int HotelId, int AreaId, int RoomTypeId, long[] RoomIds,
    string Building, string CategoryGroup, string Name, int TotalRooms, string RoomSpecs, IReadOnlyList<CalendarDay> Days);

public sealed class StaffCalendarService(IStaffCalendarRepository repository)
{
    public async Task<IReadOnlyList<StaffCalendarType>> Get(long actorId, bool isAdmin, int days, int? hotelId, CancellationToken ct)
    {
        if (days is not (7 or 14 or 30)) days = 7;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var source = await repository.Load(actorId, isAdmin, hotelId, today, today.AddDays(days), ct);
        return Calculate(source, today, days);
    }

    public static IReadOnlyList<StaffCalendarType> Calculate(StaffCalendarSource source, DateOnly today, int days)
        => source.Types.Select(type =>
        {
            var ids = type.Rooms.Select(r => r.RoomId).ToHashSet();
            var unavailable = type.Rooms.Where(r => !r.Sellable).Select(r => r.RoomId).ToHashSet();
            var bookings = source.Bookings.Where(b => ids.Contains(b.RoomId)).ToArray();
            var locks = source.Locks.Where(l => ids.Contains(l.RoomId)).ToArray();
            var result = new List<CalendarDay>();
            for (var offset = 0; offset < days; offset++)
            {
                var day = today.AddDays(offset);
                var start = day.ToDateTime(TimeOnly.MinValue);
                var end = day.AddDays(1).ToDateTime(TimeOnly.MinValue);
                var locked = locks.Where(l => l.StartsAt < end && l.EndsAt > start).Select(l => l.RoomId).ToHashSet();
                var busy = bookings.Where(b => b.CheckIn <= day && b.CheckOut > day).Select(b => b.RoomId)
                    .Concat(locked).Concat(unavailable).ToHashSet();
                var available = ids.Count - busy.Count;
                var percent = ids.Count == 0 ? 0 : (int)Math.Round(busy.Count * 100d / ids.Count);
                var status = locked.Count > 0 ? "locked" : available == 0 ? "full" : percent >= 70 ? "low" : "available";
                var weekday = day.DayOfWeek == System.DayOfWeek.Sunday ? "CN" : $"T{(int)day.DayOfWeek + 1}";
                var tag = offset == 0 ? "Hôm nay" : day.DayOfWeek is System.DayOfWeek.Saturday or System.DayOfWeek.Sunday ? "Cuối tuần" : "Trong tuần";
                result.Add(new(day.ToString("yyyy-MM-dd"), weekday, day.ToString("dd/MM"), tag, offset == 0,
                    percent, available, ids.Count, locked.Count, status,
                    locked.Count > 0 ? "Có phòng khóa sự cố" : available == 0 ? "Hết phòng" : $"{available} phòng trống", locked.Count > 0));
            }
            return new StaffCalendarType(type.RoomTypeId.ToString(), type.HotelId, type.AreaId, type.RoomTypeId,
                type.Rooms.Where(r => r.Sellable).Select(r => r.RoomId).Order().ToArray(), type.AreaName,
                $"Phân khu {type.AreaName} · {type.Name}", type.Name, ids.Count,
                $"{type.Capacity} khách • Giá cơ bản: {type.BasePrice:N0} ₫", result);
        }).ToArray();
}
