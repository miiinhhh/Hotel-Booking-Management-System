using HotelBooking.API.Authentication;
using HotelBooking.Application.DTOs.Cancellation;
using HotelBooking.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/cancellation-policies")]
public class CancellationPoliciesController : BaseAPIController
{
    private readonly ICancellationPolicyService _cancellationPolicyService;

    public CancellationPoliciesController(ICancellationPolicyService cancellationPolicyService)
    {
        _cancellationPolicyService = cancellationPolicyService;
    }

    /// <summary>
    /// Danh sách chính sách hủy phòng theo khách sạn
    /// </summary>
    [HttpGet("hotel/{hotelId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<CancellationPolicyDto>>> GetByHotelId(
        int hotelId,
        [FromQuery] bool activeOnly = true,
        CancellationToken ct = default)
    {
        var result = await _cancellationPolicyService.GetByHotelIdAsync(hotelId, activeOnly, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết chính sách hủy phòng theo ID
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<ActionResult<CancellationPolicyDto>> GetById(int id, CancellationToken ct = default)
    {
        var result = await _cancellationPolicyService.GetByIdAsync(id, ct);
        if (result == null)
        {
            return NotFound(new { message = $"Không tìm thấy chính sách hủy phòng với ID: {id}" });
        }
        return Ok(result);
    }

    /// <summary>
    /// Tạo mới chính sách hủy phòng (Admin / Staff)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<ActionResult<CancellationPolicyDto>> Create(
        [FromBody] CreateCancellationPolicyRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var created = await _cancellationPolicyService.CreatePolicyAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = created.CancellationPolicyId }, created);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật chính sách hủy phòng (Admin / Staff)
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<ActionResult<CancellationPolicyDto>> Update(
        int id,
        [FromBody] UpdateCancellationPolicyRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var updated = await _cancellationPolicyService.UpdatePolicyAsync(id, request, ct);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Xóa chính sách hủy phòng (Admin Only)
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct = default)
    {
        await _cancellationPolicyService.DeletePolicyAsync(id, ct);
        return NoContent();
    }
}
