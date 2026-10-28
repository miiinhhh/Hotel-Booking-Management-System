namespace HotelBooking.Application.Interfaces;

using HotelBooking.Application.DTOs.Cancellation;
using HotelBooking.Domain.Entities;

public interface ICancellationPolicyService
{
    Task<CancellationPolicyDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<IReadOnlyList<CancellationPolicyDto>> GetByHotelIdAsync(int hotelId, bool activeOnly = false, CancellationToken ct = default);
    Task<CancellationPolicyDto> CreatePolicyAsync(CreateCancellationPolicyRequest request, CancellationToken ct = default);
    Task<CancellationPolicyDto> UpdatePolicyAsync(int id, UpdateCancellationPolicyRequest request, CancellationToken ct = default);
    Task DeletePolicyAsync(int id, CancellationToken ct = default);
    Task<CancellationPolicy?> GetApplicablePolicyAsync(int hotelId, int daysRemaining, CancellationToken ct = default);
    CancelPreviewResponseDto CalculateCancellation(Booking booking, decimal totalPaid, CancellationPolicy? policy);
}
