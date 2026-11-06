using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;

namespace HotelBooking.Application.Interfaces;

public interface IBookingPricingService
{
    /// <summary>
    /// Tính toán và xem trước chi tiết giá (báo giá/quote) cho khách hàng trước khi đặt
    /// </summary>
    Task<ApiResponse<PriceCalculationResultDto>> CalculatePriceAsync(CalculatePriceRequest request, CancellationToken ct = default);

    /// <summary>
    /// Tính toán và xem trước chi tiết giá kèm định danh khách hàng để kiểm tra giới hạn lượt dùng voucher
    /// </summary>
    Task<ApiResponse<PriceCalculationResultDto>> CalculatePriceAsync(CalculatePriceRequest request, long? customerId, CancellationToken ct = default);

    /// <summary>
    /// Tính toán giá chuẩn có thẩm quyền từ cơ sở dữ liệu để phục vụ luồng tạo đơn đặt phòng (chống can thiệp giá từ client)
    /// </summary>
    Task<PriceCalculationResultDto> CalculateAuthoritativePriceAsync(
        DateOnly checkIn,
        DateOnly checkOut,
        IReadOnlyList<long> roomIds,
        string? voucherCode,
        string paymentMethod,
        CancellationToken ct = default);

    /// <summary>
    /// Tính toán giá chuẩn có thẩm quyền từ cơ sở dữ liệu kèm ID khách hàng để ràng buộc hạn mức voucher cá nhân
    /// </summary>
    Task<PriceCalculationResultDto> CalculateAuthoritativePriceAsync(
        DateOnly checkIn,
        DateOnly checkOut,
        IReadOnlyList<long> roomIds,
        string? voucherCode,
        string paymentMethod,
        long? customerId,
        CancellationToken ct = default);
}
