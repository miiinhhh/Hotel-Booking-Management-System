using System.Linq.Expressions;

namespace HotelBooking.Domain.Entities;

public static class RoomVisibility
{
    // Shared business rule; the repository translates this expression to SQL.
    public static Expression<Func<Room, bool>> AvailableForDisplay => room =>
        room.IsActive && room.Status == RoomStatus.Available &&
        room.RoomType.IsActive && room.RoomType.Hotel.IsActive &&
        room.Area.IsActive && room.RoomType.Area.IsActive &&
        room.AreaId == room.RoomType.AreaId &&
        room.Area.HotelId == room.RoomType.HotelId;
}
