using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IVoucherRepository
{
    Task<Voucher?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<Voucher?> GetByIdAsync(long id, CancellationToken ct = default);
    Task IncrementUsedCountAsync(long voucherId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
