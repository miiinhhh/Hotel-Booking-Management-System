using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Voucher;

namespace HotelBooking.Application.Interfaces;

public interface IVoucherService
{
    Task<ValidateVoucherResponse> ValidateVoucherAsync(ValidateVoucherRequest request, long? customerId = null, CancellationToken ct = default);
    Task<VoucherResponseDto> GetByIdAsync(long voucherId, CancellationToken ct = default);
    Task<PagedResult<VoucherResponseDto>> GetListAsync(VoucherFilterRequest filter, CancellationToken ct = default);
    Task<VoucherResponseDto> CreateAsync(CreateVoucherRequest request, CancellationToken ct = default);
    Task<VoucherResponseDto> UpdateAsync(long voucherId, UpdateVoucherRequest request, CancellationToken ct = default);
    Task<bool> ToggleStatusAsync(long voucherId, CancellationToken ct = default);
    Task<bool> DeleteAsync(long voucherId, CancellationToken ct = default);
    Task<(bool Success, decimal DiscountAmount, long? VoucherId, string? ErrorMessage)> RecordVoucherUsageAsync(
        string code,
        long customerId,
        long bookingId,
        decimal subTotal,
        CancellationToken ct = default);
}
