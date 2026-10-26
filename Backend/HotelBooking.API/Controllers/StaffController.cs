using System.Security.Claims;
using HotelBooking.Application.Staff;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Authentication;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/staff")]
[Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
public sealed class StaffController(StaffService service) : ControllerBase
{
    private long ActorId => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet]
    public async Task<ActionResult<StaffPage>> List(CancellationToken ct, int page = 1, int pageSize = 20) =>
        Ok(await service.List(ActorId, page, pageSize, ct));
    [HttpGet("{id:long:min(1)}")]
    public async Task<ActionResult<StaffResponse>> Get(long id, CancellationToken ct) => Ok(await service.Get(ActorId, id, ct));
    [HttpPut("{id:long:min(1)}")]
    public async Task<ActionResult<StaffResponse>> Update(long id, UpdateStaffRequest request, CancellationToken ct) =>
        Ok(await service.Update(ActorId, id, request, ct));
    [HttpPatch("{id:long:min(1)}/status")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<StaffResponse>> SetStatus(long id, StaffStatusRequest request, CancellationToken ct) =>
        Ok(await service.SetActive(ActorId, id, request.IsActive!.Value, ct));
}
