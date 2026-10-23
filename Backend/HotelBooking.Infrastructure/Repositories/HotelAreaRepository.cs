using HotelBooking.Application.Areas;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public sealed class HotelAreaRepository(HotelBookingDbContext db) : IHotelAreaRepository
{
    public Task<bool> HotelExistsAsync(int hotelId, CancellationToken cancellationToken) =>
        db.Hotels.AnyAsync(hotel => hotel.HotelId == hotelId, cancellationToken);

    public Task<bool> ActiveHotelExistsAsync(int hotelId, CancellationToken cancellationToken) =>
        db.Hotels.AnyAsync(hotel => hotel.HotelId == hotelId && hotel.IsActive, cancellationToken);

    public async Task<IReadOnlyList<HotelArea>> ListAsync(
        int hotelId,
        bool includeInactive,
        CancellationToken cancellationToken)
    {
        var query = AreaGraph(asTracking: false).Where(area => area.HotelId == hotelId);
        if (!includeInactive) query = query.Where(area => area.IsActive);

        return await query
            .OrderBy(area => area.AreaType == "Zone" ? 0 : 1)
            .ThenBy(area => area.AreaName)
            .ToListAsync(cancellationToken);
    }

    public Task<HotelArea?> GetAsync(int areaId, CancellationToken cancellationToken) =>
        AreaGraph(asTracking: true).SingleOrDefaultAsync(area => area.AreaId == areaId, cancellationToken);

    public Task<bool> NameExistsAsync(
        int hotelId,
        string areaName,
        int exceptAreaId,
        CancellationToken cancellationToken) =>
        db.HotelAreas.AnyAsync(
            area => area.HotelId == hotelId && area.AreaName == areaName && area.AreaId != exceptAreaId,
            cancellationToken);

    public Task<bool> HasChildrenAsync(int areaId, CancellationToken cancellationToken) =>
        db.HotelAreas.AnyAsync(area => area.ParentAreaId == areaId, cancellationToken);

    public Task<bool> HasActiveChildrenAsync(int areaId, CancellationToken cancellationToken) =>
        db.HotelAreas.AnyAsync(area => area.ParentAreaId == areaId && area.IsActive, cancellationToken);

    public Task<bool> HasActiveRoomTypesAsync(int areaId, CancellationToken cancellationToken) =>
        db.RoomTypes.AnyAsync(roomType => roomType.AreaId == areaId && roomType.IsActive, cancellationToken);

    public Task<bool> HasActiveRoomsAsync(int areaId, CancellationToken cancellationToken) =>
        db.Rooms.AnyAsync(room => room.AreaId == areaId && room.IsActive, cancellationToken);

    public Task<bool> HasActiveStaffAssignmentsAsync(int areaId, CancellationToken cancellationToken) =>
        db.StaffAreaAssignments.AnyAsync(
            assignment => assignment.AreaId == areaId && assignment.IsActive,
            cancellationToken);

    public void Add(HotelArea area) => db.HotelAreas.Add(area);

    public async Task SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 2601 or 2627 })
        {
            throw new ConflictException("Area name already exists in this hotel.");
        }
    }

    private IQueryable<HotelArea> AreaGraph(bool asTracking)
    {
        IQueryable<HotelArea> query = db.HotelAreas;
        if (!asTracking) query = query.AsNoTracking();

        return query
            .Include(area => area.ParentArea)
            .Include(area => area.SubAreas)
            .Include(area => area.RoomTypes)
            .Include(area => area.Rooms)
            .Include(area => area.StaffAssignments)
            .AsSplitQuery();
    }
}
