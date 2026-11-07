namespace HotelBooking.API.Authentication;

public static class AuthorizationPolicies
{
    public const string CustomerOnly = "CustomerOnly";
    public const string CustomerOrAdmin = "CustomerOrAdmin";
    public const string StaffOrAdmin = "StaffOrAdmin";
    public const string AdminOnly = "AdminOnly";
    public const string BookingRead = "BookingRead";
    public const string BookingCancel = "BookingCancel";
    public const string PaymentRead = "PaymentRead";
}
