namespace HotelBooking.Domain.Entities;

public sealed class AuthOtpChallenge
{
    public Guid ChallengeId { get; set; }
    public long? UserId { get; set; }
    public string Channel { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ConsumedAt { get; set; }
    public User? User { get; set; }
}
