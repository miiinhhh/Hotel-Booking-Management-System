namespace HotelBooking.Application.DTOs.Booking;

public class PriceCalculationResultDto
{
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int NumberOfNights { get; set; }

    public List<RoomPriceBreakdownDto> RoomBreakdowns { get; set; } = new();

    /// <summary>
    /// Tổng tiền phòng gốc (Room nights total)
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Mã Voucher áp dụng (nếu có)
    /// </summary>
    public string? VoucherCode { get; set; }
    public long? VoucherId { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? VoucherMessage { get; set; }

    /// <summary>
    /// Tiền sau khi trừ giảm giá
    /// </summary>
    public decimal SubTotalAfterDiscount { get; set; }

    /// <summary>
    /// Phí phục vụ (ví dụ: 5%)
    /// </summary>
    public decimal FeeRate { get; set; }
    public decimal FeeAmount { get; set; }

    /// <summary>
    /// Thuế VAT (ví dụ: 10%)
    /// </summary>
    public decimal TaxRate { get; set; }
    public decimal TaxAmount { get; set; }

    /// <summary>
    /// Tổng tiền thanh toán trọn gói
    /// </summary>
    public decimal TotalAmount { get; set; }

    /// <summary>
    /// Hình thức thanh toán đã chọn
    /// </summary>
    public string PaymentMethod { get; set; } = "Deposit";

    /// <summary>
    /// Tỷ lệ đặt cọc (%)
    /// </summary>
    public decimal DepositPercentage { get; set; }

    /// <summary>
    /// Tiền cọc cần thanh toán ngay
    /// </summary>
    public decimal DepositAmount { get; set; }

    /// <summary>
    /// Số tiền còn lại sẽ thanh toán tại khách sạn khi check-in
    /// </summary>
    public decimal RemainingAmount { get; set; }
}

public class RoomPriceBreakdownDto
{
    public long RoomId { get; set; }
    public string RoomNumber { get; set; } = string.Empty;
    public int RoomTypeId { get; set; }
    public string RoomTypeName { get; set; } = string.Empty;
    public decimal UnitPricePerNight { get; set; }
    public int NumberOfNights { get; set; }
    public decimal SubTotal { get; set; }
}
