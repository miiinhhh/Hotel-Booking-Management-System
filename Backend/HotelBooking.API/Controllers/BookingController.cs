using System.Security.Claims;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.Interfaces;
using HotelBooking.API.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.Domain.Entities;

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
    /// Tính toán và xem trước chi tiết chi phí đặt phòng (Báo giá & áp dụng Voucher thời gian thực)
    /// </summary>
    [HttpPost("calculate-price")]
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
    /// Tạo đơn đặt phòng mới (Khách hàng)
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
        var result = await _bookingService.GetBookingByIdAsync(id, GetCurrentUserId(), CanManageAllBookings());
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tra cứu đơn đặt phòng theo mã BookingCode (Ví dụ: BK20261006123456789)
    /// </summary>
    [HttpGet("code/{bookingCode}")]
    [Authorize]
    public async Task<IActionResult> GetByCode(string bookingCode)
    {
        var result = await _bookingService.GetBookingByCodeAsync(bookingCode, GetCurrentUserId(), CanManageAllBookings());
        if (!result.Success)
        {
            return NotFound(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm và lọc danh sách đơn đặt phòng (Hỗ trợ phân trang, lọc theo khách hàng, ngày, trạng thái)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> GetList([FromQuery] BookingFilterRequest filter)
    {
        var result = await _bookingService.GetBookingsAsync(filter);
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

        var result = await _bookingService.CancelBookingAsync(id, currentUserId, User.IsInRole(SystemRoles.Admin), request);
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
