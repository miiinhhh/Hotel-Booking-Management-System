namespace HotelBooking.Domain.Entities;

public class Voucher
{
    public long VoucherId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string VoucherType { get; set; } = "Percentage"; // "Percentage" or "FixedAmount"
    public decimal DiscountValue { get; set; }
    public decimal MinimumOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int UsageLimitPerCustomer { get; set; } = 1;
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<VoucherUsage> VoucherUsages { get; set; } = new List<VoucherUsage>();
}
