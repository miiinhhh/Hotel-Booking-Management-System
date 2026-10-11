namespace HotelBooking.Application.DTOs.Booking;

public class BookingListDto
{
    public long BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public long CustomerId { get; set; }
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int NumberOfGuests { get; set; }
    public string BookingStatus { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public int RoomCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
