namespace HotelBooking.Infrastructure.Repositories;

using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

public class CancellationPolicyRepository : ICancellationPolicyRepository
{
    private readonly HotelBookingDBContext _context;

    public CancellationPolicyRepository(HotelBookingDBContext context)
    {
        _context = context;
    }

    public async Task<CancellationPolicy?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        return await _context.CancellationPolicies
            .FirstOrDefaultAsync(p => p.CancellationPolicyId == id, ct);
    }

    public async Task<IReadOnlyList<CancellationPolicy>> GetByHotelIdAsync(int hotelId, bool activeOnly = true, CancellationToken ct = default)
    {
        var query = _context.CancellationPolicies
            .Where(p => p.HotelId == hotelId);

        if (activeOnly)
        {
            query = query.Where(p => p.IsActive);
        }

        return await query
            .OrderByDescending(p => p.DaysBeforeCheckIn)
            .ToListAsync(ct);
    }

    public async Task<CancellationPolicy> AddAsync(CancellationPolicy policy, CancellationToken ct = default)
    {
        await _context.CancellationPolicies.AddAsync(policy, ct);
        return policy;
    }

    public Task UpdateAsync(CancellationPolicy policy, CancellationToken ct = default)
    {
        _context.CancellationPolicies.Update(policy);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(CancellationPolicy policy, CancellationToken ct = default)
    {
        _context.CancellationPolicies.Remove(policy);
        return Task.CompletedTask;
    }

    public async Task<bool> HasConflictAsync(int hotelId, int daysBeforeCheckIn, int? excludeId = null, CancellationToken ct = default)
    {
        var query = _context.CancellationPolicies
            .Where(p => p.HotelId == hotelId && p.DaysBeforeCheckIn == daysBeforeCheckIn && p.IsActive);

        if (excludeId.HasValue)
        {
            query = query.Where(p => p.CancellationPolicyId != excludeId.Value);
        }

        return await query.AnyAsync(ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _context.SaveChangesAsync(ct);
    }
}
