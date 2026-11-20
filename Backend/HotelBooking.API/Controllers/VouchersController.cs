using System.Security.Claims;
using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Voucher;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Controllers;

/// <param name="UsedPercent">% lượt đã dùng (null nếu không giới hạn) — không lộ số lượt tuyệt đối.</param>
/// <param name="RemainingForMe">Số lần khách đang đăng nhập còn dùng được (null nếu chưa đăng nhập).</param>
public sealed record PublicVoucherDto(string Code, string VoucherType, decimal DiscountValue, decimal? MaxDiscountAmount,
    decimal MinimumOrderAmount, DateTime StartAt, DateTime EndAt, int UsageLimitPerCustomer, int? UsedPercent, int? RemainingForMe);
public sealed record MyVoucherUsageDto(string Code, string BookingCode, decimal DiscountApplied, DateTime UsedAt);

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
    /// Ưu đãi công khai cho trang "Ưu đãi" của khách: chỉ voucher đang bật, đã bắt đầu, chưa hết hạn, còn lượt.
    /// Chỉ trả các trường an toàn (không lộ số lượt tuyệt đối). Nếu khách đã đăng nhập, kèm số lượt mình còn dùng được.
    /// </summary>
    [HttpGet("available")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<PublicVoucherDto>>> GetAvailable(
        [FromServices] HotelBooking.Infrastructure.Data.HotelBookingDBContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var vouchers = await db.Vouchers.AsNoTracking()
            .Where(v => v.IsActive && v.StartAt <= now && v.EndAt > now && (v.UsageLimit == null || v.UsedCount < v.UsageLimit))
            .OrderBy(v => v.EndAt)
            .ToListAsync(ct);
        var used = new Dictionary<long, int>();
        if (long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId))
        {
            var ids = vouchers.Select(v => v.VoucherId).ToList();
            used = await db.VoucherUsages.AsNoTracking()
                .Where(u => u.CustomerId == customerId && ids.Contains(u.VoucherId))
                .GroupBy(u => u.VoucherId)
                .ToDictionaryAsync(g => g.Key, g => g.Count(), ct);
        }
        var loggedIn = customerId > 0;
        return Ok(vouchers.Select(v => new PublicVoucherDto(
            v.Code, v.VoucherType.ToString(), v.DiscountValue, v.MaxDiscountAmount, v.MinimumOrderAmount,
            v.StartAt, v.EndAt, v.UsageLimitPerCustomer,
            v.UsageLimit is > 0 ? (int)Math.Min(100, Math.Floor(v.UsedCount * 100m / v.UsageLimit.Value)) : null,
            loggedIn ? Math.Max(0, v.UsageLimitPerCustomer - used.GetValueOrDefault(v.VoucherId)) : null)).ToList());
    }

    /// <summary>Lịch sử dùng mã của chính khách hàng.</summary>
    [HttpGet("my-usages")]
    [Authorize]
    public async Task<ActionResult<IReadOnlyList<MyVoucherUsageDto>>> GetMyUsages(
        [FromServices] HotelBooking.Infrastructure.Data.HotelBookingDBContext db, CancellationToken ct)
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var customerId)) return Unauthorized();
        var items = await db.VoucherUsages.AsNoTracking()
            .Where(u => u.CustomerId == customerId)
            .OrderByDescending(u => u.UsedAt).Take(50)
            .Select(u => new MyVoucherUsageDto(u.Voucher.Code, u.Booking.BookingCode, u.DiscountApplied, u.UsedAt))
            .ToListAsync(ct);
        return Ok(items);
    }

    /// <summary>
    /// Danh sách mã voucher (Admin / Hotel Staff) có phân trang và bộ lọc
    /// </summary>
    [HttpGet]
    [RequirePermission(SystemPermissions.VoucherView)]
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
    [RequirePermission(SystemPermissions.VoucherView)]
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
    [RequirePermission(SystemPermissions.VoucherManage)]
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
    [RequirePermission(SystemPermissions.VoucherManage)]
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
    [RequirePermission(SystemPermissions.VoucherManage)]
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
    [RequirePermission(SystemPermissions.VoucherManage)]
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
