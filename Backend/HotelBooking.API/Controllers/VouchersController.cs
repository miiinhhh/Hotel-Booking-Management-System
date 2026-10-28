using System.Security.Claims;
using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Voucher;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/vouchers")]
public class VouchersController : BaseAPIController
{
    private readonly IVoucherService _voucherService;

    public VouchersController(IVoucherService voucherService)
    {
        _voucherService = voucherService;
    }

    /// <summary>
    /// Khách hàng kiểm tra mã voucher và nhận số tiền giảm dự kiến trước khi đặt phòng
    /// </summary>
    [HttpPost("validate")]
    [Authorize]
    public async Task<ActionResult<ValidateVoucherResponse>> ValidateVoucher(
        [FromBody] ValidateVoucherRequest request,
        CancellationToken ct)
    {
        var currentUserId = GetCurrentUserId();
        var result = await _voucherService.ValidateVoucherAsync(request, currentUserId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Danh sách mã voucher (Admin / Hotel Staff) có phân trang và bộ lọc
    /// </summary>
    [HttpGet]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.HotelStaff}")]
    public async Task<ActionResult<PagedResult<VoucherResponseDto>>> GetList(
        [FromQuery] VoucherFilterRequest filter,
        CancellationToken ct)
    {
        var result = await _voucherService.GetListAsync(filter, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết một mã voucher theo ID (Admin / Hotel Staff)
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize(Roles = $"{SystemRoles.Admin},{SystemRoles.HotelStaff}")]
    public async Task<ActionResult<VoucherResponseDto>> GetById(
        long id,
        CancellationToken ct)
    {
        try
        {
            var result = await _voucherService.GetByIdAsync(id, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Tạo mã voucher khuyến mãi mới (Admin)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<VoucherResponseDto>> Create(
        [FromBody] CreateVoucherRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _voucherService.CreateAsync(request, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.VoucherId }, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cập nhật thông tin mã voucher (Admin)
    /// </summary>
    [HttpPut("{id:long}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<ActionResult<VoucherResponseDto>> Update(
        long id,
        [FromBody] UpdateVoucherRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _voucherService.UpdateAsync(id, request, ct);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Bật / Tắt kích hoạt mã voucher (Admin)
    /// </summary>
    [HttpPatch("{id:long}/toggle-status")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> ToggleStatus(
        long id,
        CancellationToken ct)
    {
        try
        {
            var isActive = await _voucherService.ToggleStatusAsync(id, ct);
            return Ok(new { voucherId = id, isActive });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Ngừng kích hoạt / Soft delete mã voucher (Admin)
    /// </summary>
    [HttpDelete("{id:long}")]
    [Authorize(Roles = SystemRoles.Admin)]
    public async Task<IActionResult> Delete(
        long id,
        CancellationToken ct)
    {
        try
        {
            await _voucherService.DeleteAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
