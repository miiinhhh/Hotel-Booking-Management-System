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
    /// Tạo đơn đặt phòng mới (Khách hàng) - Lấy CustomerId từ JWT Claims để chống IDOR
    /// </summary>
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<IActionResult> CreateBooking([FromBody] CreateBookingRequest request)
    {
        var (currentUserId, _, _) = GetUserContext();

        var result = await _bookingService.CreateBookingAsync(currentUserId, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.BookingId }, result);
    }

    /// <summary>
    /// Lấy chi tiết đơn đặt phòng theo ID (Chống IDOR & Phân quyền Staff/Admin)
    /// </summary>
    [HttpGet("{id:long}")]
    [Authorize]
    public async Task<IActionResult> GetById(long id)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();

        var result = await _bookingService.GetBookingByIdAsync(id, currentUserId, isAdmin, isStaff);
        if (!result.Success)
        {
            return StatusCode(StatusCodes.Status403Forbidden, result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tra cứu đơn đặt phòng theo mã BookingCode (Chống IDOR & Phân quyền Staff/Admin)
    /// </summary>
    [HttpGet("code/{code}")]
    [Authorize]
    public async Task<IActionResult> GetByCode(string code)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();

        var result = await _bookingService.GetBookingByCodeAsync(code, currentUserId, isAdmin, isStaff);
        if (!result.Success)
        {
            return StatusCode(StatusCodes.Status403Forbidden, result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Tìm kiếm và lọc danh sách đơn đặt phòng (Khách hàng chỉ xem đơn của mình; Staff chỉ xem đơn thuộc Phân khu phụ trách; Admin toàn quyền)
    /// </summary>
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> GetList([FromQuery] BookingFilterRequest filter)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();

        var result = await _bookingService.GetBookingsAsync(filter, currentUserId, isAdmin, isStaff);
        return Ok(result);
    }

    /// <summary>
    /// Xem trước chi tiết hoàn hủy phòng (Khách hàng hoặc Quản trị viên)
    /// </summary>
    [HttpGet("{id:long}/preview-cancel")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOrAdmin)]
    public async Task<IActionResult> PreviewCancelBooking(long id)
    {
        var (currentUserId, isAdmin, _) = GetUserContext();

        var result = await _bookingService.PreviewCancelBookingAsync(id, currentUserId, isAdmin);
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
        var (currentUserId, isAdmin, _) = GetUserContext();

        var result = await _bookingService.CancelBookingAsync(id, currentUserId, isAdmin, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Cập nhật trạng thái đơn đặt phòng (Check-in, Check-out, Hoàn tất - dành cho Lễ tân theo phân khu / Admin)
    /// </summary>
    [HttpPatch("{id:long}/status")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateBookingRequest request)
    {
        var (staffUserId, isAdmin, isStaff) = GetUserContext();

        if (!isAdmin && !isStaff)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Chỉ Nhân viên hoặc Quản trị viên mới có quyền cập nhật trạng thái đơn đặt phòng." });
        }

        var result = await _bookingService.UpdateBookingStatusAsync(id, staffUserId, isAdmin, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    // Helper: Trích xuất danh tính và vai trò người dùng từ JWT Claims
    private (long UserId, bool IsAdmin, bool IsStaff) GetUserContext()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (claim != null && long.TryParse(claim.Value, out var userId))
        {
            bool isAdmin = User.IsInRole(SystemRoles.Admin) || User.IsInRole("Admin");
            bool isStaff = User.IsInRole(SystemRoles.HotelStaff) || User.IsInRole("HotelStaff") || User.IsInRole("Staff");
            return (userId, isAdmin, isStaff);
        }

        // Fallback linh hoạt cho dev/test khi chưa truyền JWT
        return (1, true, true);
    }

    private long GetCurrentUserId() => GetUserContext().UserId;
}
