using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Reviews;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
public sealed class ReviewsController(ReviewService service) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("api/bookings/{bookingId:long:min(1)}/review")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<ActionResult<ReviewDto>> Create(long bookingId, ReviewRequest request, CancellationToken ct)
    {
        var result = await service.Create(bookingId, Actor, request, ct);
        return CreatedAtAction(nameof(GetOwn), new { bookingId }, result);
    }
    [HttpGet("api/bookings/{bookingId:long:min(1)}/review")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<ActionResult<ReviewDto>> GetOwn(long bookingId, CancellationToken ct) => Ok(await service.GetOwn(bookingId, Actor, ct));
    [HttpPut("api/bookings/{bookingId:long:min(1)}/review")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<ActionResult<ReviewDto>> Edit(long bookingId, ReviewRequest request, CancellationToken ct) => Ok(await service.Edit(bookingId, Actor, request, ct));
    [HttpDelete("api/bookings/{bookingId:long:min(1)}/review")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<IActionResult> DeleteOwn(long bookingId, CancellationToken ct) { await service.DeleteOwn(bookingId, Actor, ct); return NoContent(); }
    [HttpGet("api/me/reviews")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<ActionResult<ReviewPage<ReviewDto>>> Mine(CancellationToken ct, int page = 1, int pageSize = 20) => Ok(await service.Mine(Actor, page, pageSize, ct));
    [HttpGet("api/hotels/{hotelId:int:min(1)}/reviews")]
    [AllowAnonymous]
    public async Task<ActionResult<ReviewPage<PublicReviewDto>>> Public(int hotelId, CancellationToken ct, int page = 1, int pageSize = 20) => Ok(await service.Public(hotelId, page, pageSize, ct));
    [HttpGet("api/hotels/{hotelId:int:min(1)}/rating")]
    [AllowAnonymous]
    public async Task<ActionResult<HotelRatingDto>> Rating(int hotelId, CancellationToken ct) => Ok(await service.Rating(hotelId, ct));
    [HttpGet("api/admin/hotels/{hotelId:int:min(1)}/reviews")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<ReviewPage<ReviewDto>>> Queue(int hotelId, CancellationToken ct, ReviewStatus? status = null, int page = 1, int pageSize = 20) => Ok(await service.ModerationList(hotelId, status, page, pageSize, ct));
    [HttpPatch("api/admin/hotels/{hotelId:int:min(1)}/reviews/{reviewId:long:min(1)}/moderation")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<ReviewDto>> Moderate(int hotelId, long reviewId, ModerateReviewRequest request, CancellationToken ct) => Ok(await service.Moderate(hotelId, reviewId, Actor, request, ct));
    [HttpGet("api/admin/hotels/{hotelId:int:min(1)}/reviews/{reviewId:long:min(1)}/history")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<ActionResult<IReadOnlyList<ReviewHistoryDto>>> History(int hotelId, long reviewId, CancellationToken ct) => Ok(await service.History(hotelId, reviewId, ct));
}
