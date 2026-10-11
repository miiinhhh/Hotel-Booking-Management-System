namespace HotelBooking.Application.DTOs.Booking;

public class BookingResponseDto
{
    public long BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public long CustomerId { get; set; }
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int NumberOfGuests { get; set; }
    public string BookingStatus { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
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
    public DateTime CreatedAt { get; set; }

    public List<BookingDetailResponseDto> Details { get; set; } = new();
    public List<BookingGuestResponseDto> Guests { get; set; } = new();
    public List<BookingStatusHistoryResponseDto> StatusHistories { get; set; } = new();
}

public class BookingDetailResponseDto
{
    public long BookingDetailId { get; set; }
    public long RoomId { get; set; }
    public decimal UnitPrice { get; set; }
    public int NumberOfNights { get; set; }
    public decimal SubTotal { get; set; }
}

public class BookingGuestResponseDto
{
    public long BookingGuestId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimaryGuest { get; set; }
}

public class BookingStatusHistoryResponseDto
{
    public long BookingStatusHistoryId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public long? ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; }
    public string? Note { get; set; }
}
