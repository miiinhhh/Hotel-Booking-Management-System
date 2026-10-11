namespace HotelBooking.Domain.Entities;

public class BookingDetail
{
    public long BookingDetailId { get; set; }
    public long BookingId { get; set; }
    public long RoomId { get; set; }
    public decimal UnitPrice { get; set; }
    public int NumberOfNights { get; set; }
    public decimal SubTotal { get; set; }

    // Navigation property
    public Booking Booking { get; set; } = null!;
}
