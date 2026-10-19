using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Persistence;

public sealed class RoomSearchRepository(HotelBookingDbContext db) : IRoomSearchRepository
{
    public async Task<(IReadOnlyList<RoomSearchItem> Items, int TotalCount)> SearchAsync(
        RoomSearchCriteria criteria, CancellationToken ct)
    {
        var query = db.Rooms.AsNoTracking()
            .Where(RoomVisibility.AvailableForDisplay)
            .Where(room => room.RoomType.HotelId == criteria.HotelId);

        if (criteria.RoomTypeName is { } name)
        {
            var normalizedName = name.ToUpperInvariant();
            query = query.Where(room => room.RoomType.RoomTypeName.ToUpper().Contains(normalizedName));
        }
        if (criteria.MinPrice is { } minPrice)
            query = query.Where(room => room.RoomType.BasePrice >= minPrice);
        if (criteria.MaxPrice is { } maxPrice)
            query = query.Where(room => room.RoomType.BasePrice <= maxPrice);

        var totalCount = await query.CountAsync(ct);
        var items = await query.OrderBy(room => room.RoomNumber).ThenBy(room => room.RoomId)
            .Skip(criteria.Offset).Take(criteria.PageSize)
            .Select(room => new RoomSearchItem(room.RoomId, room.RoomType.HotelId, room.AreaId,
                room.RoomTypeId, room.RoomType.RoomTypeName, room.RoomNumber, room.Floor,
                room.Description, room.RoomType.BasePrice, room.RoomType.Capacity))
            .ToListAsync(ct);
        return (items, totalCount);
    }
}
