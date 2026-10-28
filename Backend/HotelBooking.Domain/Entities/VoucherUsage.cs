namespace HotelBooking.Domain.Entities;

public class VoucherUsage
{
    public long VoucherUsageId { get; set; }
    public long VoucherId { get; set; }
    public long CustomerId { get; set; }
    public long BookingId { get; set; }
    public decimal DiscountApplied { get; set; }
    public DateTime UsedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Voucher Voucher { get; set; } = null!;
    public Booking Booking { get; set; } = null!;
}
