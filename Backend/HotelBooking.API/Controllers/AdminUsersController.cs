using System.Security.Claims;
using HotelBooking.Application.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/admin/users")]
[RequirePermission(SystemPermissions.AccountsManage)]
public sealed class AdminUsersController(IPermissionManagementService service) : ControllerBase
{
    private long ActorId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserResponse>>> List(CancellationToken ct) => Ok(await service.Users(ct));

    [HttpPut("{userId:long:min(1)}")]
    public async Task<ActionResult<AdminUserResponse>> Update(long userId, UpdateAdminUserRequest request, CancellationToken ct) =>
        Ok(await service.UpdateUser(userId, request, ct));

    [HttpPatch("{userId:long:min(1)}/status")]
    public async Task<ActionResult<AdminUserResponse>> SetStatus(long userId, SetAccountStatusRequest request, CancellationToken ct) =>
        Ok(await service.SetUserStatus(ActorId, userId, request.IsActive!.Value, ct));
}
