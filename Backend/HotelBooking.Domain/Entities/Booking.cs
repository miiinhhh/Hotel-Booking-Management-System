using HotelBooking.Domain.Enums;

namespace HotelBooking.Domain.Entities;

public class Booking
{
    public long BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public long CustomerId { get; set; }
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int NumberOfGuests { get; set; }
    public BookingStatus BookingStatus { get; set; } = BookingStatus.Pending;
    public string PaymentMethod { get; set; } = "Deposit"; // Deposit / Cash
    public string PaymentStatus { get; set; } = "Unpaid";  // Unpaid / PartiallyPaid / Paid / Refunded
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal FeeAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal DepositAmount { get; set; }
    public decimal RemainingAmount { get; set; }
    public long? VoucherId { get; set; }
    public string? SpecialRequests { get; set; }
    public DateTime? HoldExpiresAt { get; set; }
    public string? CancellationReason { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<BookingDetail> BookingDetails { get; set; } = new List<BookingDetail>();
    public ICollection<BookingGuest> BookingGuests { get; set; } = new List<BookingGuest>();
    public ICollection<BookingStatusHistory> StatusHistories { get; set; } = new List<BookingStatusHistory>();
}