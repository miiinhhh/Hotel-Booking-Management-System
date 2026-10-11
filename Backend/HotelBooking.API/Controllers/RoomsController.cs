using HotelBooking.Application.Rooms;
using Microsoft.AspNetCore.Mvc;
namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/rooms")]
public sealed class RoomsController(RoomService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomDto>>> List(int hotelId, CancellationToken ct) => Ok(await service.ListRooms(hotelId, ct));
    [HttpGet("{id:long:min(1)}")]
    public async Task<ActionResult<RoomDto>> Get(int hotelId, long id, CancellationToken ct) => Ok(await service.GetRoom(hotelId, id, ct));
    [HttpPost("~/api/hotels/{hotelId:int:min(1)}/areas/{areaId:int:min(1)}/rooms")]
    public async Task<ActionResult<RoomDto>> Create(int hotelId, int areaId, RoomRequest request, CancellationToken ct)
    {
        var result = await service.CreateRoom(hotelId, areaId, request, ct);
        return CreatedAtAction(nameof(Get), new { hotelId, id = result.RoomId }, result);
    }
    [HttpPut("{id:long:min(1)}")]
    public async Task<ActionResult<RoomDto>> Update(int hotelId, long id, RoomRequest request, CancellationToken ct) => Ok(await service.UpdateRoom(hotelId, id, request, ct));
    [HttpDelete("{id:long:min(1)}")]
    public async Task<IActionResult> Delete(int hotelId, long id, CancellationToken ct) { await service.DeleteRoom(hotelId, id, ct); return NoContent(); }
}
