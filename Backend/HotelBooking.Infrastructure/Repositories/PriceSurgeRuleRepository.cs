using System.Data;
using Dapper;
using HotelBooking.Application.DTOs.Pricing;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public class PriceSurgeRuleRepository : IPriceSurgeRuleRepository
{
    private readonly HotelBookingDBContext _context;
    private readonly IDbConnection _connection;

    public PriceSurgeRuleRepository(HotelBookingDBContext context, IDbConnection connection)
    {
        _context = context;
        _connection = connection;
    }

    public async Task<IReadOnlyList<PriceSurgeRule>> GetActiveRulesAsync(
        int hotelId,
        IEnumerable<int> roomTypeIds,
        DateOnly startDate,
        DateOnly endDate,
        CancellationToken ct = default)
    {
        var typeIds = roomTypeIds.Distinct().ToList();

        return await _context.PriceSurgeRules
            .AsNoTracking()
            .Where(r => r.HotelId == hotelId && r.IsActive)
            .Where(r => r.RoomTypeId == null || typeIds.Contains(r.RoomTypeId.Value))
            .Where(r => r.StartDate <= endDate && r.EndDate >= startDate)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<PriceSurgeRule>> GetListAsync(
        PriceSurgeRuleFilterRequest filter,
        CancellationToken ct = default)
    {
        var query = _context.PriceSurgeRules.AsNoTracking().AsQueryable();

        if (filter.HotelId.HasValue)
        {
            query = query.Where(r => r.HotelId == filter.HotelId.Value);
        }

        if (filter.RoomTypeId.HasValue)
        {
            query = query.Where(r => r.RoomTypeId == filter.RoomTypeId.Value);
        }

        if (filter.IsActive.HasValue)
        {
            query = query.Where(r => r.IsActive == filter.IsActive.Value);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(r => r.EndDate >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(r => r.StartDate <= filter.ToDate.Value);
        }

        return await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<PriceSurgeRule?> GetByIdAsync(long ruleId, CancellationToken ct = default)
    {
        return await _context.PriceSurgeRules
            .FirstOrDefaultAsync(r => r.RuleId == ruleId, ct);
    }

    public async Task<PriceSurgeRule> AddAsync(PriceSurgeRule rule, CancellationToken ct = default)
    {
        await _context.PriceSurgeRules.AddAsync(rule, ct);
        await _context.SaveChangesAsync(ct);
        return rule;
    }

    public async Task<PriceSurgeRule> UpdateAsync(PriceSurgeRule rule, CancellationToken ct = default)
    {
        _context.PriceSurgeRules.Update(rule);
        await _context.SaveChangesAsync(ct);
        return rule;
    }

    public async Task<bool> DeleteAsync(long ruleId, CancellationToken ct = default)
    {
        var rule = await _context.PriceSurgeRules.FirstOrDefaultAsync(r => r.RuleId == ruleId, ct);
        if (rule == null)
        {
            return false;
        }

        _context.PriceSurgeRules.Remove(rule);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> IsRoomTypeBelongToHotelAsync(int roomTypeId, int hotelId, CancellationToken ct = default)
    {
        const string sql = "SELECT COUNT(1) FROM RoomTypes WHERE RoomTypeId = @RoomTypeId AND HotelId = @HotelId;";
        var count = await _connection.ExecuteScalarAsync<int>(sql, new { RoomTypeId = roomTypeId, HotelId = hotelId });
        return count > 0;
    }

    public async Task<string?> GetRoomTypeNameAsync(int roomTypeId, CancellationToken ct = default)
    {
        const string sql = "SELECT RoomTypeName FROM RoomTypes WHERE RoomTypeId = @RoomTypeId;";
        return await _connection.QuerySingleOrDefaultAsync<string?>(sql, new { RoomTypeId = roomTypeId });
    }
}
