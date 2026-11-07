namespace HotelBooking.Domain.Entities;

public static class SystemPermissions
{
    public const string ProfileSelfManage = "profile.self.manage";
    public const string BookingSelfCreate = "bookings.self.create";
    public const string BookingSelfView = "bookings.self.view";
    public const string BookingSelfCancel = "bookings.self.cancel";
    public const string PaymentSelfManage = "payments.self.manage";
    public const string ReviewSelfManage = "reviews.self.manage";
    public const string WishlistSelfManage = "wishlist.self.manage";
    public const string HotelManage = "hotels.manage";
    public const string AreaManage = "areas.manage";
    public const string RoomManage = "rooms.manage";
    public const string InventoryView = "inventory.view";
    public const string InventoryManage = "inventory.manage";
    public const string BookingView = "bookings.view";
    public const string BookingManage = "bookings.manage";
    public const string PaymentView = "payments.view";
    public const string PaymentManage = "payments.manage";
    public const string PricingView = "pricing.view";
    public const string PricingManage = "pricing.manage";
    public const string VoucherView = "vouchers.view";
    public const string VoucherManage = "vouchers.manage";
    public const string StaffView = "staff.view";
    public const string StaffManage = "staff.manage";
    public const string AccountsManage = "accounts.manage";
    public const string RolesManage = "roles.manage";
    public const string ReviewsManage = "reviews.manage";
    public const string ContentManage = "content.manage";
    public const string PoliciesManage = "policies.manage";
    public const string ReportsView = "reports.view";

    public static readonly IReadOnlyCollection<string> All =
    [
        ProfileSelfManage, BookingSelfCreate, BookingSelfView, BookingSelfCancel,
        PaymentSelfManage, ReviewSelfManage, WishlistSelfManage,
        HotelManage, AreaManage, RoomManage, InventoryView, InventoryManage,
        BookingView, BookingManage, PaymentView, PaymentManage, PricingView,
        PricingManage, VoucherView, VoucherManage, StaffView, StaffManage,
        AccountsManage, RolesManage, ReviewsManage, ContentManage, PoliciesManage, ReportsView
    ];

    public static readonly IReadOnlyCollection<string> DefaultStaff =
    [ProfileSelfManage, InventoryView, InventoryManage, BookingView, BookingManage, PaymentView,
        PaymentManage, PricingView, StaffView, PoliciesManage];

    public static readonly IReadOnlyCollection<string> DefaultCustomer =
    [ProfileSelfManage, BookingSelfCreate, BookingSelfView, BookingSelfCancel,
        PaymentSelfManage, ReviewSelfManage, WishlistSelfManage];

    public static readonly IReadOnlyCollection<string> DefaultAdmin = All.Where(code => code is not
        BookingSelfCreate and not BookingSelfView and not BookingSelfCancel and not
        PaymentSelfManage and not ReviewSelfManage and not WishlistSelfManage).ToArray();
}

