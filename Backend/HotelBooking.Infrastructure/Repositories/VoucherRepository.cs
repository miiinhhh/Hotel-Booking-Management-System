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

    public async Task<Voucher?> GetByIdAsync(long voucherId, CancellationToken ct = default)
    {
        return await _context.Vouchers
            .FirstOrDefaultAsync(v => v.VoucherId == voucherId, ct);
    }

    public async Task<Voucher?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return null;
        }

        var normalizedCode = code.Trim().ToUpperInvariant();

        return await _context.Vouchers
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.Code.ToUpper() == normalizedCode, ct);
    }

    public async Task<(IReadOnlyList<Voucher> Items, int TotalCount)> GetPagedListAsync(
        string? code,
        bool? isActive,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _context.Vouchers.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(code))
        {
            var normalizedCode = code.Trim().ToUpperInvariant();
            query = query.Where(v => v.Code.Contains(normalizedCode));
        }

        if (isActive.HasValue)
        {
            query = query.Where(v => v.IsActive == isActive.Value);
        }

        var totalCount = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(v => v.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<int> GetCustomerUsageCountAsync(long voucherId, long customerId, CancellationToken ct = default)
    {
        return await _context.VoucherUsages
            .CountAsync(u => u.VoucherId == voucherId && u.CustomerId == customerId, ct);
    }

    public async Task AddAsync(Voucher voucher, CancellationToken ct = default)
    {
        await _context.Vouchers.AddAsync(voucher, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateAsync(Voucher voucher, CancellationToken ct = default)
    {
        _context.Vouchers.Update(voucher);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<bool> IncrementUsedCountAtomicAsync(long voucherId, CancellationToken ct = default)
    {
        if (_context.Database.ProviderName?.EndsWith("InMemory", StringComparison.OrdinalIgnoreCase) == true)
        {
            var voucher = await _context.Vouchers.FindAsync([voucherId], ct);
            if (voucher == null || !voucher.IsActive || (voucher.UsageLimit.HasValue && voucher.UsedCount >= voucher.UsageLimit.Value))
            {
                return false;
            }

            voucher.UsedCount++;
            voucher.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(ct);
            return true;
        }

        var affectedRows = await _context.Vouchers
            .Where(v => v.VoucherId == voucherId
                && v.IsActive
                && (!v.UsageLimit.HasValue || v.UsedCount < v.UsageLimit.Value))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(v => v.UsedCount, v => v.UsedCount + 1)
                .SetProperty(v => v.UpdatedAt, DateTime.UtcNow), ct);
        return affectedRows > 0;
    }

    public async Task AddUsageRecordAsync(VoucherUsage usage, CancellationToken ct = default)
    {
        await _context.VoucherUsages.AddAsync(usage, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<bool> CodeExistsAsync(string code, long? excludeVoucherId = null, CancellationToken ct = default)
    {
        var normalizedCode = code.Trim().ToUpperInvariant();
        return await _context.Vouchers
            .AnyAsync(v => v.Code == normalizedCode && (!excludeVoucherId.HasValue || v.VoucherId != excludeVoucherId.Value), ct);
    }

    public async Task IncrementUsedCountAsync(long voucherId, CancellationToken ct = default)
    {
        var voucher = await _context.Vouchers.FindAsync([voucherId], ct);
        if (voucher == null)
        {
            return;
        }

        voucher.UsedCount++;
        voucher.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default) => _context.SaveChangesAsync(ct);
}
