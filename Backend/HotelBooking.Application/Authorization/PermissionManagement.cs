using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.Authorization;

public sealed record PermissionResponse(int PermissionId, string Code, string Name, string Group, string? Description);
public sealed record RoleResponse(int RoleId, string Name, string? Description, bool IsSystem, bool IsActive, int UserCount, string[] Permissions);
public sealed record UserRolesResponse(long UserId, string FullName, string Email, string[] Roles);
public sealed record AdminUserResponse(long UserId, string FullName, string Email, string? Phone, DateOnly? DateOfBirth, bool IsActive, string[] Roles);
public sealed record UpdateAdminUserRequest([Required, StringLength(150, MinimumLength = 2)] string FullName, [Phone, StringLength(20)] string? Phone, DateOnly? DateOfBirth);
public sealed record SetAccountStatusRequest([Required] bool? IsActive);
public sealed record CreateRoleRequest([Required, StringLength(50, MinimumLength = 2)] string Name, [StringLength(255)] string? Description);
public sealed record UpdateRoleRequest([Required, StringLength(50, MinimumLength = 2)] string Name, [StringLength(255)] string? Description, bool IsActive);
public sealed record SetRolePermissionsRequest([Required] string[] PermissionCodes);
public sealed record SetUserRolesRequest([Required, MinLength(1)] int[] RoleIds);

public interface IPermissionManagementService
{
    Task<IReadOnlyList<PermissionResponse>> Permissions(CancellationToken ct);
    Task<IReadOnlyList<RoleResponse>> Roles(CancellationToken ct);
    Task<RoleResponse> Create(CreateRoleRequest request, CancellationToken ct);
    Task<RoleResponse> Update(int roleId, UpdateRoleRequest request, CancellationToken ct);
    Task<RoleResponse> SetPermissions(long actorId, int roleId, SetRolePermissionsRequest request, CancellationToken ct);
    Task Delete(int roleId, CancellationToken ct);
    Task<UserRolesResponse> GetUserRoles(long userId, CancellationToken ct);
    Task<UserRolesResponse> SetUserRoles(long actorId, long userId, SetUserRolesRequest request, CancellationToken ct);
    Task<IReadOnlyList<AdminUserResponse>> Users(CancellationToken ct);
    Task<AdminUserResponse> UpdateUser(long userId, UpdateAdminUserRequest request, CancellationToken ct);
    Task<AdminUserResponse> SetUserStatus(long actorId, long userId, bool active, CancellationToken ct);
}

