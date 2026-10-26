using System.Globalization;
using System.Security.Claims;
using System.Text;
using HotelBooking.Application.DTOs;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
public sealed class DiscoveryController(DiscoveryService service) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet("api/discovery/hotels")]
    public async Task<ActionResult<DiscoveryPage>> Search([FromQuery] HotelDiscoveryRequest request, CancellationToken ct) =>
        Ok(await service.SearchAsync(request, ct));
    [HttpGet("api/discovery/hotels/{hotelId:int:min(1)}")]
    public async Task<ActionResult<HotelDiscoveryDetail>> Detail(int hotelId, [FromQuery] HotelDiscoveryRequest request, CancellationToken ct) =>
        Ok(await service.DetailAsync(hotelId, request, ct));
    [HttpPut("api/hotels/{hotelId:int:min(1)}/policy"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Policy(int hotelId, HotelPolicyRequest request, CancellationToken ct)
    { await service.SetPolicyAsync(Actor, hotelId, request, ct); return NoContent(); }
    [HttpGet("api/me/wishlist"), Authorize]
    public async Task<ActionResult<IReadOnlyList<HotelCardDto>>> Wishlist(CancellationToken ct) => Ok(await service.WishlistAsync(Actor, ct));
    [HttpPut("api/me/wishlist/{hotelId:int:min(1)}"), Authorize]
    public async Task<IActionResult> Save(int hotelId, CancellationToken ct)
    { await service.SetWishlistAsync(Actor, hotelId, true, ct); return NoContent(); }
    [HttpDelete("api/me/wishlist/{hotelId:int:min(1)}"), Authorize]
    public async Task<IActionResult> Remove(int hotelId, CancellationToken ct)
    { await service.SetWishlistAsync(Actor, hotelId, false, ct); return NoContent(); }
    [HttpGet("api/admin/reports/overview"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<BusinessReport>> Overview([FromQuery] ReportFilter filter, CancellationToken ct) =>
        Ok(await service.ReportAsync(Actor, filter, ct));
    [HttpGet("api/admin/reports/export"), Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Export([FromQuery] ReportFilter filter, CancellationToken ct)
    {
        var report = await service.ReportAsync(Actor, filter, ct);
        var csv = new StringBuilder("Date,Revenue,Bookings,OccupiedRoomNights,AvailableRoomNights\r\n");
        foreach (var day in report.Days)
            csv.AppendLine(string.Join(",", day.Date.ToString("yyyy-MM-dd"), day.Revenue.ToString(CultureInfo.InvariantCulture),
                day.Bookings.ToString(CultureInfo.InvariantCulture), day.OccupiedRoomNights.ToString(CultureInfo.InvariantCulture), day.AvailableRoomNights.ToString(CultureInfo.InvariantCulture)));
        return File(Encoding.UTF8.GetBytes(csv.ToString()), "text/csv; charset=utf-8", $"hotel-report-{filter.From:yyyyMMdd}-{filter.To:yyyyMMdd}.csv");
    }
}
