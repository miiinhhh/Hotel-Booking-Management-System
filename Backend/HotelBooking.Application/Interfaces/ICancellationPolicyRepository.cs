namespace HotelBooking.Application.Interfaces;

using HotelBooking.Domain.Entities;

public interface ICancellationPolicyRepository
{
    Task<CancellationPolicy?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<CancellationPolicy>> GetByHotelIdAsync(int hotelId, bool activeOnly = true, CancellationToken ct = default);
    Task<CancellationPolicy> AddAsync(CancellationPolicy policy, CancellationToken ct = default);
    Task UpdateAsync(CancellationPolicy policy, CancellationToken ct = default);
    Task DeleteAsync(CancellationPolicy policy, CancellationToken ct = default);
    Task<bool> HasConflictAsync(int hotelId, int daysBeforeCheckIn, int? excludeId = null, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
