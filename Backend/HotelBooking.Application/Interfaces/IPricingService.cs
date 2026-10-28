using HotelBooking.Application.DTOs.Pricing;

namespace HotelBooking.Application.Interfaces;

public interface IPricingService
{
    Task<PriceCalculationResultDto> CalculateStayPriceAsync(PriceCalculationRequest request, CancellationToken ct = default);
    Task<IReadOnlyList<RoomPriceHistoryDto>> GetPriceHistoriesAsync(int roomTypeId, CancellationToken ct = default);
    Task<RoomPriceHistoryDto> AddPriceHistoryAsync(int roomTypeId, CreateRoomPriceHistoryRequest request, long changedByUserId, CancellationToken ct = default);

    Task<IReadOnlyList<PriceSurgeRuleDto>> GetSurgeRulesAsync(PriceSurgeRuleFilterRequest filter, CancellationToken ct = default);
    Task<PriceSurgeRuleDto?> GetSurgeRuleByIdAsync(long ruleId, CancellationToken ct = default);
    Task<PriceSurgeRuleDto> CreateSurgeRuleAsync(CreatePriceSurgeRuleRequest request, long createdByUserId, CancellationToken ct = default);
    Task<PriceSurgeRuleDto> UpdateSurgeRuleAsync(long ruleId, UpdatePriceSurgeRuleRequest request, CancellationToken ct = default);
    Task<bool> ToggleSurgeRuleStatusAsync(long ruleId, CancellationToken ct = default);
    Task<bool> DeleteSurgeRuleAsync(long ruleId, CancellationToken ct = default);
}
