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
        var effectiveCustomerId = User.Identity?.IsAuthenticated == true ? TryGetUserId() : null;
        var result = await _pricingService.CalculatePriceAsync(request, effectiveCustomerId, ct);
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
    [RequirePermission(SystemPermissions.BookingSelfCreate)]
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
    [Authorize(Policy = AuthorizationPolicies.BookingRead)]
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
    /// Dòng thời gian của đơn: lịch sử trạng thái và các giao dịch thanh toán/hoàn tiền.
    /// Quyền xem giống chi tiết đơn (khách chỉ xem đơn của mình, nhân viên trong phân khu).
    /// </summary>
    [HttpGet("{id:long}/timeline")]
    [Authorize(Policy = AuthorizationPolicies.BookingRead)]
    public async Task<IActionResult> GetTimeline(
        long id,
        [FromServices] IPaymentRepository paymentRepository,
        [FromServices] HotelBooking.Infrastructure.Data.HotelBookingDBContext bookingDb,
        [FromServices] HotelBooking.Infrastructure.Persistence.HotelBookingDbContext coreDb,
        CancellationToken ct)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();
        var access = await _bookingService.GetBookingByIdAsync(id, currentUserId, isAdmin, isStaff);
        if (!access.Success) return StatusCode(StatusCodes.Status403Forbidden, access);

        var history = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToListAsync(
            bookingDb.BookingStatusHistory.Where(h => h.BookingId == id).OrderBy(h => h.ChangedAt), ct);
        var payments = (await paymentRepository.GetByBookingIdAsync(id) ?? []).OrderBy(p => p.PaidAt ?? p.CreatedAt).ToList();

        var internalView = isAdmin || isStaff;
        var actorIds = history.Where(h => h.ChangedByUserId.HasValue).Select(h => h.ChangedByUserId!.Value).Distinct().ToList();
        var actors = internalView && actorIds.Count > 0
            ? await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.ToDictionaryAsync(
                coreDb.Users.Where(u => actorIds.Contains(u.UserId)), u => u.UserId, u => u.FullName, ct)
            : new Dictionary<long, string>();

        string Actor(long? userId) => userId is null ? "Hệ thống"
            : userId == currentUserId ? (internalView ? actors.GetValueOrDefault(userId.Value, "Bạn") : "Bạn")
            : internalView ? actors.GetValueOrDefault(userId.Value, $"Người dùng #{userId}") : "Khách sạn";

        return Ok(new
        {
            success = true,
            data = new
            {
                statusHistory = history.Select(h => new { h.OldStatus, h.NewStatus, h.ChangedAt, changedBy = Actor(h.ChangedByUserId), h.Note }),
                payments = payments.Select(p => new
                {
                    p.PaymentId,
                    method = p.PaymentMethod.ToString(),
                    type = p.PaymentType.ToString(),
                    p.Amount,
                    status = p.Status.ToString(),
                    p.TransactionCode,
                    p.PaidAt,
                    p.CreatedAt
                })
            }
        });
    }

    /// <summary>
    /// Tra cứu đơn đặt phòng theo mã BookingCode (Chống IDOR & Phân quyền Staff/Admin)
    /// </summary>
    [HttpGet("code/{code}")]
    [Authorize(Policy = AuthorizationPolicies.BookingRead)]
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
    [Authorize(Policy = AuthorizationPolicies.BookingRead)]
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
    [Authorize(Policy = AuthorizationPolicies.BookingCancel)]
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
    [Authorize(Policy = AuthorizationPolicies.BookingCancel)]
    public async Task<IActionResult> CancelBooking(long id, [FromBody] CancelBookingRequest request)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();
        // Lễ tân có quyền quản lý đặt phòng được hủy đơn của khách (service kiểm tra phân khu được giao).
        var isStaffManager = isStaff && User.HasClaim(PermissionAuthorization.ClaimType, SystemPermissions.BookingManage);

        var result = await _bookingService.CancelBookingAsync(id, currentUserId, isAdmin, request, isStaffManager);
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
    [RequirePermission(SystemPermissions.BookingManage)]
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

    /// <summary>
    /// Đổi ngày lưu trú / đổi phòng (Khách hàng cho đơn của mình, hoặc Nhân viên / Admin)
    /// </summary>
    [HttpPost("{id:long}/preview-reschedule")]
    [Authorize]
    public async Task<IActionResult> PreviewReschedule(long id, [FromBody] RescheduleBookingRequest request)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();
        var result = await _bookingService.PreviewRescheduleAsync(id, currentUserId, isAdmin, isStaff, request);
        return result.Success ? Ok(result) : BadRequest(result);
    }

    [HttpPost("{id:long}/reschedule")]
    [Authorize]
    public async Task<IActionResult> RescheduleBooking(long id, [FromBody] RescheduleBookingRequest request)
    {
        var (currentUserId, isAdmin, isStaff) = GetUserContext();

        var result = await _bookingService.RescheduleBookingAsync(id, currentUserId, isAdmin, isStaff, request);
        if (!result.Success)
        {
            return BadRequest(result);
        }

        return Ok(result);
    }

    /// <summary>
    /// Đánh dấu khách vắng mặt (No-Show) - Lễ tân / Quản trị viên
    /// </summary>
    [HttpPost("{id:long}/no-show")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    [RequirePermission(SystemPermissions.BookingManage)]
    public async Task<IActionResult> MarkNoShow(long id, [FromBody] NoShowRequest request)
    {
        var (staffUserId, isAdmin, isStaff) = GetUserContext();

        if (!isAdmin && !isStaff)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = "Chỉ Nhân viên hoặc Quản trị viên mới có quyền đánh dấu No-Show." });
        }

        var result = await _bookingService.MarkNoShowAsync(id, staffUserId, isAdmin, request);
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

        // Never substitute another account when a JWT is malformed or incomplete.
        throw new UnauthorizedAccessException("Authenticated account identifier is missing.");
    }

    private long? TryGetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub") ?? User.FindFirst("id");
        return claim is not null && long.TryParse(claim.Value, out var userId) ? userId : null;
    }
}
