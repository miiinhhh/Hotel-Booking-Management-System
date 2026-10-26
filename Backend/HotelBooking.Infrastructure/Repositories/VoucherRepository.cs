using System.Data;
using Dapper;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public class VoucherRepository : IVoucherRepository
{
    private readonly HotelBookingDBContext _context;
    private readonly IDbConnection? _connection;

    public VoucherRepository(HotelBookingDBContext context) : this(context, null)
    {
    }

    public VoucherRepository(HotelBookingDBContext context, IDbConnection? connection)
    {
        _context = context;
        _connection = connection;
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
        if (_connection != null && _context.Database.IsSqlServer())
        {
            const string sql = """
                UPDATE Vouchers
                SET UsedCount = UsedCount + 1,
                    UpdatedAt = SYSDATETIME()
                WHERE VoucherId = @VoucherId
                  AND IsActive = 1
                  AND (UsageLimit IS NULL OR UsedCount < UsageLimit);
                """;

            if (_connection.State != ConnectionState.Open)
            {
                _connection.Open();
            }

            var affectedRows = await _connection.ExecuteAsync(
                new CommandDefinition(sql, new { VoucherId = voucherId }, cancellationToken: ct));

            return affectedRows > 0;
        }

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

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}
