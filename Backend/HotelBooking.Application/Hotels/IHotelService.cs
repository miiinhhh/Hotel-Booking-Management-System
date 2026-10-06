namespace HotelBooking.Application.Hotels;

public interface IHotelService
{
    Task<HotelPage> GetPageAsync(int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<HotelResponse> GetByIdAsync(int hotelId, CancellationToken cancellationToken);
    Task<HotelResponse> CreateAsync(HotelRequest request, CancellationToken cancellationToken);
    Task<HotelResponse> UpdateAsync(int hotelId, HotelRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(int hotelId, CancellationToken cancellationToken);
}
