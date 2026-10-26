using HotelBooking.Domain.Enums;

namespace HotelBooking.Domain.Entities;

public class Voucher
{
    public long VoucherId { get; set; }
    public string Code { get; set; } = string.Empty;
    public VoucherType VoucherType { get; set; } = VoucherType.Percentage;
    public decimal DiscountValue { get; set; }
    public decimal MinimumOrderAmount { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public bool IsValidNow(decimal orderAmount, out string? reason)
    {
        if (!IsActive)
        {
            reason = "Mã ưu đãi hiện đang bị khóa hoặc không hoạt động.";
            return false;
        }

        var now = DateTime.UtcNow;
        if (now < StartAt)
        {
            reason = "Mã ưu đãi chưa đến ngày bắt đầu áp dụng.";
            return false;
        }

        if (now > EndAt)
        {
            reason = "Mã ưu đãi đã hết hạn sử dụng.";
            return false;
        }

        if (UsageLimit.HasValue && UsedCount >= UsageLimit.Value)
        {
            reason = "Mã ưu đãi đã vượt quá số lượt sử dụng tối đa.";
            return false;
        }

        if (orderAmount < MinimumOrderAmount)
        {
            reason = $"Đơn hàng tối thiểu {MinimumOrderAmount:N0}đ để áp dụng mã ưu đãi này.";
            return false;
        }

        reason = null;
        return true;
    }

    public decimal CalculateDiscount(decimal orderAmount)
    {
        if (orderAmount <= 0)
        {
            return 0m;
        }

        decimal discount = VoucherType switch
        {
            VoucherType.Percentage => Math.Round(orderAmount * (DiscountValue / 100m), 2),
            VoucherType.FixedAmount => Math.Min(DiscountValue, orderAmount),
            _ => 0m
        };

        return Math.Clamp(discount, 0m, orderAmount);
    }
}
