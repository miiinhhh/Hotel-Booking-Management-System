using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
namespace HotelBooking.Infrastructure.Repositories;

public sealed class RoomInventoryRepository(HotelBookingDBContext db) : IRoomInventoryRepository
{
    private IQueryable<AvailableRoom> Stock(bool activeOnly = true) =>
        from room in db.Set<InventoryRoom>().AsNoTracking()
        join type in db.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
        join hotel in db.Set<InventoryHotel>() on type.HotelId equals hotel.HotelId
        join area in db.Set<InventoryArea>() on room.AreaId equals area.AreaId
        where room.AreaId == type.AreaId && area.HotelId == hotel.HotelId
        where !activeOnly || (room.IsActive && room.Status == "Available" && type.IsActive && hotel.IsActive && area.IsActive)
        select new AvailableRoom { RoomId = room.RoomId, HotelId = hotel.HotelId, AreaId = area.AreaId, RoomTypeId = type.RoomTypeId,
            RoomTypeName = type.RoomTypeName, RoomNumber = room.RoomNumber, Floor = room.Floor, Price = type.BasePrice, Capacity = type.Capacity };

    private IQueryable<long> Busy(DateTime start, DateTime end, long? excludeBookingId = null)
    {
        var now = DateTime.UtcNow;
        var checkIn = DateOnly.FromDateTime(start);
        var checkOut = DateOnly.FromDateTime(end);
        if (end.TimeOfDay != TimeSpan.Zero) checkOut = checkOut.AddDays(1);
        var bookings = db.BookingDetails.Where(d => (!excludeBookingId.HasValue || d.BookingId != excludeBookingId.Value) && d.Booking.CheckInDate < checkOut && d.Booking.CheckOutDate > checkIn &&
            (d.Booking.BookingStatus == BookingStatus.Confirmed || d.Booking.BookingStatus == BookingStatus.CheckedIn ||
             (d.Booking.BookingStatus == BookingStatus.Pending && (d.Booking.HoldExpiresAt == null || d.Booking.HoldExpiresAt > now))))
            .Select(d => d.RoomId);
        var locks = db.Set<RoomEmergencyLock>().Where(x => !x.IsReleased && x.StartsAt < end && x.EndsAt > start).Select(x => x.RoomId);
        return bookings.Union(locks);
    }
    private async Task Hotel(int hotelId, CancellationToken ct)
    {
        if (!await db.Set<InventoryHotel>().AnyAsync(x => x.HotelId == hotelId && x.IsActive, ct)) throw new NotFoundException("Active hotel not found.");
    }
    public async Task<IReadOnlyList<AvailableRoom>> Available(int hotelId, DateOnly checkIn, DateOnly checkOut, CancellationToken ct)
    {
        await Hotel(hotelId, ct);
        return await AvailabilityQuery(hotelId, checkIn, checkOut).OrderBy(r => r.RoomId).ToListAsync(ct);
    }
    internal IQueryable<AvailableRoom> AvailabilityQuery(int hotelId, DateOnly checkIn, DateOnly checkOut)
        => AllAvailabilityQuery(checkIn, checkOut).Where(r => r.HotelId == hotelId);

    internal IQueryable<AvailableRoom> AllAvailabilityQuery(DateOnly checkIn, DateOnly checkOut)
    {
        var busy = Busy(checkIn.ToDateTime(TimeOnly.MinValue), checkOut.ToDateTime(TimeOnly.MinValue));
        return Stock().Where(r => !busy.Contains(r.RoomId));
    }
    private IQueryable<long> AllowedRooms(int hotelId, long actorId, bool isAdmin) =>
        from r in Stock(false)
        join a in db.Set<InventoryArea>() on r.AreaId equals a.AreaId
        where r.HotelId == hotelId && (isAdmin || db.Set<InventoryAssignment>().Any(s =>
            s.UserId == actorId && s.IsActive && (s.AreaId == a.AreaId || s.AreaId == a.ParentAreaId) &&
            db.Set<InventoryArea>().Any(assigned => assigned.AreaId == s.AreaId && assigned.IsActive && assigned.HotelId == hotelId)))
        select r.RoomId;

    // Booking and lock writes acquire identical transaction-owned SQL locks.
    // Ordered IDs avoid deadlocks on multi-room requests.
    public async Task<IDbContextTransaction?> Gate(IEnumerable<long> roomIds, CancellationToken ct)
    {
        if (!db.Database.IsRelational()) return null; // InMemory tests do not claim SQL concurrency coverage.
        var tx = await db.Database.BeginTransactionAsync(ct);
        try
        {
            foreach (var id in roomIds.Distinct().Order())
            {
                var resource = $"HotelBooking:Room:{id}";
                await db.Database.ExecuteSqlInterpolatedAsync($"DECLARE @result int; EXEC @result = sys.sp_getapplock @Resource={resource}, @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @result < 0 THROW 51000, 'Could not acquire room inventory lock.', 1;", ct);
            }
            return tx;
        }
        catch { await tx.DisposeAsync(); throw; }
    }
    public async Task<bool> Reserve(Booking booking, CancellationToken ct = default, bool updating = false)
    {
        var ids = booking.BookingDetails.Select(d => d.RoomId).ToArray();
        if (ids.Length == 0 || ids.Distinct().Count() != ids.Length) return false;
        await using var tx = await Gate(ids, ct);
        var busy = Busy(booking.CheckInDate.ToDateTime(TimeOnly.MinValue), booking.CheckOutDate.ToDateTime(TimeOnly.MinValue), updating ? booking.BookingId : null);
        var candidates = await Stock().Where(x => ids.Contains(x.RoomId) && !busy.Contains(x.RoomId)).ToListAsync(ct);
        if (candidates.Count != ids.Length || booking.NumberOfGuests <= 0 || candidates.Sum(x => x.Capacity) < booking.NumberOfGuests || candidates.Select(x => x.HotelId).Distinct().Count() != 1) return false;
        if (!updating) db.Bookings.Add(booking);
        await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return true;
    }
    public async Task<IReadOnlyList<RoomLockDto>> CreateLocks(int hotelId, CreateRoomLockRequest request, long actorId, bool isAdmin, CancellationToken ct)
    {
        await Hotel(hotelId, ct);
        await using var tx = await Gate(request.RoomIds, ct);
        if (await Stock(false).CountAsync(x => x.HotelId == hotelId && request.RoomIds.Contains(x.RoomId), ct) != request.RoomIds.Length)
            throw new NotFoundException("A room does not belong to this hotel.");
        if (await AllowedRooms(hotelId, actorId, isAdmin).CountAsync(id => request.RoomIds.Contains(id), ct) != request.RoomIds.Length) throw new InventoryAccessException();
        var busy = Busy(request.StartsAt.UtcDateTime, request.EndsAt.UtcDateTime);
        if (await Stock().CountAsync(x => x.HotelId == hotelId && request.RoomIds.Contains(x.RoomId) && !busy.Contains(x.RoomId), ct) != request.RoomIds.Length)
            throw new ConflictException("A room is unavailable, booked or already locked. No rooms were locked.");
        var batch = Guid.NewGuid();
        var locks = request.RoomIds.Select(id => new RoomEmergencyLock(batch, hotelId, id, request.StartsAt, request.EndsAt, request.Reason, actorId)).ToArray();
        db.AddRange(locks); await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return locks.Select(Map).ToArray();
    }
    public async Task<IReadOnlyList<RoomLockDto>> ListLocks(int hotelId, long actorId, bool isAdmin, CancellationToken ct)
    {
        await Hotel(hotelId, ct);
        var allowed = AllowedRooms(hotelId, actorId, isAdmin);
        var items = await db.Set<RoomEmergencyLock>().AsNoTracking().Where(x => x.HotelId == hotelId && allowed.Contains(x.RoomId)).OrderByDescending(x => x.LockId).ToListAsync(ct);
        return items.Select(Map).ToArray();
    }
    public async Task<RoomLockDto> Release(int hotelId, long lockId, long actorId, bool isAdmin, CancellationToken ct)
    {
        var roomId = await db.Set<RoomEmergencyLock>().Where(x => x.LockId == lockId && x.HotelId == hotelId).Select(x => (long?)x.RoomId).SingleOrDefaultAsync(ct)
            ?? throw new NotFoundException("Room lock not found in this hotel.");
        await using var tx = await Gate([roomId], ct);
        if (!await AllowedRooms(hotelId, actorId, isAdmin).ContainsAsync(roomId, ct)) throw new InventoryAccessException();
        var item = await db.Set<RoomEmergencyLock>().SingleAsync(x => x.LockId == lockId, ct);
        item.Release(actorId); await db.SaveChangesAsync(ct);
        if (tx is not null) await tx.CommitAsync(ct);
        return Map(item);
    }
    private static RoomLockDto Map(RoomEmergencyLock x) => new(x.LockId, x.BatchId, x.HotelId, x.RoomId, x.StartsAt, x.EndsAt,
        x.Reason, x.CreatedByUserId, x.CreatedAt, x.IsReleased ? "Released" : x.EndsAt <= DateTime.UtcNow ? "Expired" : x.StartsAt > DateTime.UtcNow ? "Scheduled" : "Active", x.ReleasedAt, x.ReleasedByUserId);
}
