using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
namespace HotelBooking.Infrastructure.Persistence;

using BookingDbContext = HotelBooking.Infrastructure.Data.HotelBookingDBContext;

public sealed class RoomRepository(HotelBookingDbContext db, BookingDbContext? bookingDb = null) : IRoomRepository
{
    public Task<bool> HotelExistsAsync(int hotelId, CancellationToken ct) => db.Hotels.AnyAsync(x => x.HotelId == hotelId, ct);
    public Task<bool> IsActiveHotelAsync(int id, CancellationToken ct) => db.Hotels.AnyAsync(x => x.HotelId == id && x.IsActive, ct);
    public Task<HotelArea?> FindAreaAsync(int id, CancellationToken ct) => db.HotelAreas.SingleOrDefaultAsync(x => x.AreaId == id, ct);
    public Task<RoomType?> FindTypeAsync(int id, CancellationToken ct) => db.RoomTypes.SingleOrDefaultAsync(x => x.RoomTypeId == id, ct);
    public Task<Room?> FindRoomAsync(long id, CancellationToken ct) => db.Rooms.Include(x => x.RoomType).SingleOrDefaultAsync(x => x.RoomId == id, ct);
    public async Task<IReadOnlyList<RoomType>> ListTypesAsync(int hotelId, CancellationToken ct) => await db.RoomTypes.AsNoTracking().Where(x => x.HotelId == hotelId).OrderBy(x => x.RoomTypeId).ToListAsync(ct);
    public async Task<IReadOnlyList<Room>> ListRoomsAsync(int hotelId, CancellationToken ct) => await db.Rooms.AsNoTracking().Include(x => x.RoomType).Where(x => x.RoomType.HotelId == hotelId).OrderBy(x => x.RoomNumber).ToListAsync(ct);
    public Task<bool> TypeNameExistsAsync(int hotelId, int areaId, string name, int exceptId, CancellationToken ct) => db.RoomTypes.AnyAsync(x => x.HotelId == hotelId && x.AreaId == areaId && x.RoomTypeName == name && x.RoomTypeId != exceptId, ct);
    public Task<bool> RoomNumberExistsAsync(int areaId, string number, long exceptId, CancellationToken ct) => db.Rooms.AnyAsync(x => x.AreaId == areaId && x.RoomNumber == number && x.RoomId != exceptId, ct);
    public Task<bool> HasActiveRoomsAsync(int typeId, CancellationToken ct) => db.Rooms.AnyAsync(x => x.RoomTypeId == typeId && x.IsActive, ct);
    public Task<string?> FindBlockingBookingCodeAsync(long roomId, DateOnly today, CancellationToken ct) =>
        bookingDb is null
            ? Task.FromResult<string?>(null)
            : bookingDb.BookingDetails.AsNoTracking()
            .Where(detail => detail.RoomId == roomId
                && detail.Booking.CheckOutDate > today
                && detail.Booking.BookingStatus != BookingStatus.Cancelled
                && detail.Booking.BookingStatus != BookingStatus.Completed
                && detail.Booking.BookingStatus != BookingStatus.Expired)
            .OrderBy(detail => detail.Booking.CheckInDate)
            .Select(detail => detail.Booking.BookingCode)
            .FirstOrDefaultAsync(ct);
    public Task<bool> HasActiveEmergencyLockAsync(long roomId, DateTime utcNow, CancellationToken ct) =>
        bookingDb is null
            ? Task.FromResult(false)
            : bookingDb.Set<RoomEmergencyLock>().AsNoTracking()
                .AnyAsync(roomLock => roomLock.RoomId == roomId && !roomLock.IsReleased && roomLock.EndsAt > utcNow, ct);
    public void Add(RoomType type) => db.RoomTypes.Add(type);
    public void Add(Room room) => db.Rooms.Add(room);
    public async Task SaveAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        { throw new ConflictException("Số phòng hoặc tên hạng phòng đã tồn tại trong phân khu này."); }
    }
}
