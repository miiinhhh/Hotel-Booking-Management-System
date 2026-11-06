using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.DTOs.Voucher;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;

namespace HotelBooking.Application.Services;

public class BookingPricingService : IBookingPricingService
{
    private const decimal ServiceFeeRate = 0m;    // 0% phí phục vụ
    private const decimal VatTaxRate = 0m;        // 0% thuế VAT
    private const decimal DefaultDepositPercent = 70m; // 70% tiền cọc

    private readonly IRoomRepository _roomRepository;
    private readonly IVoucherRepository _voucherRepository;
    private readonly IPricingService? _pricingService;
    private readonly IVoucherService? _voucherService;

    public BookingPricingService(
        IRoomRepository roomRepository,
        IVoucherRepository voucherRepository)
        : this(roomRepository, voucherRepository, null, null)
    {
    }

    public BookingPricingService(
        IRoomRepository roomRepository,
        IVoucherRepository voucherRepository,
        IPricingService? pricingService = null,
        IVoucherService? voucherService = null)
    {
        _roomRepository = roomRepository;
        _voucherRepository = voucherRepository;
        _pricingService = pricingService;
        _voucherService = voucherService;
    }

    public async Task<ApiResponse<PriceCalculationResultDto>> CalculatePriceAsync(
        CalculatePriceRequest request,
        CancellationToken ct = default)
    {
        if (request.CheckOutDate <= request.CheckInDate)
        {
            return ApiResponse<PriceCalculationResultDto>.FailureResult(
                "Ngày trả phòng (CheckOut) phải sau ngày nhận phòng (CheckIn).");
        }

        if (request.RoomIds == null || request.RoomIds.Count == 0)
        {
            return ApiResponse<PriceCalculationResultDto>.FailureResult(
                "Vui lòng chọn ít nhất 1 phòng để tính giá.");
        }

        try
        {
            var result = await CalculateAuthoritativePriceAsync(
                request.CheckInDate,
                request.CheckOutDate,
                request.RoomIds,
                request.VoucherCode,
                request.PaymentMethod,
                ct);

            return ApiResponse<PriceCalculationResultDto>.SuccessResult(
                result,
                "Tính toán giá đặt phòng thành công.");
        }
        catch (InvalidOperationException ex)
        {
            return ApiResponse<PriceCalculationResultDto>.FailureResult(ex.Message);
        }
    }

    public async Task<PriceCalculationResultDto> CalculateAuthoritativePriceAsync(
        DateOnly checkIn,
        DateOnly checkOut,
        IReadOnlyList<long> roomIds,
        string? voucherCode,
        string paymentMethod,
        CancellationToken ct = default)
    {
        if (checkOut <= checkIn)
        {
            throw new InvalidOperationException("Ngày trả phòng (CheckOut) phải sau ngày nhận phòng (CheckIn).");
        }

        if (roomIds == null || roomIds.Count == 0)
        {
            throw new InvalidOperationException("Danh sách phòng không được để trống.");
        }

        int numberOfNights = checkOut.DayNumber - checkIn.DayNumber;
        decimal subTotal = 0m;
        var roomBreakdowns = new List<RoomPriceBreakdownDto>();

        // Tích hợp PricingService (tính giá từng đêm, phụ thu ngày lễ) nếu có
        HotelBooking.Application.DTOs.Pricing.PriceCalculationResultDto? dynamicPricingResult = null;
        if (_pricingService != null)
        {
            try
            {
                dynamicPricingResult = await _pricingService.CalculateStayPriceAsync(new HotelBooking.Application.DTOs.Pricing.PriceCalculationRequest
                {
                    RoomIds = roomIds.ToList(),
                    CheckInDate = checkIn,
                    CheckOutDate = checkOut
                }, ct);
            }
            catch
            {
                dynamicPricingResult = null;
            }
        }

        if (dynamicPricingResult != null && dynamicPricingResult.RoomSummaries.Count > 0)
        {
            subTotal = dynamicPricingResult.SubTotal;
            foreach (var roomId in roomIds)
            {
                var room = await _roomRepository.FindRoomAsync(roomId, ct);
                var summary = dynamicPricingResult.RoomSummaries.FirstOrDefault(s => s.RoomId == roomId);
                decimal roomSubTotal = summary?.SubTotal ?? 0m;
                decimal unitPrice = summary?.AverageUnitPrice ?? (numberOfNights > 0 ? Math.Round(roomSubTotal / numberOfNights, 2) : 0m);

                roomBreakdowns.Add(new RoomPriceBreakdownDto
                {
                    RoomId = roomId,
                    RoomNumber = room?.RoomNumber ?? string.Empty,
                    RoomTypeId = room?.RoomTypeId ?? summary?.RoomTypeId ?? 0,
                    RoomTypeName = room?.RoomType?.RoomTypeName ?? summary?.RoomTypeName ?? string.Empty,
                    UnitPricePerNight = unitPrice,
                    NumberOfNights = numberOfNights,
                    SubTotal = roomSubTotal
                });
            }
        }
        else
        {
            foreach (var roomId in roomIds)
            {
                var room = await _roomRepository.FindRoomAsync(roomId, ct);
                if (room == null)
                {
                    throw new InvalidOperationException($"Không tìm thấy thông tin phòng (ID: {roomId}).");
                }

                if (room.RoomType == null)
                {
                    throw new InvalidOperationException($"Phòng (ID: {roomId}) chưa được liên kết với loại phòng.");
                }

                decimal unitPrice = room.RoomType.BasePrice;
                decimal roomSubTotal = unitPrice * numberOfNights;
                subTotal += roomSubTotal;

                roomBreakdowns.Add(new RoomPriceBreakdownDto
                {
                    RoomId = room.RoomId,
                    RoomNumber = room.RoomNumber,
                    RoomTypeId = room.RoomTypeId,
                    RoomTypeName = room.RoomType.RoomTypeName,
                    UnitPricePerNight = unitPrice,
                    NumberOfNights = numberOfNights,
                    SubTotal = roomSubTotal
                });
            }
        }

        // Xử lý Voucher / Mã giảm giá
        decimal discountAmount = 0m;
        string? voucherMessage = null;
        long? voucherId = null;
        string? appliedVoucherCode = null;

        if (!string.IsNullOrWhiteSpace(voucherCode))
        {
            if (_voucherService != null)
            {
                var validation = await _voucherService.ValidateVoucherAsync(new ValidateVoucherRequest
                {
                    Code = voucherCode,
                    SubTotal = subTotal
                }, ct: ct);

                if (!validation.IsValid)
                {
                    voucherMessage = validation.Message;
                }
                else
                {
                    discountAmount = validation.DiscountAmount;
                    voucherId = validation.VoucherId;
                    appliedVoucherCode = validation.Code;
                    voucherMessage = $"Áp dụng thành công mã ưu đãi {validation.Code}: Giảm {discountAmount:N0}đ.";
                }
            }
            else
            {
                var voucher = await _voucherRepository.GetByCodeAsync(voucherCode, ct);
                if (voucher == null)
                {
                    voucherMessage = $"Mã ưu đãi '{voucherCode.Trim().ToUpperInvariant()}' không tồn tại.";
                }
                else if (!voucher.IsValidNow(subTotal, out var reason))
                {
                    voucherMessage = reason;
                }
                else
                {
                    discountAmount = voucher.CalculateDiscount(subTotal);
                    voucherId = voucher.VoucherId;
                    appliedVoucherCode = voucher.Code;
                    voucherMessage = $"Áp dụng thành công mã ưu đãi {voucher.Code}: Giảm {discountAmount:N0}đ.";
                }
            }
        }

        // Thuế và Phí dịch vụ
        decimal subTotalAfterDiscount = Math.Max(0m, subTotal - discountAmount);
        decimal feeAmount = Math.Round(subTotalAfterDiscount * ServiceFeeRate, 2);
        decimal taxAmount = Math.Round((subTotalAfterDiscount + feeAmount) * VatTaxRate, 2);
        decimal totalAmount = subTotalAfterDiscount + feeAmount + taxAmount;

        // Phân bổ thanh toán (Đặt cọc vs Thanh toán tại khách sạn)
        bool isDeposit = string.Equals(paymentMethod, "Deposit", StringComparison.OrdinalIgnoreCase);
        decimal depositPercentage = isDeposit ? DefaultDepositPercent : 0m;
        decimal depositAmount = isDeposit ? Math.Round(totalAmount * (DefaultDepositPercent / 100m), 2) : 0m;
        decimal remainingAmount = totalAmount - depositAmount;

        return new PriceCalculationResultDto
        {
            CheckInDate = checkIn,
            CheckOutDate = checkOut,
            NumberOfNights = numberOfNights,
            RoomBreakdowns = roomBreakdowns,
            SubTotal = subTotal,
            VoucherCode = appliedVoucherCode,
            VoucherId = voucherId,
            DiscountAmount = discountAmount,
            VoucherMessage = voucherMessage,
            SubTotalAfterDiscount = subTotalAfterDiscount,
            FeeRate = ServiceFeeRate,
            FeeAmount = feeAmount,
            TaxRate = VatTaxRate,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            PaymentMethod = string.IsNullOrWhiteSpace(paymentMethod) ? "Deposit" : paymentMethod,
            DepositPercentage = depositPercentage,
            DepositAmount = depositAmount,
            RemainingAmount = remainingAmount
        };
    }
}
