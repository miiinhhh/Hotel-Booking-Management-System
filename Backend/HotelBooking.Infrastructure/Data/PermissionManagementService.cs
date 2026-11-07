using HotelBooking.Application.Authorization;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public sealed class PermissionManagementService(HotelBookingDbContext db) : IPermissionManagementService
{
    public async Task<IReadOnlyList<PermissionResponse>> Permissions(CancellationToken ct) =>
        await db.Permissions.AsNoTracking().Where(x => x.IsActive)
            .OrderBy(x => x.PermissionGroup).ThenBy(x => x.PermissionName)
            .Select(x => new PermissionResponse(x.PermissionId, x.PermissionCode, x.PermissionName, x.PermissionGroup, x.Description))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<RoleResponse>> Roles(CancellationToken ct) =>
        (await QueryRoles().OrderByDescending(x => x.IsSystem).ThenBy(x => x.RoleName).ToListAsync(ct)).Select(Map).ToList();

    public async Task<RoleResponse> Create(CreateRoleRequest request, CancellationToken ct)
    {
        var name = NormalizeName(request.Name);
        if (await db.Roles.AnyAsync(x => x.RoleName == name, ct)) throw new ConflictException("Role name already exists.");
        var role = new Role { RoleName = name, Description = Clean(request.Description), IsActive = true, IsSystem = false };
        db.Roles.Add(role); await db.SaveChangesAsync(ct);
        return Map(role);
    }

    public async Task<RoleResponse> Update(int roleId, UpdateRoleRequest request, CancellationToken ct)
    {
        var role = await QueryRoles().SingleOrDefaultAsync(x => x.RoleId == roleId, ct) ?? throw new NotFoundException("Role not found.");
        var name = NormalizeName(request.Name);
        if (role.IsSystem && !string.Equals(role.RoleName, name, StringComparison.Ordinal))
            throw new ConflictException("System role names cannot be changed.");
        if (role.IsSystem && !request.IsActive) throw new ConflictException("System roles cannot be disabled.");
        if (await db.Roles.AnyAsync(x => x.RoleId != roleId && x.RoleName == name, ct)) throw new ConflictException("Role name already exists.");
        role.RoleName = name; role.Description = Clean(request.Description); role.IsActive = request.IsActive;
        await InvalidateRoleUsers(role.RoleId, ct);
        await db.SaveChangesAsync(ct); return Map(role);
    }

    public async Task<RoleResponse> SetPermissions(long actorId, int roleId, SetRolePermissionsRequest request, CancellationToken ct)
    {
        var role = await QueryRoles().SingleOrDefaultAsync(x => x.RoleId == roleId, ct) ?? throw new NotFoundException("Role not found.");
        if (role.RoleName == SystemRoles.Admin)
            throw new ConflictException("Permissions of the Admin system role are protected.");
        var requested = request.PermissionCodes.Select(x => x.Trim().ToLowerInvariant()).Where(x => x.Length > 0).Distinct().ToArray();
        if (role.RoleName == SystemRoles.Customer && requested.Any(code =>
                !SystemPermissions.DefaultCustomer.Contains(code, StringComparer.OrdinalIgnoreCase)))
            throw new ConflictException("Customer can only receive customer self-service permissions.");
        if (role.RoleName == SystemRoles.HotelStaff && requested.Any(code =>
                !SystemPermissions.DefaultStaff.Contains(code, StringComparer.OrdinalIgnoreCase)))
            throw new ConflictException("Hotel Staff can only receive staff operational permissions.");
        if (requested.Contains(SystemPermissions.RolesManage, StringComparer.OrdinalIgnoreCase) ||
            requested.Contains(SystemPermissions.AccountsManage, StringComparer.OrdinalIgnoreCase))
            throw new ConflictException("Account and role administration permissions are reserved for the protected Admin role.");
        var permissions = await db.Permissions.Where(x => x.IsActive && requested.Contains(x.PermissionCode)).ToListAsync(ct);
        if (permissions.Count != requested.Length) throw new NotFoundException("One or more permissions do not exist.");
        var actorCodes = await EffectivePermissions(actorId, ct);
        if (requested.Any(x => !actorCodes.Contains(x))) throw new UnauthorizedAccessException("You cannot grant a permission that you do not have.");

        db.RolePermissions.RemoveRange(role.RolePermissions);
        foreach (var permission in permissions)
            db.RolePermissions.Add(new RolePermission { RoleId = role.RoleId, PermissionId = permission.PermissionId, GrantedByUserId = actorId, GrantedAt = DateTime.UtcNow });
        await InvalidateRoleUsers(role.RoleId, ct);
        await db.SaveChangesAsync(ct);
        return Map(await QueryRoles().SingleAsync(x => x.RoleId == roleId, ct));
    }

    public async Task Delete(int roleId, CancellationToken ct)
    {
        var role = await db.Roles.Include(x => x.UserRoles).SingleOrDefaultAsync(x => x.RoleId == roleId, ct)
            ?? throw new NotFoundException("Role not found.");
        if (role.IsSystem) throw new ConflictException("System roles cannot be deleted.");
        if (role.UserRoles.Count != 0) throw new ConflictException("Remove this role from all users before deleting it.");
        db.Roles.Remove(role); await db.SaveChangesAsync(ct);
    }

    public async Task<UserRolesResponse> GetUserRoles(long userId, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.UserId == userId, ct) ?? throw new NotFoundException("User not found.");
        return Map(user);
    }

    public async Task<UserRolesResponse> SetUserRoles(long actorId, long userId, SetUserRolesRequest request, CancellationToken ct)
    {
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.UserId == userId, ct) ?? throw new NotFoundException("User not found.");
        var ids = request.RoleIds.Distinct().ToArray();
        var roles = await db.Roles.Where(x => ids.Contains(x.RoleId) && x.IsActive).ToListAsync(ct);
        if (roles.Count != ids.Length) throw new NotFoundException("One or more roles do not exist or are inactive.");
        if (user.UserRoles.Any(x => x.Role.RoleName == SystemRoles.HotelStaff) && roles.All(x => x.RoleName != SystemRoles.HotelStaff))
            throw new ConflictException("Hotel Staff is the protected base role for staff accounts and cannot be removed here.");
        if (userId == actorId && user.UserRoles.Any(x => x.Role.RoleName == SystemRoles.Admin) && roles.All(x => x.RoleName != SystemRoles.Admin))
            throw new ConflictException("You cannot remove your own Admin role.");
        var adminRoleId = await db.Roles.Where(x => x.RoleName == SystemRoles.Admin).Select(x => (int?)x.RoleId).SingleOrDefaultAsync(ct);
        if (adminRoleId.HasValue && user.UserRoles.Any(x => x.RoleId == adminRoleId) && roles.All(x => x.RoleId != adminRoleId))
        {
            var adminCount = await db.UserRoles.CountAsync(x => x.RoleId == adminRoleId, ct);
            if (adminCount <= 1) throw new ConflictException("The last Admin role assignment cannot be removed.");
        }
        db.UserRoles.RemoveRange(user.UserRoles);
        foreach (var role in roles) db.UserRoles.Add(new UserRole { UserId = userId, RoleId = role.RoleId, AssignedAt = DateTime.UtcNow });
        user.TokenVersion++;
        await db.SaveChangesAsync(ct);
        return await GetUserRoles(userId, ct);
    }

    public async Task<IReadOnlyList<AdminUserResponse>> Users(CancellationToken ct) =>
        (await db.Users.AsNoTracking().Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .OrderBy(x => x.UserId).ToListAsync(ct)).Select(MapAccount).ToList();

    public async Task<AdminUserResponse> UpdateUser(long userId, UpdateAdminUserRequest request, CancellationToken ct)
    {
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.UserId == userId, ct) ?? throw new NotFoundException("User not found.");
        var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        if (phone is not null && await db.Users.AnyAsync(x => x.UserId != userId && x.Phone == phone, ct))
            throw new ConflictException("Phone number is already in use.");
        if (request.DateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow)) throw new ConflictException("Date of birth cannot be in the future.");
        user.FullName = request.FullName.Trim(); user.Phone = phone;
        user.DateOfBirth = request.DateOfBirth?.ToDateTime(TimeOnly.MinValue); user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct); return MapAccount(user);
    }

    public async Task<AdminUserResponse> SetUserStatus(long actorId, long userId, bool active, CancellationToken ct)
    {
        var user = await db.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.UserId == userId, ct) ?? throw new NotFoundException("User not found.");
        if (actorId == userId && !active) throw new ConflictException("You cannot lock your own account.");
        if (!active && user.UserRoles.Any(x => x.Role.RoleName == SystemRoles.Admin))
        {
            var activeAdmins = await db.Users.CountAsync(x => x.IsActive && x.UserRoles.Any(r => r.Role.RoleName == SystemRoles.Admin), ct);
            if (activeAdmins <= 1) throw new ConflictException("The last active Admin account cannot be locked.");
        }
        if (user.IsActive != active) { user.IsActive = active; user.TokenVersion++; user.UpdatedAt = DateTime.UtcNow; await db.SaveChangesAsync(ct); }
        return MapAccount(user);
    }

    private IQueryable<Role> QueryRoles() => db.Roles.Include(x => x.UserRoles).Include(x => x.RolePermissions).ThenInclude(x => x.Permission);
    private async Task<HashSet<string>> EffectivePermissions(long userId, CancellationToken ct) =>
        (await db.UserRoles.Where(x => x.UserId == userId && x.Role.IsActive)
            .SelectMany(x => x.Role.RolePermissions).Where(x => x.Permission.IsActive)
            .Select(x => x.Permission.PermissionCode).Distinct().ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
    private async Task InvalidateRoleUsers(int roleId, CancellationToken ct) =>
        await db.Users.Where(x => x.UserRoles.Any(r => r.RoleId == roleId)).ExecuteUpdateAsync(x => x.SetProperty(u => u.TokenVersion, u => u.TokenVersion + 1), ct);
    private static RoleResponse Map(Role role) => new(role.RoleId, role.RoleName, role.Description, role.IsSystem, role.IsActive,
        role.UserRoles.Count, role.RolePermissions.Where(x => x.Permission.IsActive).Select(x => x.Permission.PermissionCode).Order().ToArray());
    private static UserRolesResponse Map(User user) => new(user.UserId, user.FullName, user.Email, user.UserRoles.Select(x => x.Role.RoleName).Order().ToArray());
    private static AdminUserResponse MapAccount(User user) => new(user.UserId, user.FullName, user.Email, user.Phone,
        user.DateOfBirth is { } date ? DateOnly.FromDateTime(date) : null, user.IsActive, user.UserRoles.Select(x => x.Role.RoleName).Order().ToArray());
    private static string NormalizeName(string value) => value.Trim();
    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}

