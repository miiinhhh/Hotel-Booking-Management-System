using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Hotels;

public interface IHotelRepository
{
    Task<(IReadOnlyList<Hotel> Items, int TotalCount)> GetPageAsync(int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<Hotel?> GetByIdAsync(int hotelId, CancellationToken cancellationToken);
    Task AddAsync(Hotel hotel, CancellationToken cancellationToken);
    Task UpdateAsync(Hotel hotel, CancellationToken cancellationToken);
    Task DeleteAsync(Hotel hotel, CancellationToken cancellationToken);
    /// <summary>Số đơn chưa hoàn tất (chờ xác nhận còn hạn giữ chỗ, đã xác nhận, đang lưu trú) của khách sạn.</summary>
    Task<int> CountOpenBookingsAsync(int hotelId, CancellationToken cancellationToken);
}
