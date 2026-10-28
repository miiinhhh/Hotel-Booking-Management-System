using System.Data;
using Dapper;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public class RoomPriceHistoryRepository : IRoomPriceHistoryRepository
{
    private readonly HotelBookingDBContext _context;
    private readonly IDbConnection _connection;

    public RoomPriceHistoryRepository(HotelBookingDBContext context, IDbConnection connection)
    {
        _context = context;
        _connection = connection;
    }

    public async Task<IReadOnlyList<RoomPriceHistory>> GetHistoriesByRoomTypeAsync(int roomTypeId, CancellationToken ct = default)
    {
        return await _context.RoomPriceHistories
            .AsNoTracking()
            .Where(h => h.RoomTypeId == roomTypeId)
            .OrderByDescending(h => h.EffectiveFrom)
            .ThenByDescending(h => h.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<RoomPriceHistory> AddHistoryAsync(RoomPriceHistory history, CancellationToken ct = default)
    {
        await _context.RoomPriceHistories.AddAsync(history, ct);
        await _context.SaveChangesAsync(ct);
        return history;
    }

    public async Task<Dictionary<long, (int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)>> GetRoomDetailsForPricingAsync(
        IEnumerable<long> roomIds,
        CancellationToken ct = default)
    {
        var ids = roomIds.Distinct().ToList();
        if (ids.Count == 0) return new Dictionary<long, (int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)>();

        const string sql = """
            SELECT
                r.RoomId,
                r.RoomTypeId,
                rt.HotelId,
                rt.RoomTypeName,
                rt.BasePrice
            FROM Rooms r
            INNER JOIN RoomTypes rt ON r.RoomTypeId = rt.RoomTypeId
            WHERE r.RoomId IN @Ids;
            """;

        var records = await _connection.QueryAsync<(long RoomId, int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)>(
            sql,
            new { Ids = ids });

        return records.ToDictionary(x => x.RoomId, x => (x.RoomTypeId, x.HotelId, x.RoomTypeName, x.BasePrice));
    }

    public async Task<(TimeOnly CheckInTime, TimeOnly CheckOutTime)?> GetHotelCheckInOutPolicyAsync(
        int hotelId,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                CheckInTime,
                CheckOutTime
            FROM Hotels
            WHERE HotelId = @HotelId;
            """;

        var result = await _connection.QuerySingleOrDefaultAsync<(TimeSpan CheckInTime, TimeSpan CheckOutTime)?>(
            sql,
            new { HotelId = hotelId });

        if (result == null) return null;

        return (TimeOnly.FromTimeSpan(result.Value.CheckInTime), TimeOnly.FromTimeSpan(result.Value.CheckOutTime));
    }
}
