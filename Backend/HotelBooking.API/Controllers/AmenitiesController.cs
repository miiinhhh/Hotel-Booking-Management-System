using System.Security.Claims;
using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/amenities")]
public sealed class AmenitiesController(IPropertyContentService service) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AmenityDto>>> List(CancellationToken ct) => Ok(await service.ListAmenitiesAsync(ct));
    [HttpGet("{id:int:min(1)}")]
    public async Task<ActionResult<AmenityDto>> Get(int id, CancellationToken ct) => Ok(await service.GetAmenityAsync(id, ct));
    [HttpPost, Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<AmenityDto>> Create(AmenityRequest request, CancellationToken ct)
    {
        var result = await service.CreateAmenityAsync(Actor, request, ct);
        return CreatedAtAction(nameof(Get), new { id = result.AmenityId }, result);
    }
    [HttpPut("{id:int:min(1)}"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<AmenityDto>> Update(int id, AmenityRequest request, CancellationToken ct) =>
        Ok(await service.UpdateAmenityAsync(Actor, id, request, ct));
    [HttpDelete("{id:int:min(1)}"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    { await service.DeleteAmenityAsync(Actor, id, ct); return NoContent(); }
}

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/amenities")]
[Route("api/hotels/{hotelId:int:min(1)}/rooms/{roomId:long:min(1)}/amenities")]
public sealed class PropertyAmenitiesController(IPropertyContentService service) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AmenityDto>>> List(int hotelId, [FromRoute] long? roomId, CancellationToken ct) =>
        Ok(await service.LinkedAmenitiesAsync(new(hotelId, roomId), ct));
    [HttpPut("{amenityId:int:min(1)}"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Assign(int hotelId, [FromRoute] long? roomId, int amenityId, CancellationToken ct)
    { await service.SetAmenityAsync(Actor, new(hotelId, roomId), amenityId, true, ct); return NoContent(); }
    [HttpDelete("{amenityId:int:min(1)}"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Unassign(int hotelId, [FromRoute] long? roomId, int amenityId, CancellationToken ct)
    { await service.SetAmenityAsync(Actor, new(hotelId, roomId), amenityId, false, ct); return NoContent(); }
}
