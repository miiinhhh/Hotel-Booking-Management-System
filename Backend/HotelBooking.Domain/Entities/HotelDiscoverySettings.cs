namespace HotelBooking.Domain.Entities;

public sealed class HotelDiscoverySettings
{
    public int HotelId { get; set; }
    public string? CancellationPolicy { get; set; }
}
public sealed class HotelWishlist
{
    public long UserId { get; set; }
    public int HotelId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
