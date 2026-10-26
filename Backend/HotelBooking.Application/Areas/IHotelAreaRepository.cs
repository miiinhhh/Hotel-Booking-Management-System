using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Areas;

public interface IHotelAreaRepository
{
    Task<bool> HotelExistsAsync(int hotelId, CancellationToken cancellationToken);
    Task<bool> ActiveHotelExistsAsync(int hotelId, CancellationToken cancellationToken);
    Task<IReadOnlyList<HotelArea>> ListAsync(int hotelId, bool includeInactive, CancellationToken cancellationToken);
    Task<HotelArea?> GetAsync(int areaId, CancellationToken cancellationToken);
    Task<bool> NameExistsAsync(int hotelId, string areaName, int exceptAreaId, CancellationToken cancellationToken);
    Task<bool> HasChildrenAsync(int areaId, CancellationToken cancellationToken);
    Task<bool> HasActiveChildrenAsync(int areaId, CancellationToken cancellationToken);
    Task<bool> HasActiveRoomTypesAsync(int areaId, CancellationToken cancellationToken);
    Task<bool> HasActiveRoomsAsync(int areaId, CancellationToken cancellationToken);
    Task<bool> HasActiveStaffAssignmentsAsync(int areaId, CancellationToken cancellationToken);
    void Add(HotelArea area);
    Task SaveAsync(CancellationToken cancellationToken);
}
