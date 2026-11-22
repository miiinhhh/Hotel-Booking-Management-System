namespace HotelBooking.Domain.Entities;

/// <summary>
/// Quy tắc vào cổng suy ra từ quyền (không cần cột "cổng" trong CSDL):
///  - Admin: có vai trò Admin.
///  - Nhân viên nội bộ: không phải Admin, và có vai trò Hotel Staff HOẶC có ít nhất một quyền nghiệp vụ
///    (mọi quyền không thuộc nhóm tự phục vụ "*.self.*"). Nhờ vậy Admin có thể tạo vai trò mới như
///    "Kế toán" chỉ gồm quyền thanh toán mà người được gán vẫn vào được cổng nhân viên.
///  - Khách hàng: phần còn lại.
/// </summary>
public static class PortalAccess
{
    /// <summary>Quyền nghiệp vụ nội bộ = mọi quyền hệ thống trừ nhóm tự phục vụ.</summary>
    public static readonly IReadOnlyCollection<string> InternalPermissions =
        SystemPermissions.All.Where(IsInternalPermission).ToArray();

    public static bool IsInternalPermission(string code) =>
        !code.Contains(".self.", StringComparison.OrdinalIgnoreCase)
        && SystemPermissions.All.Contains(code, StringComparer.OrdinalIgnoreCase);

    private static IEnumerable<Role> ActiveRoles(User user) => user.UserRoles.Select(x => x.Role).Where(r => r is not null && r.IsActive);

    public static bool IsAdmin(User user) => ActiveRoles(user).Any(r => r.RoleName == SystemRoles.Admin);

    public static bool HasInternalPermission(User user) => ActiveRoles(user)
        .SelectMany(r => r.RolePermissions)
        .Any(rp => rp.Permission is { IsActive: true } p && IsInternalPermission(p.PermissionCode));

    /// <summary>Nhân viên nội bộ (dùng cổng Staff).</summary>
    public static bool IsStaff(User user) =>
        !IsAdmin(user) && (ActiveRoles(user).Any(r => r.RoleName == SystemRoles.HotelStaff) || HasInternalPermission(user));

    /// <summary>
    /// Vai trò hiệu lực đưa vào token/phiên: thêm "Hotel Staff" cho nhân viên chỉ có vai trò tùy chỉnh,
    /// để các policy và màn hình dựa trên vai trò Hotel Staff hoạt động như với nhân viên thường.
    /// </summary>
    public static string[] EffectiveRoles(User user)
    {
        var roles = user.UserRoles.Where(x => x.Role is not null).Select(x => x.Role.RoleName).Distinct(StringComparer.Ordinal).ToList();
        if (IsStaff(user) && !roles.Contains(SystemRoles.HotelStaff, StringComparer.Ordinal)) roles.Add(SystemRoles.HotelStaff);
        return roles.ToArray();
    }
}
