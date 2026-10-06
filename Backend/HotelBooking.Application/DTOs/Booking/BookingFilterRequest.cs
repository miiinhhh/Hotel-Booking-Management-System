namespace HotelBooking.Application.DTOs.Booking;

public class BookingFilterRequest
{
    public string? BookingCode { get; set; }
    public long? CustomerId { get; set; }
    public string? Status { get; set; }
    public string? PaymentStatus { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public int PageIndex { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
