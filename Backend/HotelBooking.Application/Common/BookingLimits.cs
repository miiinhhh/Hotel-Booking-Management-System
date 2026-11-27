namespace HotelBooking.Application.Common;

/// <summary>
/// Giới hạn chống giữ phòng hàng loạt, cấu hình ở mục "BookingLimits" của appsettings.
/// Chỉ giới hạn đơn GIỮ PHÒNG MÀ CHƯA TRẢ TIỀN; đơn đã đặt cọc/thanh toán không bị giới hạn.
/// Đặt một giá trị về 0 để tắt quy tắc đó.
/// </summary>
public sealed class BookingLimits
{
    public const string Section = "BookingLimits";

    /// <summary>Số đơn đang chờ thanh toán cọc (giữ phòng 15 phút) cùng lúc của một khách.</summary>
    public int MaxPendingHolds { get; set; } = 2;

    /// <summary>Số đơn "thanh toán tại khách sạn" chưa đến ngày nhận phòng của một khách.</summary>
    public int MaxPayAtHotelUpcoming { get; set; } = 2;

    /// <summary>Số phòng tối đa trong một đơn (đoàn lớn hơn liên hệ khách sạn).</summary>
    public int MaxRoomsPerBooking { get; set; } = 5;

    /// <summary>Từ số lần không đến (No-show) này trở lên, khách không được chọn thanh toán tại khách sạn.</summary>
    public int NoShowsToBlockPayAtHotel { get; set; } = 2;
}

/// <summary>Số liệu đơn của một khách để áp dụng <see cref="BookingLimits"/>.</summary>
public sealed record CustomerBookingStats(int ActiveHolds, int UpcomingPayAtHotel, int NoShows);
