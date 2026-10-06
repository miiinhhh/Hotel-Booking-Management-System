using System.ComponentModel.DataAnnotations;
using HotelBooking.Application.Hotels;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/hotels")]
public sealed class HotelsController(IHotelService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<HotelPage>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HotelPage>> GetAll(
        [FromQuery, Range(1, int.MaxValue)] int pageNumber = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20,
        CancellationToken cancellationToken = default) =>
        Ok(await service.GetPageAsync(pageNumber, pageSize, cancellationToken));

    [HttpGet("{hotelId:int}")]
    [ProducesResponseType<HotelResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HotelResponse>> GetById([Range(1, int.MaxValue)] int hotelId, CancellationToken cancellationToken) =>
        Ok(await service.GetByIdAsync(hotelId, cancellationToken));

    [HttpPost]
    [ProducesResponseType<HotelResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HotelResponse>> Create([FromBody] HotelRequest request, CancellationToken cancellationToken)
    {
        var hotel = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { hotelId = hotel.HotelId }, hotel);
    }

    [HttpPut("{hotelId:int}")]
    [ProducesResponseType<HotelResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<HotelResponse>> Update([Range(1, int.MaxValue)] int hotelId,
        [FromBody] HotelRequest request, CancellationToken cancellationToken) =>
        Ok(await service.UpdateAsync(hotelId, request, cancellationToken));

    [HttpDelete("{hotelId:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete([Range(1, int.MaxValue)] int hotelId, CancellationToken cancellationToken)
    {
        await service.DeleteAsync(hotelId, cancellationToken);
        return NoContent();
    }
}
