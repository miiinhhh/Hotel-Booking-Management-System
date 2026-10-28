namespace HotelBooking.Domain.Entities;

public class CancellationPolicy
{
    public int CancellationPolicyId { get; set; }
    public int HotelId { get; set; }
    public string PolicyName { get; set; } = string.Empty;
    public int DaysBeforeCheckIn { get; set; }
    public decimal RefundPercentage { get; set; }
    public decimal DepositPenaltyPercentage { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
