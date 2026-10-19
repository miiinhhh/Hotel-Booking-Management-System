using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public class VoucherRepository : IVoucherRepository
{
    private readonly HotelBookingDBContext _context;

    public VoucherRepository(HotelBookingDBContext context)
    {
        _context = context;
    }

    public async Task<Voucher?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var normalizedCode = code.Trim().ToUpperInvariant();

        return await _context.Vouchers
            .FirstOrDefaultAsync(v => v.Code.ToUpper() == normalizedCode, ct);
    }

    public async Task<Voucher?> GetByIdAsync(long id, CancellationToken ct = default)
    {
        return await _context.Vouchers.FindAsync([id], ct);
    }

    public async Task IncrementUsedCountAsync(long voucherId, CancellationToken ct = default)
    {
        var voucher = await _context.Vouchers.FindAsync([voucherId], ct);
        if (voucher != null)
        {
            voucher.UsedCount++;
            voucher.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}
