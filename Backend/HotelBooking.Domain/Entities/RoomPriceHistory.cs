namespace HotelBooking.Domain.Entities;

public class RoomPriceHistory
{
    public long PriceHistoryId { get; set; }
    public int RoomTypeId { get; set; }
    public decimal Price { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public long ChangedByUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
