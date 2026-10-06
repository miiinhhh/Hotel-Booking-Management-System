using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Hotels;

public interface IHotelRepository
{
    Task<(IReadOnlyList<Hotel> Items, int TotalCount)> GetPageAsync(int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Hotel?> GetByIdAsync(int hotelId, CancellationToken cancellationToken);
    Task AddAsync(Hotel hotel, CancellationToken cancellationToken);
    Task UpdateAsync(Hotel hotel, CancellationToken cancellationToken);
    Task DeleteAsync(Hotel hotel, CancellationToken cancellationToken);
}
