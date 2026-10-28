namespace HotelBooking.Application.DTOs.Cancellation;

public class CancellationPolicyDto
{
    public int CancellationPolicyId { get; set; }
    public int HotelId { get; set; }
    public string PolicyName { get; set; } = string.Empty;
    public int DaysBeforeCheckIn { get; set; }
    public decimal RefundPercentage { get; set; }
    public decimal DepositPenaltyPercentage { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateCancellationPolicyRequest
{
    public int HotelId { get; set; }
    public string PolicyName { get; set; } = string.Empty;
    public int DaysBeforeCheckIn { get; set; }
    public decimal RefundPercentage { get; set; }
    public decimal DepositPenaltyPercentage { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateCancellationPolicyRequest
{
    public string PolicyName { get; set; } = string.Empty;
    public int DaysBeforeCheckIn { get; set; }
    public decimal RefundPercentage { get; set; }
    public decimal DepositPenaltyPercentage { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CancelPreviewResponseDto
{
    public long BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int DaysRemaining { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TotalPaid { get; set; }
    public string? AppliedPolicyName { get; set; }
    public int? PolicyDaysBeforeCheckIn { get; set; }
    public decimal RefundPercentage { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal PenaltyPercentage { get; set; }
    public decimal PenaltyAmount { get; set; }
    public bool IsEligibleForRefund { get; set; }
    public string Message { get; set; } = string.Empty;
}
