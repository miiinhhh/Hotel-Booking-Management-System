namespace HotelBooking.Application.DTOs.Pricing;

public class PriceCalculationRequest
{
    public int HotelId { get; set; }
    public List<long> RoomIds { get; set; } = new();
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
}

public class DailyPriceBreakdownDto
{
    public long RoomId { get; set; }
    public int RoomTypeId { get; set; }
    public DateOnly StayDate { get; set; }
    public DateOnly Date => StayDate;
    public string DayOfWeek { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public string AppliedRule { get; set; } = "Giá ngày thường";
    public decimal SurgeAmount { get; set; }
    public decimal FinalNightlyPrice { get; set; }
    public decimal NightlyPrice
    {
        get => FinalNightlyPrice;
        set => FinalNightlyPrice = value;
    }
    public string RateSource { get; set; } = "BasePrice"; // "History" or "BasePrice"
}

public class RoomStayPriceSummaryDto
{
    public long RoomId { get; set; }
    public int RoomTypeId { get; set; }
    public string RoomTypeName { get; set; } = string.Empty;
    public int NumberOfNights { get; set; }
    public decimal SubTotal { get; set; }
    public decimal AverageUnitPrice { get; set; }
    public List<DailyPriceBreakdownDto> DailyBreakdown { get; set; } = new();
}

public class PriceCalculationResultDto
{
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int NumberOfNights { get; set; }
    public int TotalNights => NumberOfNights;
    public decimal SubTotal { get; set; }
    public decimal FeeAmount { get; set; }
    public string? FeeDescription { get; set; }
    public decimal EstimatedTaxAmount { get; set; }
    public decimal TaxVAT => EstimatedTaxAmount;
    public decimal EstimatedTotalAmount { get; set; }
    public decimal GrandTotal => EstimatedTotalAmount;
    public decimal EstimatedDepositAmount { get; set; }
    public decimal DepositRequired => EstimatedDepositAmount;
    public List<RoomStayPriceSummaryDto> RoomSummaries { get; set; } = new();
}

public class RoomPriceHistoryDto
{
    public long PriceHistoryId { get; set; }
    public int RoomTypeId { get; set; }
    public decimal Price { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
    public long ChangedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateRoomPriceHistoryRequest
{
    public decimal Price { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
}

public class CreatePriceSurgeRuleRequest
{
    public int HotelId { get; set; }
    public int? RoomTypeId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string AdjustmentType { get; set; } = "PERCENTAGE"; // "PERCENTAGE" or "FIXED_AMOUNT"
    public decimal AdjustmentValue { get; set; }
    public int Priority { get; set; } = 1;
    public bool IsActive { get; set; } = true;
}

public class UpdatePriceSurgeRuleRequest
{
    public string RuleName { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string AdjustmentType { get; set; } = "PERCENTAGE";
    public decimal AdjustmentValue { get; set; }
    public int Priority { get; set; } = 1;
    public bool IsActive { get; set; } = true;
}

public class PriceSurgeRuleDto
{
    public long RuleId { get; set; }
    public int HotelId { get; set; }
    public int? RoomTypeId { get; set; }
    public string? RoomTypeName { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string AdjustmentType { get; set; } = "PERCENTAGE";
    public decimal AdjustmentValue { get; set; }
    public int Priority { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public long CreatedByUserId { get; set; }
}

public class PriceSurgeRuleFilterRequest
{
    public int? HotelId { get; set; }
    public int? RoomTypeId { get; set; }
    public bool? IsActive { get; set; }
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
}
