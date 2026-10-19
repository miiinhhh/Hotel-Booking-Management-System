using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IRoomPriceHistoryRepository
{
    Task<IReadOnlyList<RoomPriceHistory>> GetHistoriesByRoomTypeAsync(int roomTypeId, CancellationToken ct = default);
    Task<RoomPriceHistory> AddHistoryAsync(RoomPriceHistory history, CancellationToken ct = default);
    Task<Dictionary<long, (int RoomTypeId, int HotelId, decimal BasePrice)>> GetRoomDetailsForPricingAsync(IEnumerable<long> roomIds, CancellationToken ct = default);
    Task<(TimeOnly CheckInTime, TimeOnly CheckOutTime)?> GetHotelCheckInOutPolicyAsync(int hotelId, CancellationToken ct = default);
}
