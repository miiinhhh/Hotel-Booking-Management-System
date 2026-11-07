using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.Infrastructure.Data;

public static class RoleSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<HotelBookingDbContext>();
        var roles = new[]
        {
            (SystemRoles.Customer, "Hotel customer"),
            (SystemRoles.HotelStaff, "Hotel staff member"),
            (SystemRoles.Admin, "System administrator")
        };

        var existing = await db.Roles.Select(x => x.RoleName).ToListAsync();
        foreach (var (name, description) in roles.Where(x => !existing.Contains(x.Item1, StringComparer.OrdinalIgnoreCase)))
            db.Roles.Add(new Domain.Entities.Role { RoleName = name, Description = description, IsSystem = true, IsActive = true });

        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesAsync();

        var definitions = PermissionDefinitions.All;
        var catalogWasEmpty = !await db.Permissions.AnyAsync();
        var existingPermissions = await db.Permissions.ToDictionaryAsync(x => x.PermissionCode, StringComparer.OrdinalIgnoreCase);
        foreach (var definition in definitions)
        {
            if (existingPermissions.TryGetValue(definition.Code, out var permission))
            {
                permission.PermissionName = definition.Name;
                permission.PermissionGroup = definition.Group;
                permission.Description = definition.Description;
                permission.IsActive = true;
            }
            else
            {
                db.Permissions.Add(new Permission
                {
                    PermissionCode = definition.Code, PermissionName = definition.Name,
                    PermissionGroup = definition.Group, Description = definition.Description, IsActive = true
                });
            }
        }
        await db.SaveChangesAsync();

        // Defaults are bootstrap data only. Reapplying them on every startup would
        // silently undo permission changes made by an administrator.
        if (catalogWasEmpty)
        {
            var seededRoles = await db.Roles.Include(x => x.RolePermissions).ThenInclude(x => x.Permission)
                .Where(x => x.RoleName == SystemRoles.Admin || x.RoleName == SystemRoles.HotelStaff || x.RoleName == SystemRoles.Customer).ToListAsync();
            foreach (var role in seededRoles)
            {
                var defaults = role.RoleName switch
                {
                    SystemRoles.Admin => SystemPermissions.DefaultAdmin,
                    SystemRoles.Customer => SystemPermissions.DefaultCustomer,
                    _ => SystemPermissions.DefaultStaff
                };
                var assigned = role.RolePermissions.Select(x => x.Permission.PermissionCode).ToHashSet(StringComparer.OrdinalIgnoreCase);
                foreach (var code in defaults.Where(code => !assigned.Contains(code)))
                {
                    var permissionId = await db.Permissions.Where(x => x.PermissionCode == code).Select(x => x.PermissionId).SingleAsync();
                    db.RolePermissions.Add(new RolePermission { RoleId = role.RoleId, PermissionId = permissionId, GrantedAt = DateTime.UtcNow });
                }
            }
            await db.SaveChangesAsync();
        }
    }
}

public sealed record PermissionDefinition(string Code, string Name, string Group, string Description);

public static class PermissionDefinitions
{
    public static readonly IReadOnlyCollection<PermissionDefinition> All =
    [
        new(SystemPermissions.ProfileSelfManage, "Quản lý hồ sơ cá nhân", "Khách hàng", "Xem, sửa hồ sơ, avatar và mật khẩu của chính mình."),
        new(SystemPermissions.BookingSelfCreate, "Tạo đặt phòng", "Khách hàng", "Tạo đặt phòng cho chính tài khoản."),
        new(SystemPermissions.BookingSelfView, "Xem đặt phòng cá nhân", "Khách hàng", "Xem lịch sử và chi tiết đặt phòng của chính mình."),
        new(SystemPermissions.BookingSelfCancel, "Hủy đặt phòng cá nhân", "Khách hàng", "Xem trước và hủy đặt phòng của chính mình."),
        new(SystemPermissions.PaymentSelfManage, "Thanh toán cá nhân", "Khách hàng", "Tạo và xem thanh toán cho đặt phòng của chính mình."),
        new(SystemPermissions.ReviewSelfManage, "Quản lý đánh giá cá nhân", "Khách hàng", "Tạo, sửa, xem và xóa đánh giá của chính mình."),
        new(SystemPermissions.WishlistSelfManage, "Quản lý yêu thích", "Khách hàng", "Xem, thêm và gỡ khách sạn yêu thích."),
        new(SystemPermissions.HotelManage, "Quản lý khách sạn", "Khách sạn", "Tạo, sửa và ngừng hoạt động khách sạn."),
        new(SystemPermissions.AreaManage, "Quản lý phân khu", "Kho phòng", "Quản lý Zone và Building."),
        new(SystemPermissions.RoomManage, "Quản lý phòng", "Kho phòng", "Quản lý hạng phòng và phòng."),
        new(SystemPermissions.InventoryView, "Xem tình trạng phòng", "Kho phòng", "Xem tình trạng và lệnh khóa bán."),
        new(SystemPermissions.InventoryManage, "Vận hành kho phòng", "Kho phòng", "Khóa và mở bán phòng."),
        new(SystemPermissions.BookingView, "Xem đặt phòng", "Đặt phòng", "Xem danh sách đặt phòng trong phạm vi được giao."),
        new(SystemPermissions.BookingManage, "Xử lý đặt phòng", "Đặt phòng", "Cập nhật trạng thái và hủy đặt phòng."),
        new(SystemPermissions.PaymentView, "Xem thanh toán", "Thanh toán", "Xem giao dịch thanh toán."),
        new(SystemPermissions.PaymentManage, "Xác nhận thanh toán", "Thanh toán", "Xác nhận và xử lý thanh toán."),
        new(SystemPermissions.PricingView, "Xem giá", "Giá & khuyến mãi", "Xem lịch sử giá và quy tắc phụ thu."),
        new(SystemPermissions.PricingManage, "Quản lý giá", "Giá & khuyến mãi", "Cập nhật giá và quy tắc phụ thu."),
        new(SystemPermissions.VoucherView, "Xem voucher", "Giá & khuyến mãi", "Xem danh sách voucher."),
        new(SystemPermissions.VoucherManage, "Quản lý voucher", "Giá & khuyến mãi", "Tạo, sửa và ngừng voucher."),
        new(SystemPermissions.StaffView, "Xem nhân viên", "Nhân sự", "Xem nhân viên và phân công."),
        new(SystemPermissions.StaffManage, "Quản lý nhân viên", "Nhân sự", "Sửa, khóa và phân công nhân viên."),
        new(SystemPermissions.AccountsManage, "Quản trị tài khoản", "Bảo mật", "Xem, cập nhật, khóa và mở khóa tài khoản."),
        new(SystemPermissions.RolesManage, "Quản lý vai trò và quyền", "Bảo mật", "Tạo role, gán permission và gán role cho tài khoản."),
        new(SystemPermissions.ReviewsManage, "Kiểm duyệt đánh giá", "Nội dung", "Xem và kiểm duyệt đánh giá."),
        new(SystemPermissions.ContentManage, "Quản lý nội dung", "Nội dung", "Quản lý tiện ích và hình ảnh."),
        new(SystemPermissions.PoliciesManage, "Quản lý chính sách", "Vận hành", "Quản lý chính sách hủy và lưu trú."),
        new(SystemPermissions.ReportsView, "Xem báo cáo", "Báo cáo", "Xem và xuất báo cáo kinh doanh.")
    ];
}
