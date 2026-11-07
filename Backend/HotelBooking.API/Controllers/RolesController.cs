using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Authorization;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/admin")]
[RequirePermission(SystemPermissions.RolesManage)]
public sealed class RolesController(IPermissionManagementService service) : ControllerBase
{
    private long ActorId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("permissions")]
    public async Task<ActionResult<IReadOnlyList<PermissionResponse>>> Permissions(CancellationToken ct) => Ok(await service.Permissions(ct));
    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<RoleResponse>>> Roles(CancellationToken ct) => Ok(await service.Roles(ct));
    [HttpPost("roles")]
    public async Task<ActionResult<RoleResponse>> Create(CreateRoleRequest request, CancellationToken ct)
    {
        var result = await service.Create(request, ct);
        return CreatedAtAction(nameof(Roles), new { id = result.RoleId }, result);
    }
    [HttpPut("roles/{roleId:int:min(1)}")]
    public async Task<ActionResult<RoleResponse>> Update(int roleId, UpdateRoleRequest request, CancellationToken ct) => Ok(await service.Update(roleId, request, ct));
    [HttpPut("roles/{roleId:int:min(1)}/permissions")]
    public async Task<ActionResult<RoleResponse>> SetPermissions(int roleId, SetRolePermissionsRequest request, CancellationToken ct) => Ok(await service.SetPermissions(ActorId, roleId, request, ct));
    [HttpDelete("roles/{roleId:int:min(1)}")]
    public async Task<IActionResult> Delete(int roleId, CancellationToken ct) { await service.Delete(roleId, ct); return NoContent(); }
    [HttpGet("users/{userId:long:min(1)}/roles")]
    public async Task<ActionResult<UserRolesResponse>> UserRoles(long userId, CancellationToken ct) => Ok(await service.GetUserRoles(userId, ct));
    [HttpPut("users/{userId:long:min(1)}/roles")]
    public async Task<ActionResult<UserRolesResponse>> SetUserRoles(long userId, SetUserRolesRequest request, CancellationToken ct) => Ok(await service.SetUserRoles(ActorId, userId, request, ct));
}

