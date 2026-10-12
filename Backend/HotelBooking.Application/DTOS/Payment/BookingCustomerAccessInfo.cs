namespace HotelBooking.Application.DTOs.Payment;

public class BookingCustomerAccessInfo
{
    public long BookingId { get; set; }

    public long CustomerId { get; set; }

    public string BookingStatus { get; set; } = string.Empty;
}
