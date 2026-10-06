using HotelBooking.Application.Hotels;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public sealed class HotelRepository(HotelDbContext dbContext) : IHotelRepository
{
    public async Task<(IReadOnlyList<Hotel> Items, int TotalCount)> GetPageAsync(
        int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = dbContext.Hotels.AsNoTracking();
        var count = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(hotel => hotel.HotelId)
            .Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return (items, count);
    }

    public Task<Hotel?> GetByIdAsync(int hotelId, CancellationToken cancellationToken) =>
        dbContext.Hotels.SingleOrDefaultAsync(hotel => hotel.HotelId == hotelId, cancellationToken);

    public async Task AddAsync(Hotel hotel, CancellationToken cancellationToken)
    {
        dbContext.Hotels.Add(hotel);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(Hotel hotel, CancellationToken cancellationToken)
    {
        // The service loads the entity through this scoped repository before updating it.
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new HotelConflictException("Hotel đã bị xóa trong lúc cập nhật. Hãy tải lại dữ liệu.", exception);
        }
    }

    public async Task DeleteAsync(Hotel hotel, CancellationToken cancellationToken)
    {
        dbContext.Hotels.Remove(hotel);
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is SqlException { Number: 547 })
        {
            throw new HotelConflictException(
                "Không thể xóa Hotel đang được dữ liệu khác tham chiếu. Có thể cập nhật IsActive=false để ngừng hoạt động.", exception);
        }
        catch (DbUpdateConcurrencyException exception)
        {
            throw new HotelConflictException("Hotel đã bị xóa bởi yêu cầu khác. Hãy tải lại dữ liệu.", exception);
        }
    }
}
