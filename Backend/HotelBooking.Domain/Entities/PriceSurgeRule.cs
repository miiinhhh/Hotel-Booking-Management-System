namespace HotelBooking.Domain.Entities;

public class PriceSurgeRule
{
    public long RuleId { get; set; }
    public int HotelId { get; set; }
    public int? RoomTypeId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string AdjustmentType { get; set; } = "PERCENTAGE"; // "PERCENTAGE" or "FIXED_AMOUNT"
    public decimal AdjustmentValue { get; set; }
    public int Priority { get; set; } = 1;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public long CreatedByUserId { get; set; }
}
