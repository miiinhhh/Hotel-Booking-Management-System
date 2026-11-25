using System.Globalization;

namespace HotelBooking.Application.Common;

/// <summary>
/// Định dạng số tiền trong nội dung tiếng Việt (ghi chú, thông báo) luôn theo vi-VN — "2.000.000" —
/// không phụ thuộc cài đặt vùng của máy chủ.
/// </summary>
public static class MoneyText
{
    private static readonly CultureInfo Vi = CultureInfo.GetCultureInfo("vi-VN");
    public static string Vnd(decimal amount) => amount.ToString("N0", Vi);
}
