using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

public sealed class ImageUploadForm
{
    [Required] public IFormFile File { get; set; } = null!;
    [StringLength(255)] public string? AltText { get; set; }
    public bool IsPrimary { get; set; }
}

[ApiController]
[Route("api/hotels/{hotelId:int:min(1)}/images")]
[Route("api/hotels/{hotelId:int:min(1)}/rooms/{roomId:long:min(1)}/images")]
public sealed class PropertyImagesController(IPropertyContentService service) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ImageDto>>> List(int hotelId, [FromRoute] long? roomId, CancellationToken ct) =>
        Ok(await service.ImagesAsync(new(hotelId, roomId), ct));
    [HttpPost, Authorize(Roles = SystemRoles.Admin)]
    [RequestSizeLimit(6 * 1024 * 1024), RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<ImageDto>> Upload(int hotelId, [FromRoute] long? roomId,
        [FromForm] ImageUploadForm request, CancellationToken ct)
    {
        await using var stream = request.File.OpenReadStream();
        var image = await service.UploadAsync(Actor, new(hotelId, roomId),
            new(stream, request.File.FileName, request.File.ContentType, request.File.Length, request.AltText, request.IsPrimary), ct);
        return Created(image.Url, image);
    }
    [HttpGet("{imageId:long:min(1)}/content")]
    public async Task<IActionResult> Content(int hotelId, [FromRoute] long? roomId, long imageId, CancellationToken ct)
    {
        var file = await service.OpenImageAsync(new(hotelId, roomId), imageId, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Content, file.ContentType);
    }
    [HttpDelete("{imageId:long:min(1)}"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Delete(int hotelId, [FromRoute] long? roomId, long imageId, CancellationToken ct)
    { await service.DeleteImageAsync(Actor, new(hotelId, roomId), imageId, ct); return NoContent(); }
    [HttpPut("{imageId:long:min(1)}/primary"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Primary(int hotelId, [FromRoute] long? roomId, long imageId, CancellationToken ct)
    { await service.SelectPrimaryAsync(Actor, new(hotelId, roomId), imageId, ct); return NoContent(); }
    [HttpPut("order"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Order(int hotelId, [FromRoute] long? roomId, ImageOrderRequest request, CancellationToken ct)
    { await service.ReorderAsync(Actor, new(hotelId, roomId), request.ImageIds, ct); return NoContent(); }
}
