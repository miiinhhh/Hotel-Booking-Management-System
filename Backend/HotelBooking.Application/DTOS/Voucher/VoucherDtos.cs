using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.DTOs.Voucher;

public class CreateVoucherRequest
{
    [Required, StringLength(50)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public string VoucherType { get; set; } = "Percentage"; // "Percentage" or "FixedAmount"

    [Range(0.01, double.MaxValue, ErrorMessage = "DiscountValue must be greater than 0.")]
    public decimal DiscountValue { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "MinimumOrderAmount must be nonnegative.")]
    public decimal MinimumOrderAmount { get; set; }

    public decimal? MaxDiscountAmount { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "UsageLimitPerCustomer must be at least 1.")]
    public int UsageLimitPerCustomer { get; set; } = 1;

    [Required]
    public DateTime StartAt { get; set; }

    [Required]
    public DateTime EndAt { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "UsageLimit must be at least 1 if specified.")]
    public int? UsageLimit { get; set; }
}

public class UpdateVoucherRequest
{
    [Required]
    public string VoucherType { get; set; } = "Percentage";

    [Range(0.01, double.MaxValue, ErrorMessage = "DiscountValue must be greater than 0.")]
    public decimal DiscountValue { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "MinimumOrderAmount must be nonnegative.")]
    public decimal MinimumOrderAmount { get; set; }

    public decimal? MaxDiscountAmount { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "UsageLimitPerCustomer must be at least 1.")]
    public int UsageLimitPerCustomer { get; set; } = 1;

    [Required]
    public DateTime StartAt { get; set; }

    [Required]
    public DateTime EndAt { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "UsageLimit must be at least 1 if specified.")]
    public int? UsageLimit { get; set; }

    public bool IsActive { get; set; } = true;
}

public class VoucherResponseDto
{
    public long VoucherId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string VoucherType { get; set; } = string.Empty;
    public decimal DiscountValue { get; set; }
    public decimal MinimumOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int UsageLimitPerCustomer { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime EndAt { get; set; }
    public int? UsageLimit { get; set; }
    public int UsedCount { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class ValidateVoucherRequest
{
    [Required]
    public string Code { get; set; } = string.Empty;

    [Range(0.01, double.MaxValue, ErrorMessage = "SubTotal must be greater than 0.")]
    public decimal SubTotal { get; set; }
}

public class ValidateVoucherResponse
{
    public bool IsValid { get; set; }
    public long? VoucherId { get; set; }
    public string? Code { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal FinalAmount { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class VoucherFilterRequest
{
    public string? Code { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
