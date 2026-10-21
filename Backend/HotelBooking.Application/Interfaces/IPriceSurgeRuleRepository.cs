using HotelBooking.Application.DTOs.Pricing;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IPriceSurgeRuleRepository
{
    Task<IReadOnlyList<PriceSurgeRule>> GetActiveRulesAsync(
        int hotelId,
        IEnumerable<int> roomTypeIds,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken ct = default);

    Task<IReadOnlyList<PriceSurgeRule>> GetListAsync(PriceSurgeRuleFilterRequest filter, CancellationToken ct = default);
    Task<PriceSurgeRule?> GetByIdAsync(long ruleId, CancellationToken ct = default);
    Task<PriceSurgeRule> AddAsync(PriceSurgeRule rule, CancellationToken ct = default);
    Task<PriceSurgeRule> UpdateAsync(PriceSurgeRule rule, CancellationToken ct = default);
    Task<bool> DeleteAsync(long ruleId, CancellationToken ct = default);
    Task<bool> IsRoomTypeBelongToHotelAsync(int roomTypeId, int hotelId, CancellationToken ct = default);
    Task<string?> GetRoomTypeNameAsync(int roomTypeId, CancellationToken ct = default);
}
