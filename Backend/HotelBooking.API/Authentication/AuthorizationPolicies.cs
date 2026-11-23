namespace HotelBooking.API.Authentication;

public static class AuthorizationPolicies
{
    public const string CustomerOnly = "CustomerOnly";
    public const string CustomerOrAdmin = "CustomerOrAdmin";
    public const string StaffOrAdmin = "StaffOrAdmin";
    public const string AdminOnly = "AdminOnly";
    public const string BookingRead = "BookingRead";
    /// <summary>Xem danh sách đơn ở cổng nội bộ: quyền đặt phòng HOẶC quyền thanh toán (VD vai trò Kế toán).</summary>
    public const string BookingOrPaymentView = "BookingOrPaymentView";
    public const string BookingCancel = "BookingCancel";
    public const string PaymentRead = "PaymentRead";
}
