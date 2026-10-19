using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IVoucherRepository
{
    Task<Voucher?> GetByIdAsync(long voucherId, CancellationToken ct = default);
    Task<Voucher?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<(IReadOnlyList<Voucher> Items, int TotalCount)> GetPagedListAsync(string? code, bool? isActive, int page, int pageSize, CancellationToken ct = default);
    Task<int> GetCustomerUsageCountAsync(long voucherId, long customerId, CancellationToken ct = default);
    Task AddAsync(Voucher voucher, CancellationToken ct = default);
    Task UpdateAsync(Voucher voucher, CancellationToken ct = default);
    Task<bool> IncrementUsedCountAtomicAsync(long voucherId, CancellationToken ct = default);
    Task AddUsageRecordAsync(VoucherUsage usage, CancellationToken ct = default);
    Task<bool> CodeExistsAsync(string code, long? excludeVoucherId = null, CancellationToken ct = default);
}
