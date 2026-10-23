using HotelBooking.Application.Rooms;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Authentication;
using Microsoft.AspNetCore.Authorization;
namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/rooms")]
public sealed class RoomsController(RoomService service, IRoomSearchService searchService) : ControllerBase
{
    [HttpGet("search")]
    public async Task<ActionResult<RoomSearchResult>> Search(int hotelId,
        [FromQuery] RoomSearchRequest request, CancellationToken ct) =>
        Ok(await searchService.SearchAsync(hotelId, request, ct));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> List(int hotelId, CancellationToken ct) => Ok(await service.ListRooms(hotelId, ct));
    [HttpGet("{id:long:min(1)}")]
    public async Task<ActionResult<RoomDto>> Get(int hotelId, long id, CancellationToken ct) => Ok(await service.GetRoom(hotelId, id, ct));
    [HttpPost("~/api/hotels/{hotelId:int:min(1)}/areas/{areaId:int:min(1)}/rooms")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<RoomDto>> Create(int hotelId, int areaId, RoomRequest request, CancellationToken ct)
    {
        var result = await service.CreateRoom(hotelId, areaId, request, ct);
        return CreatedAtAction(nameof(Get), new { hotelId, id = result.RoomId }, result);
    }
    [HttpPut("{id:long:min(1)}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<RoomDto>> Update(int hotelId, long id, RoomRequest request, CancellationToken ct) => Ok(await service.UpdateRoom(hotelId, id, request, ct));
    [HttpDelete("{id:long:min(1)}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Delete(int hotelId, long id, CancellationToken ct) { await service.DeleteRoom(hotelId, id, ct); return NoContent(); }
}
