using System.Security.Claims;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

public class BookingController : BaseAPIController
{
    private readonly IBookingService _bookingService;

    public BookingController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    /// <summary>
    /// Tạo đơn đặt phòng mới (Khách hàng)
    /// </summary>
    [HttpPost]
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
    public async Task<IActionResult> GetById(long id)
    {
        var result = await _bookingService.GetBookingByIdAsync(id);
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
    public async Task<IActionResult> GetByCode(string bookingCode)
    {
        var result = await _bookingService.GetBookingByCodeAsync(bookingCode);
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
    public async Task<IActionResult> GetList([FromQuery] BookingFilterRequest filter)
    {
        var result = await _bookingService.GetBookingsAsync(filter);
        return Ok(result);
    }

    /// <summary>
    /// Hủy đơn đặt phòng (Khách hàng hoặc Quản trị viên)
    /// </summary>
    [HttpPost("{id:long}/cancel")]
    public async Task<IActionResult> CancelBooking(long id, [FromBody] CancelBookingRequest request)
    {
        long currentUserId = GetCurrentUserId();

        var result = await _bookingService.CancelBookingAsync(id, currentUserId, request);
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

    // Helper: Lấy UserId từ JWT Claims (nếu chưa đăng nhập/chưa có Auth token thì tạm gán ID = 1 để dev/test)
    private long GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        if (claim != null && long.TryParse(claim.Value, out var userId))
        {
            return userId;
        }

        return 1; // Fallback cho môi trường dev khi các bạn chưa ghép JWT Auth
    }
}