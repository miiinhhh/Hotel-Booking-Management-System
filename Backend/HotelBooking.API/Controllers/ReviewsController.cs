using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Reviews;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
public sealed class ReviewsController(ReviewService service, IStaffAreaAssignmentService assignments, ReviewAiService aiService, HotelBooking.API.Services.ReviewAiScanJobs aiJobs) : ControllerBase
{
    private long Actor => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>
    /// Admin kiểm duyệt mọi khách sạn; tài khoản khác (Staff được Admin bật quyền reviews.manage)
    /// chỉ kiểm duyệt khách sạn có khu vực mình đang được phân công.
    /// </summary>
    private async Task EnsureModerationScope(int hotelId, CancellationToken ct)
    {
        if (User.IsInRole(SystemRoles.Admin)) return;
        var mine = await assignments.GetMyAssignedAreasAsync(Actor, hotelId, ct);
        if (!mine.Success || mine.Data is null || !mine.Data.Any())
            throw new UnauthorizedAccessException("Bạn chỉ được kiểm duyệt đánh giá của khách sạn mình được phân công.");
    }

    [HttpPost("api/bookings/{bookingId:long:min(1)}/review")]
    [RequirePermission(SystemPermissions.ReviewSelfManage)]
    public async Task<ActionResult<ReviewDto>> Create(long bookingId, ReviewRequest request, CancellationToken ct)
    {
        var result = await service.Create(bookingId, Actor, request, ct);
        return CreatedAtAction(nameof(GetOwn), new { bookingId }, result);
    }
    [HttpGet("api/bookings/{bookingId:long:min(1)}/review")]
    [RequirePermission(SystemPermissions.ReviewSelfManage)]
    public async Task<ActionResult<ReviewDto>> GetOwn(long bookingId, CancellationToken ct) => Ok(await service.GetOwn(bookingId, Actor, ct));
    [HttpPut("api/bookings/{bookingId:long:min(1)}/review")]
    [RequirePermission(SystemPermissions.ReviewSelfManage)]
    public async Task<ActionResult<ReviewDto>> Edit(long bookingId, ReviewRequest request, CancellationToken ct) => Ok(await service.Edit(bookingId, Actor, request, ct));
    [HttpDelete("api/bookings/{bookingId:long:min(1)}/review")]
    [RequirePermission(SystemPermissions.ReviewSelfManage)]
    public async Task<IActionResult> DeleteOwn(long bookingId, CancellationToken ct) { await service.DeleteOwn(bookingId, Actor, ct); return NoContent(); }
    [HttpGet("api/me/reviews")]
    [RequirePermission(SystemPermissions.ReviewSelfManage)]
    public async Task<ActionResult<ReviewPage<ReviewDto>>> Mine(CancellationToken ct, int page = 1, int pageSize = 20) => Ok(await service.Mine(Actor, page, pageSize, ct));
    [HttpGet("api/hotels/{hotelId:int:min(1)}/reviews")]
    [AllowAnonymous]
    public async Task<ActionResult<ReviewPage<PublicReviewDto>>> Public(int hotelId, CancellationToken ct, int page = 1, int pageSize = 20) => Ok(await service.Public(hotelId, page, pageSize, ct));
    [HttpGet("api/hotels/{hotelId:int:min(1)}/rating")]
    [AllowAnonymous]
    public async Task<ActionResult<HotelRatingDto>> Rating(int hotelId, CancellationToken ct) => Ok(await service.Rating(hotelId, ct));
    [HttpGet("api/admin/hotels/{hotelId:int:min(1)}/reviews")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<ReviewPage<ReviewDto>>> Queue(int hotelId, CancellationToken ct, ReviewStatus? status = null, int page = 1, int pageSize = 20)
    { await EnsureModerationScope(hotelId, ct); return Ok(await service.ModerationList(hotelId, status, page, pageSize, ct)); }
    [HttpPatch("api/admin/hotels/{hotelId:int:min(1)}/reviews/{reviewId:long:min(1)}/moderation")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<ReviewDto>> Moderate(int hotelId, long reviewId, ModerateReviewRequest request, CancellationToken ct)
    { await EnsureModerationScope(hotelId, ct); return Ok(await service.Moderate(hotelId, reviewId, Actor, request, ct)); }
    [HttpGet("api/admin/hotels/{hotelId:int:min(1)}/reviews/{reviewId:long:min(1)}/history")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<IReadOnlyList<ReviewHistoryDto>>> History(int hotelId, long reviewId, CancellationToken ct)
    { await EnsureModerationScope(hotelId, ct); return Ok(await service.History(hotelId, reviewId, ct)); }

    // ===================== AI duyệt sơ bộ =====================
    /// <summary>Bắt đầu AI quét các đánh giá chờ duyệt (mới / vừa sửa) của khách sạn.</summary>
    [HttpPost("api/admin/hotels/{hotelId:int:min(1)}/reviews/ai-scan")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<HotelBooking.API.Services.AiScanStatus>> StartAiScan(int hotelId, CancellationToken ct)
    { await EnsureModerationScope(hotelId, ct); return Ok(await aiJobs.StartAsync(hotelId, Actor, ct)); }

    /// <summary>Tiến độ tác vụ AI quét.</summary>
    [HttpGet("api/admin/hotels/{hotelId:int:min(1)}/reviews/ai-scan/{jobId:guid}")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<HotelBooking.API.Services.AiScanStatus>> AiScanStatus(int hotelId, Guid jobId, CancellationToken ct)
    {
        await EnsureModerationScope(hotelId, ct);
        var status = aiJobs.Get(jobId);
        return status is null || status.HotelId != hotelId ? NotFound() : Ok(status);
    }

    /// <summary>Đề xuất AI chưa được xử lý của các đánh giá đang chờ duyệt.</summary>
    [HttpGet("api/admin/hotels/{hotelId:int:min(1)}/reviews/ai-suggestions")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<IReadOnlyList<AiReviewSuggestion>>> AiSuggestions(int hotelId, CancellationToken ct)
    { await EnsureModerationScope(hotelId, ct); return Ok(await aiService.Suggestions(hotelId, ct)); }

    /// <summary>Áp dụng hàng loạt đề xuất Hiển thị/Ẩn có độ tin cậy cao; đề xuất "Cần người xem" giữ nguyên.</summary>
    [HttpPost("api/admin/hotels/{hotelId:int:min(1)}/reviews/ai-apply")]
    [RequirePermission(SystemPermissions.ReviewsManage)]
    public async Task<ActionResult<AiApplyResult>> ApplyAi(int hotelId, AiApplyRequest request, CancellationToken ct)
    { await EnsureModerationScope(hotelId, ct); return Ok(await aiService.Apply(hotelId, Actor, request.MinConfidence, ct)); }
}
