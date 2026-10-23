using HotelBooking.Application.Areas;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/areas")]
public sealed class HotelAreasController(HotelAreaService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<HotelAreaDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<HotelAreaDto>>> List(
        int hotelId,
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default) =>
        Ok(await service.ListAsync(hotelId, includeInactive, cancellationToken));

    [HttpGet("{areaId:int:min(1)}")]
    [ProducesResponseType<HotelAreaDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HotelAreaDto>> Get(
        int hotelId,
        int areaId,
        CancellationToken cancellationToken) =>
        Ok(await service.GetAsync(hotelId, areaId, cancellationToken));

    [Authorize(Roles = SystemRoles.Admin)]
    [HttpPost]
    [ProducesResponseType<HotelAreaDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HotelAreaDto>> Create(
        int hotelId,
        [FromBody] HotelAreaRequest request,
        CancellationToken cancellationToken)
    {
        var result = await service.CreateAsync(hotelId, request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { hotelId, areaId = result.AreaId }, result);
    }

    [Authorize(Roles = SystemRoles.Admin)]
    [HttpPut("{areaId:int:min(1)}")]
    [ProducesResponseType<HotelAreaDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HotelAreaDto>> Update(
        int hotelId,
        int areaId,
        [FromBody] HotelAreaRequest request,
        CancellationToken cancellationToken) =>
        Ok(await service.UpdateAsync(hotelId, areaId, request, cancellationToken));

    [Authorize(Roles = SystemRoles.Admin)]
    [HttpDelete("{areaId:int:min(1)}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Deactivate(
        int hotelId,
        int areaId,
        CancellationToken cancellationToken)
    {
        await service.DeactivateAsync(hotelId, areaId, cancellationToken);
        return NoContent();
    }
}
