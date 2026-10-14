namespace HotelBooking.Application.DTOs.Payment;

public class PaymentHistoryFilterRequest
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 10;

    public long? BookingId { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }
}
