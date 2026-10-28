using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.DTOs.Cancellation;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[Route("api/[controller]")]
[Route("api/bookings")]
public class BookingController : BaseAPIController
{
    private readonly IBookingService _bookingService;
    private readonly IBookingPricingService _pricingService;

    public BookingController(
        IBookingService bookingService,
        IBookingPricingService pricingService)
    {
        _bookingService = bookingService;
        _pricingService = pricingService;
    }

    /// <summary>
    /// Tính toán và xem trước giá đặt phòng
    /// </summary>
    [HttpPost("calculate-price")]
    [AllowAnonymous]
    public async Task<IActionResult> CalculatePrice([FromBody] CalculatePriceRequest request, CancellationToken ct)
    {
        var result = await _pricingService.CalculatePriceAsync(request, ct);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đặt phòng mới (Dành cho khách hàng đã đăng nhập)
    /// </summary>
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        long customerId = GetCurrentUserId();

        var result = await _bookingService.CreateBookingAsync(customerId, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.BookingId }, result);
    }

    /// <summary>
    /// Lấy chi tiết đơn đặt phòng theo ID
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize]
    public async Task<IActionResult> GetById(long id)
    {
        long currentUserId = GetCurrentUserId();

        var result = await _bookingService.GetBookingByIdAsync(id, currentUserId, CanManageAllBookings());
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy chi tiết đơn đặt phòng theo mã BookingCode
    /// </summary>
    [HttpGet("code/{code}")]
    [Authorize]
    public async Task<IActionResult> GetByCode(string code)
    {
        long currentUserId = GetCurrentUserId();

        var result = await _bookingService.GetBookingByCodeAsync(code, currentUserId, CanManageAllBookings());
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách đơn đặt phòng có phân trang và bộ lọc (Dành cho Lễ tân/Admin)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> GetList([FromQuery] BookingFilterRequest filter)
    {
        var result = await _bookingService.GetBookingsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Xem trước chi tiết hoàn hủy phòng (Khách hàng hoặc Quản trị viên)
    /// </summary>
    [HttpGet("{id:long}/preview-cancel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrAdmin)]
    public async Task<IActionResult> PreviewCancelBooking(long id)
    {
        long currentUserId = GetCurrentUserId();

        var result = await _bookingService.PreviewCancelBookingAsync(id, currentUserId, CanManageAllBookings());
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Hủy đơn đặt phòng (Khách hàng hoặc Quản trị viên)
    /// </summary>
    [HttpPost("{id:long}/cancel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrAdmin)]
    public async Task<IActionResult> CancelBooking(long id, [FromBody] CancelBookingRequest request)
    {
        long currentUserId = GetCurrentUserId();

        var result = await _bookingService.CancelBookingAsync(id, currentUserId, CanManageAllBookings(), request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái đơn đặt phòng (Check-in, Check-out, Hoàn tất - dành cho Lễ tân/Admin)
    /// </summary>
    [HttpPatch("{id:long}/status")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateBookingRequest request)
    {
        long staffUserId = GetCurrentUserId();

        var result = await _bookingService.UpdateBookingStatusAsync(id, staffUserId, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    private long GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (claim != null && long.TryParse(claim.Value, out var userId))
        {
            return userId;
        }

        throw new InvalidOperationException("The authenticated token does not contain a valid user identifier.");
    }

    private bool CanManageAllBookings() =>
        User.IsInRole(SystemRoles.Admin) || User.IsInRole(SystemRoles.HotelStaff);
}
