namespace HotelBooking.Domain.Entities;

public class BookingStatusHistory
{
    public long BookingStatusHistoryId { get; set; }
    public long BookingId { get; set; }
    public string? OldStatus { get; set; }
    public string NewStatus { get; set; } = string.Empty;
    public long? ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
    public string? Note { get; set; }

    // Navigation property
    public Booking Booking { get; set; } = null!;
}
