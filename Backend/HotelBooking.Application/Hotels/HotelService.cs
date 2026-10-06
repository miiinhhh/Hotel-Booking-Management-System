using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Exceptions;

namespace HotelBooking.Application.Hotels;

public sealed class HotelService(IHotelRepository repository) : IHotelService
{
    public async Task<HotelPage> GetPageAsync(int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        if (pageNumber < 1 || pageSize is < 1 or > 100 || (long)(pageNumber - 1) * pageSize > int.MaxValue)
            throw new DomainValidationException("pageNumber phải >= 1, pageSize từ 1 đến 100 và offset không vượt Int32.");
        var result = await repository.GetPageAsync(pageNumber, pageSize, cancellationToken);
        return new HotelPage(result.Items.Select(Map).ToArray(), result.TotalCount, pageNumber, pageSize);
    }

    public async Task<HotelResponse> GetByIdAsync(int hotelId, CancellationToken cancellationToken) =>
        Map(await FindAsync(hotelId, cancellationToken));

    public async Task<HotelResponse> CreateAsync(HotelRequest request, CancellationToken cancellationToken)
    {
        var hotel = Hotel.Create(ToInformation(request));
        await repository.AddAsync(hotel, cancellationToken);
        return Map(hotel);
    }

    public async Task<HotelResponse> UpdateAsync(int hotelId, HotelRequest request, CancellationToken cancellationToken)
    {
        var hotel = await FindAsync(hotelId, cancellationToken);
        hotel.Update(ToInformation(request));
        await repository.UpdateAsync(hotel, cancellationToken);
        return Map(hotel);
    }

    public async Task DeleteAsync(int hotelId, CancellationToken cancellationToken)
    {
        var hotel = await FindAsync(hotelId, cancellationToken);
        await repository.DeleteAsync(hotel, cancellationToken);
    }

    private async Task<Hotel> FindAsync(int hotelId, CancellationToken cancellationToken)
    {
        if (hotelId <= 0)
            throw new DomainValidationException("HotelId phải lớn hơn 0.");
        return await repository.GetByIdAsync(hotelId, cancellationToken) ?? throw new HotelNotFoundException(hotelId);
    }

    private static HotelInformation ToInformation(HotelRequest request) => new(
        request.HotelName, request.Description, request.Address, request.City,
        request.Country, request.Phone, request.Email, request.Website,
        request.CheckInTime ?? throw new DomainValidationException("CheckInTime là bắt buộc."),
        request.CheckOutTime ?? throw new DomainValidationException("CheckOutTime là bắt buộc."), request.IsActive);

    private static HotelResponse Map(Hotel hotel) => new(
        hotel.HotelId, hotel.HotelName, hotel.Description, hotel.Address, hotel.City,
        hotel.Country, hotel.Phone, hotel.Email, hotel.Website, hotel.CheckInTime,
        hotel.CheckOutTime, hotel.IsActive, hotel.CreatedAt, hotel.UpdatedAt);
}
