using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/rooms")]
public sealed class RoomInventoryController(RoomInventoryService service) : ControllerBase
{
    [HttpGet("availability"), AllowAnonymous]
    public async Task<ActionResult<AvailabilityResult>> Available(int hotelId, [FromQuery] AvailabilityRequest request, CancellationToken ct) => Ok(await service.Available(hotelId, request, ct));
    [HttpPost("emergency-locks"), Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<ActionResult<IReadOnlyList<RoomLockDto>>> Create(int hotelId, CreateRoomLockRequest request, CancellationToken ct) => StatusCode(201, await service.CreateLocks(hotelId, request, Actor, User.IsInRole(SystemRoles.Admin), ct));
    [HttpGet("emergency-locks"), Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<ActionResult<IReadOnlyList<RoomLockDto>>> List(int hotelId, CancellationToken ct) => Ok(await service.ListLocks(hotelId, Actor, User.IsInRole(SystemRoles.Admin), ct));
    [HttpPatch("emergency-locks/{lockId:long:min(1)}/release"), Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<ActionResult<RoomLockDto>> Release(int hotelId, long lockId, CancellationToken ct) => Ok(await service.Release(hotelId, lockId, Actor, User.IsInRole(SystemRoles.Admin), ct));
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
