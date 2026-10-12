using HotelBooking.Application.Rooms;
using Microsoft.AspNetCore.Mvc;
namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/room-types")]
public sealed class RoomTypesController(RoomService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RoomTypeDto>>> List(int hotelId, CancellationToken ct) => Ok(await service.ListTypes(hotelId, ct));
    [HttpGet("{id:int:min(1)}")]
    public async Task<ActionResult<RoomTypeDto>> Get(int hotelId, int id, CancellationToken ct) => Ok(await service.GetType(hotelId, id, ct));
    [HttpPost("~/api/hotels/{hotelId:int:min(1)}/areas/{areaId:int:min(1)}/room-types")]
    public async Task<ActionResult<RoomTypeDto>> Create(int hotelId, int areaId, RoomTypeRequest request, CancellationToken ct)
    {
        var result = await service.CreateType(hotelId, areaId, request, ct);
        return CreatedAtAction(nameof(Get), new { hotelId, id = result.RoomTypeId }, result);
    }
    [HttpPut("{id:int:min(1)}")]
    public async Task<ActionResult<RoomTypeDto>> Update(int hotelId, int id, RoomTypeRequest request, CancellationToken ct) => Ok(await service.UpdateType(hotelId, id, request, ct));
    [HttpDelete("{id:int:min(1)}")]
    public async Task<IActionResult> Delete(int hotelId, int id, CancellationToken ct) { await service.DeleteType(hotelId, id, ct); return NoContent(); }
}
