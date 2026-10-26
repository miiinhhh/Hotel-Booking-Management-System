namespace HotelBooking.Domain.Entities;

public static class SystemRoles
{
    public const string Customer = "Customer";
    public const string HotelStaff = "Hotel Staff";
    public const string Admin = "Admin";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Customer,
        HotelStaff,
        Admin
    };
}
