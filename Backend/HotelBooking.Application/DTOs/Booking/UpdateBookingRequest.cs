namespace HotelBooking.Application.DTOs.Booking;

public class UpdateBookingRequest
{
    public string NewStatus { get; set; } = string.Empty; // Pending, Confirmed, CheckedIn, CheckedOut, Completed, Cancelled
    public string? Note { get; set; }
    public string? SpecialRequests { get; set; }
}
