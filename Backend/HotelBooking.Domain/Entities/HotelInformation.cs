namespace HotelBooking.Domain.Entities;

public sealed record HotelInformation(
    string HotelName, string? Description, string Address, string City,
    string Country, string Phone, string Email, string? Website,
    TimeOnly CheckInTime, TimeOnly CheckOutTime, bool IsActive);
