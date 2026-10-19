using HotelBooking.Application.DTOs.Pricing;

namespace HotelBooking.Application.Interfaces;

public interface IPricingService
{
    Task<PriceCalculationResultDto> CalculateStayPriceAsync(PriceCalculationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<RoomPriceHistoryDto>> GetPriceHistoriesAsync(int roomTypeId, CancellationToken ct = default);
    Task<RoomPriceHistoryDto> AddPriceHistoryAsync(int roomTypeId, CreateRoomPriceHistoryRequest request, long changedByUserId, CancellationToken ct = default);
}
