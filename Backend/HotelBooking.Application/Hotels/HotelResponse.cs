namespace HotelBooking.Application.Hotels;

public sealed record HotelResponse(
    int HotelId, string HotelName, string? Description, string Address,
    string City, string Country, string Phone, string Email, string? Website,
    TimeOnly CheckInTime, TimeOnly CheckOutTime, bool IsActive,
    DateTime CreatedAt, DateTime? UpdatedAt);

public sealed record HotelPage(IReadOnlyList<HotelResponse> Items, int TotalCount, int PageNumber, int PageSize);
