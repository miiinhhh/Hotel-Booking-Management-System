namespace HotelBooking.Domain.Entities;

/// <summary>
/// Trạng thái "đã đọc" của một thông báo theo tài khoản (đồng bộ giữa các thiết bị).
/// Thông báo được tổng hợp động từ dữ liệu nghiệp vụ nên chỉ cần lưu khóa (NotificationKey) đã đọc.
/// </summary>
public sealed class UserNotificationRead
{
    public long UserId { get; set; }
    public string NotificationKey { get; set; } = "";
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;
}
