namespace HotelBooking.Application.DTOs.Booking;

public class RescheduleBookingRequest
{
    public DateOnly NewCheckInDate { get; set; }
    public DateOnly NewCheckOutDate { get; set; }
    public List<long>? NewRoomIds { get; set; }
    public string? Reason { get; set; }
}

public class NoShowRequest
{
    public string? Note { get; set; }
}

