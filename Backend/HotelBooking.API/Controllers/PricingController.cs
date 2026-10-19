using System.Security.Claims;
using HotelBooking.Application.DTOs.Pricing;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/pricing")]
public class PricingController : BaseAPIController
{
    private readonly IPricingService _pricingService;

    public PricingController(IPricingService pricingService)
    {
        _pricingService = pricingService;
    }

    /// <summary>
    /// Tính toán và báo giá chi tiết từng đêm cho các phòng lưu trú, bao gồm phụ phí check-in sớm / check-out muộn
    /// </summary>
    [HttpPost("calculate")]
    public async Task<ActionResult<PriceCalculationResultDto>> CalculatePrice(
        [FromBody] PriceCalculationRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _pricingService.CalculateStayPriceAsync(request, ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xem lịch sử và các cấu hình giá của một loại phòng (Admin & Staff)
    /// </summary>
    [HttpGet("~/api/hotels/{hotelId:int}/room-types/{roomTypeId:int}/prices")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.HotelStaff}")]
    public async Task<ActionResult<IReadOnlyList<RoomPriceHistoryDto>>> GetPriceHistories(
        int hotelId,
        int roomTypeId,
        CancellationToken ct)
    {
        var result = await _pricingService.GetPriceHistoriesAsync(roomTypeId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Tạo cấu hình giá mới theo khoảng thời gian cho một loại phòng (Admin)
    /// </summary>
    [HttpPost("~/api/hotels/{hotelId:int}/room-types/{roomTypeId:int}/prices")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<RoomPriceHistoryDto>> CreatePriceHistory(
        int hotelId,
        int roomTypeId,
        [FromBody] CreateRoomPriceHistoryRequest request,
        CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new { message = "User is not authenticated." });
        }

        try
        {
            var result = await _pricingService.AddPriceHistoryAsync(roomTypeId, request, currentUserId.Value, ct);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private long? GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (claim != null && long.TryParse(claim.Value, out var userId))
        {
            return userId;
        }

        return null;
    }
}
