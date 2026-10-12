namespace HotelBooking.Domain.Entities;

public class BookingGuest
{
    public long BookingGuestId { get; set; }
    public long BookingId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimaryGuest { get; set; }

    // Navigation property
    public Booking Booking { get; set; } = null!;
}
