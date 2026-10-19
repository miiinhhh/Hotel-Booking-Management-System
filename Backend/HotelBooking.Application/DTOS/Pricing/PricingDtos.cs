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
    public decimal NightlyPrice { get; set; }
    public string RateSource { get; set; } = "BasePrice"; // "History" or "BasePrice"
}

public class RoomStayPriceSummaryDto
{
    public long RoomId { get; set; }
    public int RoomTypeId { get; set; }
    public int NumberOfNights { get; set; }
    public decimal SubTotal { get; set; }
    public decimal AverageUnitPrice { get; set; }
    public List<DailyPriceBreakdownDto> DailyBreakdown { get; set; } = new();
}

public class PriceCalculationResultDto
{
    public int NumberOfNights { get; set; }
    public decimal SubTotal { get; set; }
    public decimal FeeAmount { get; set; }
    public string? FeeDescription { get; set; }
    public decimal EstimatedTaxAmount { get; set; }
    public decimal EstimatedTotalAmount { get; set; }
    public decimal EstimatedDepositAmount { get; set; }
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
