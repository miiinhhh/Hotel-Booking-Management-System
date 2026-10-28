using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Voucher;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;

namespace HotelBooking.Application.Services;

public class VoucherService : IVoucherService
{
    private readonly IVoucherRepository _voucherRepository;

    public VoucherService(IVoucherRepository voucherRepository)
    {
        _voucherRepository = voucherRepository;
    }

    public async Task<ValidateVoucherResponse> ValidateVoucherAsync(
        ValidateVoucherRequest request,
        long? customerId = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = "Mã voucher không được để trống."
            };
        }

        var normalizedCode = request.Code.Trim().ToUpperInvariant();
        var voucher = await _voucherRepository.GetByCodeAsync(normalizedCode, ct);

        if (voucher == null)
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = "Mã giảm giá không tồn tại trên hệ thống."
            };
        }

        if (!voucher.IsActive)
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = "Mã giảm giá hiện đang bị tạm khóa hoặc đã ngừng hoạt động."
            };
        }

        var now = DateTime.UtcNow;
        if (now < voucher.StartAt)
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = $"Mã giảm giá chưa đến thời gian áp dụng (Bắt đầu từ: {voucher.StartAt:dd/MM/yyyy HH:mm} UTC)."
            };
        }

        if (now > voucher.EndAt)
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = $"Mã giảm giá đã hết hạn sử dụng (Hết hạn vào: {voucher.EndAt:dd/MM/yyyy HH:mm} UTC)."
            };
        }

        if (voucher.UsageLimit.HasValue && voucher.UsedCount >= voucher.UsageLimit.Value)
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = "Mã giảm giá đã hết lượt sử dụng toàn hệ thống."
            };
        }

        if (customerId.HasValue)
        {
            var customerUsedCount = await _voucherRepository.GetCustomerUsageCountAsync(voucher.VoucherId, customerId.Value, ct);
            if (customerUsedCount >= voucher.UsageLimitPerCustomer)
            {
                return new ValidateVoucherResponse
                {
                    IsValid = false,
                    Message = $"Bạn đã sử dụng hết lượt cho phép ({voucher.UsageLimitPerCustomer} lần) đối với mã giảm giá này."
                };
            }
        }

        if (request.SubTotal < voucher.MinimumOrderAmount)
        {
            return new ValidateVoucherResponse
            {
                IsValid = false,
                Message = $"Đơn hàng chưa đạt giá trị tối thiểu {voucher.MinimumOrderAmount:N0} VNĐ để áp dụng mã này."
            };
        }

        decimal discount = 0m;
        if (voucher.VoucherType == VoucherType.Percentage)
        {
            discount = request.SubTotal * (voucher.DiscountValue / 100m);
            if (voucher.MaxDiscountAmount.HasValue && voucher.MaxDiscountAmount.Value > 0)
            {
                discount = Math.Min(discount, voucher.MaxDiscountAmount.Value);
            }
        }
        else
        {
            discount = voucher.DiscountValue;
        }

        discount = Math.Min(discount, request.SubTotal);
        discount = Math.Round(discount, 2);
        decimal finalAmount = Math.Max(0m, request.SubTotal - discount);

        return new ValidateVoucherResponse
        {
            IsValid = true,
            VoucherId = voucher.VoucherId,
            Code = voucher.Code,
            DiscountAmount = discount,
            FinalAmount = finalAmount,
            Message = "Áp dụng mã giảm giá thành công."
        };
    }

    public async Task<(bool Success, decimal DiscountAmount, long? VoucherId, string? ErrorMessage)> RecordVoucherUsageAsync(
        string code,
        long customerId,
        long bookingId,
        decimal subTotal,
        CancellationToken ct = default)
    {
        var validation = await ValidateVoucherAsync(new ValidateVoucherRequest
        {
            Code = code,
            SubTotal = subTotal
        }, customerId, ct);

        if (!validation.IsValid)
        {
            return (false, 0m, null, validation.Message);
        }

        var voucherId = validation.VoucherId!.Value;

        // Atomic update đảm bảo không bao giờ vượt UsedCount khi nhiều request đồng thời
        var incremented = await _voucherRepository.IncrementUsedCountAtomicAsync(voucherId, ct);
        if (!incremented)
        {
            return (false, 0m, null, "Mã giảm giá vừa hết lượt sử dụng.");
        }

        var usage = new VoucherUsage
        {
            VoucherId = voucherId,
            CustomerId = customerId,
            BookingId = bookingId,
            DiscountApplied = validation.DiscountAmount,
            UsedAt = DateTime.UtcNow
        };

        await _voucherRepository.AddUsageRecordAsync(usage, ct);

        return (true, validation.DiscountAmount, voucherId, null);
    }

    public async Task<VoucherResponseDto> GetByIdAsync(long voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(voucherId, ct);
        if (voucher == null)
        {
            throw new KeyNotFoundException("Voucher not found.");
        }

        return MapToDto(voucher);
    }

    public async Task<PagedResult<VoucherResponseDto>> GetListAsync(VoucherFilterRequest filter, CancellationToken ct = default)
    {
        if (filter.Page < 1) filter.Page = 1;
        if (filter.PageSize < 1 || filter.PageSize > 100) filter.PageSize = 10;

        var (items, totalCount) = await _voucherRepository.GetPagedListAsync(
            filter.Code,
            filter.IsActive,
            filter.Page,
            filter.PageSize,
            ct);

        var dtos = items.Select(MapToDto).ToList();
        return new PagedResult<VoucherResponseDto>(dtos, totalCount, filter.Page, filter.PageSize);
    }

    public async Task<VoucherResponseDto> CreateAsync(CreateVoucherRequest request, CancellationToken ct = default)
    {
        var normalizedCode = request.Code.Trim().ToUpperInvariant();

        if (await _voucherRepository.CodeExistsAsync(normalizedCode, null, ct))
        {
            throw new ArgumentException($"Mã voucher '{normalizedCode}' đã tồn tại.");
        }

        if (request.EndAt <= request.StartAt)
        {
            throw new ArgumentException("Thời gian kết thúc (EndAt) phải sau thời gian bắt đầu (StartAt).");
        }

        if (request.DiscountValue <= 0)
        {
            throw new ArgumentException("Giá trị giảm giá phải lớn hơn 0.");
        }

        var voucherType = ParseVoucherType(request.VoucherType);
        if (voucherType == VoucherType.Percentage && request.DiscountValue > 100)
        {
            throw new ArgumentException("Voucher phần trăm không thể giảm quá 100%.");
        }

        var voucher = new Voucher
        {
            Code = normalizedCode,
            VoucherType = voucherType,
            DiscountValue = request.DiscountValue,
            MinimumOrderAmount = request.MinimumOrderAmount,
            MaxDiscountAmount = request.MaxDiscountAmount,
            UsageLimitPerCustomer = request.UsageLimitPerCustomer,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            UsageLimit = request.UsageLimit,
            UsedCount = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await _voucherRepository.AddAsync(voucher, ct);
        return MapToDto(voucher);
    }

    public async Task<VoucherResponseDto> UpdateAsync(long voucherId, UpdateVoucherRequest request, CancellationToken ct = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(voucherId, ct);
        if (voucher == null)
        {
            throw new KeyNotFoundException("Voucher not found.");
        }

        if (request.EndAt <= request.StartAt)
        {
            throw new ArgumentException("Thời gian kết thúc (EndAt) phải sau thời gian bắt đầu (StartAt).");
        }

        if (request.DiscountValue <= 0)
        {
            throw new ArgumentException("Giá trị giảm giá phải lớn hơn 0.");
        }

        var voucherType = ParseVoucherType(request.VoucherType);
        if (voucherType == VoucherType.Percentage && request.DiscountValue > 100)
        {
            throw new ArgumentException("Voucher phần trăm không thể giảm quá 100%.");
        }

        voucher.VoucherType = voucherType;
        voucher.DiscountValue = request.DiscountValue;
        voucher.MinimumOrderAmount = request.MinimumOrderAmount;
        voucher.MaxDiscountAmount = request.MaxDiscountAmount;
        voucher.UsageLimitPerCustomer = request.UsageLimitPerCustomer;
        voucher.StartAt = request.StartAt;
        voucher.EndAt = request.EndAt;
        voucher.UsageLimit = request.UsageLimit;
        voucher.IsActive = request.IsActive;
        voucher.UpdatedAt = DateTime.UtcNow;

        await _voucherRepository.UpdateAsync(voucher, ct);
        return MapToDto(voucher);
    }

    public async Task<bool> ToggleStatusAsync(long voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(voucherId, ct);
        if (voucher == null)
        {
            throw new KeyNotFoundException("Voucher not found.");
        }

        voucher.IsActive = !voucher.IsActive;
        voucher.UpdatedAt = DateTime.UtcNow;

        await _voucherRepository.UpdateAsync(voucher, ct);
        return voucher.IsActive;
    }

    public async Task<bool> DeleteAsync(long voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepository.GetByIdAsync(voucherId, ct);
        if (voucher == null)
        {
            throw new KeyNotFoundException("Voucher not found.");
        }

        // Soft delete: đặt IsActive = false để bảo toàn tính toàn vẹn dữ liệu đơn đặt phòng
        voucher.IsActive = false;
        voucher.UpdatedAt = DateTime.UtcNow;

        await _voucherRepository.UpdateAsync(voucher, ct);
        return true;
    }

    private static VoucherResponseDto MapToDto(Voucher v)
    {
        return new VoucherResponseDto
        {
            VoucherId = v.VoucherId,
            Code = v.Code,
            VoucherType = v.VoucherType.ToString(),
            DiscountValue = v.DiscountValue,
            MinimumOrderAmount = v.MinimumOrderAmount,
            MaxDiscountAmount = v.MaxDiscountAmount,
            UsageLimitPerCustomer = v.UsageLimitPerCustomer,
            StartAt = v.StartAt,
            EndAt = v.EndAt,
            UsageLimit = v.UsageLimit,
            UsedCount = v.UsedCount,
            IsActive = v.IsActive,
            CreatedAt = v.CreatedAt,
            UpdatedAt = v.UpdatedAt
        };
    }

    private static VoucherType ParseVoucherType(string value)
    {
        if (!Enum.TryParse<VoucherType>(value?.Trim(), true, out var type) || !Enum.IsDefined(type))
        {
            throw new ArgumentException("VoucherType phải là 'Percentage' hoặc 'FixedAmount'.");
        }

        return type;
    }
}
