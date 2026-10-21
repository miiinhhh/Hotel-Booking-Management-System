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
    /// Tính toán và báo giá chi tiết từng đêm cho các phòng lưu trú, kết hợp giá gốc, ngày tăng giá và phụ phí
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

    /// <summary>
    /// Lấy danh sách các quy tắc tăng giá theo ngày (PriceSurgeRules) có bộ lọc (Admin & HotelStaff)
    /// </summary>
    [HttpGet("surge-rules")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.HotelStaff}")]
    public async Task<ActionResult<IReadOnlyList<PriceSurgeRuleDto>>> GetSurgeRules(
        [FromQuery] PriceSurgeRuleFilterRequest filter,
        CancellationToken ct)
    {
        var result = await _pricingService.GetSurgeRulesAsync(filter, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết một quy tắc tăng giá theo ID (Admin & HotelStaff)
    /// </summary>
    [HttpGet("surge-rules/{id:long}")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.HotelStaff}")]
    public async Task<ActionResult<PriceSurgeRuleDto>> GetSurgeRuleById(
        long id,
        CancellationToken ct)
    {
        var rule = await _pricingService.GetSurgeRuleByIdAsync(id, ct);
        if (rule == null)
        {
            return NotFound(new { message = $"PriceSurgeRule with ID {id} was not found." });
        }

        return Ok(rule);
    }

    /// <summary>
    /// Tạo mới quy tắc tăng giá theo ngày (Admin)
    /// </summary>
    [HttpPost("surge-rules")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<PriceSurgeRuleDto>> CreateSurgeRule(
        [FromBody] CreatePriceSurgeRuleRequest request,
        CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new { message = "User is not authenticated." });
        }

        try
        {
            var result = await _pricingService.CreateSurgeRuleAsync(request, currentUserId.Value, ct);
            return CreatedAtAction(nameof(GetSurgeRuleById), new { id = result.RuleId }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật quy tắc tăng giá theo ngày (Admin)
    /// </summary>
    [HttpPut("surge-rules/{id:long}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<PriceSurgeRuleDto>> UpdateSurgeRule(
        long id,
        [FromBody] UpdatePriceSurgeRuleRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _pricingService.UpdateSurgeRuleAsync(id, request, ct);
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
    /// Bật/Tắt trạng thái hoạt động của quy tắc tăng giá (Admin)
    /// </summary>
    [HttpPatch("surge-rules/{id:long}/toggle")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<object>> ToggleSurgeRuleStatus(
        long id,
        CancellationToken ct)
    {
        try
        {
            var isActive = await _pricingService.ToggleSurgeRuleStatusAsync(id, ct);
            return Ok(new { ruleId = id, isActive });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa một quy tắc tăng giá (Admin)
    /// </summary>
    [HttpDelete("surge-rules/{id:long}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult> DeleteSurgeRule(
        long id,
        CancellationToken ct)
    {
        var deleted = await _pricingService.DeleteSurgeRuleAsync(id, ct);
        if (!deleted)
        {
            return NotFound(new { message = $"PriceSurgeRule with ID {id} was not found." });
        }

        return NoContent();
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
