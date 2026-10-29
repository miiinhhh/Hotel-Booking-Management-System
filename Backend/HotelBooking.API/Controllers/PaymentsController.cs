using System.Security.Claims;
using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Authentication;

namespace HotelBooking.API.Controllers;

[Route("api/payments")]
public class PaymentsController : BaseAPIController
{
    private readonly IPaymentService _paymentService;
    private readonly IVnPayService _vnPayService;
    private readonly VnPaySettings _vnPaySettings;

    public PaymentsController(
        IPaymentService paymentService,
        IVnPayService vnPayService,
        VnPaySettings vnPaySettings)
    {
        _paymentService = paymentService;
        _vnPayService = vnPayService;
        _vnPaySettings = vnPaySettings;
    }

    // POST: api/payments
    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<IActionResult> CreatePayment(
        [FromBody] CreatePaymentRequest request)
    {
        try
        {
            var result =
                await _paymentService.CreatePaymentAsync(request, GetCurrentUserId()!.Value);

            return CreatedAtAction(
                nameof(GetPayment),
                new { id = result.PaymentId },
                result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET: api/payments/1
    [HttpGet("{id:long}")]
    [Authorize]
    public async Task<IActionResult> GetPayment(
        long id)
    {
        var result =
            await _paymentService.GetPaymentAsync(
                id,
                GetCurrentUserId()!.Value,
                User.IsInRole(SystemRoles.Admin) || User.IsInRole(SystemRoles.HotelStaff));

        if (result == null)
        {
            return NotFound(new
            {
                message = "Payment not found."
            });
        }

        return Ok(result);
    }

    // GET: api/payments/my-history?page=1&pageSize=10
    [HttpGet("my-history")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<IActionResult> GetMyPaymentHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        }

        try
        {
            var result = await _paymentService.GetMyPaymentHistoryAsync(
                userId.Value,
                page,
                pageSize);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET: api/bookings/{bookingId}/payments?page=1&pageSize=10
    // GET: api/payments/booking/{bookingId}?page=1&pageSize=10
    [HttpGet("~/api/bookings/{bookingId:long}/payments")]
    [HttpGet("booking/{bookingId:long}")]
    [Authorize]
    public async Task<IActionResult> GetPaymentsByBooking(
        long bookingId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        }

        bool isAdmin = User.IsInRole(SystemRoles.Admin);
        bool isStaff = User.IsInRole(SystemRoles.HotelStaff);

        try
        {
            var result = await _paymentService.GetBookingPaymentHistoryAsync(
                bookingId,
                userId.Value,
                isAdmin,
                isStaff,
                page,
                pageSize);

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
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, AuthenticationProblems.Forbidden(HttpContext, ex.Message));
        }
    }

    // GET: api/payments?page=1&pageSize=10
    [HttpGet]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> GetPaymentHistory(
        [FromQuery] PaymentHistoryFilterRequest filter)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        }

        bool isAdmin = User.IsInRole(SystemRoles.Admin);

        try
        {
            var result = await _paymentService.GetStaffPaymentHistoryAsync(
                filter,
                userId.Value,
                isAdmin);

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, AuthenticationProblems.Forbidden(HttpContext, ex.Message));
        }
    }

    // PUT: api/payments/1/confirm
    [HttpPut("{id:long}/confirm")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public async Task<IActionResult> ConfirmPayment(
        long id,
        [FromBody] ConfirmPaymentRequest request)
    {
        try
        {
            var result =
                await _paymentService
                    .ConfirmPaymentAsync(id, request);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "Payment not found."
                });
            }

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // ==========================================
    // TÍCH HỢP CỔNG THANH TOÁN VNPAY SANDBOX
    // ==========================================

    /// <summary>
    /// Khởi tạo giao dịch thanh toán cọc hoặc toàn phần qua cổng VNPay
    /// </summary>
    [HttpPost("vnpay/create-payment")]
    [Authorize(Policy = AuthorizationPolicies.CustomerOnly)]
    public async Task<IActionResult> CreateVnPayPayment(
        [FromBody] CreateVnPayPaymentRequest request,
        CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        }

        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

        try
        {
            var result = await _vnPayService.CreatePaymentUrlAsync(request, userId.Value, clientIp, ct);
            return Ok(new { success = true, data = result });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// Xử lý Return URL khi người dùng hoàn tất thanh toán trên VNPay và được redirect về trình duyệt
    /// Hỗ trợ route alias /api/orders/vnpay-return để tương thích với cấu hình trong .env
    /// </summary>
    [HttpGet("vnpay/return")]
    [HttpGet("~/api/orders/vnpay-return")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayReturn(CancellationToken ct)
    {
        var queryParams = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());
        var result = await _vnPayService.ProcessReturnCallbackAsync(queryParams, ct);

        // Nếu request yêu cầu JSON (API client / Postman test), trả JSON trực tiếp
        if (Request.Headers.Accept.ToString().Contains("application/json") || Request.Query.ContainsKey("json"))
        {
            return Ok(result);
        }

        // Với trình duyệt, chuyển hướng về trang kết quả Frontend kèm mã tham chiếu an toàn
        var frontendUrl = _vnPaySettings.FrontendReturnUrl;
        var redirectUrl = $"{frontendUrl}?bookingId={result.BookingId}&bookingCode={Uri.EscapeDataString(result.BookingCode)}&txnRef={Uri.EscapeDataString(result.TxnRef)}&status={result.Status}&success={result.Success.ToString().ToLowerInvariant()}";

        return Redirect(redirectUrl);
    }

    /// <summary>
    /// Webhook IPN nhận kết quả ngầm (Server-to-Server) có xác thực chữ ký từ máy chủ VNPay
    /// </summary>
    [HttpGet("vnpay/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn(CancellationToken ct)
    {
        var queryParams = Request.Query.ToDictionary(k => k.Key, v => v.Value.ToString());
        var ipnResponse = await _vnPayService.ProcessIpnAsync(queryParams, ct);

        return Ok(new
        {
            RspCode = ipnResponse.RspCode,
            Message = ipnResponse.Message
        });
    }

    /// <summary>
    /// Tra cứu trạng thái giao dịch thanh toán VNPay theo mã tham chiếu TxnRef (Dành cho Frontend xác minh)
    /// </summary>
    [HttpGet("vnpay/status/{txnRef}")]
    [Authorize]
    public async Task<IActionResult> GetVnPayStatus(string txnRef, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        }

        bool isAdmin = User.IsInRole(SystemRoles.Admin);
        bool isStaff = User.IsInRole(SystemRoles.HotelStaff);

        try
        {
            var result = await _vnPayService.GetPaymentStatusByTxnRefAsync(txnRef, userId.Value, isAdmin, isStaff, ct);
            if (result == null)
            {
                return NotFound(new { success = false, message = "Không tìm thấy giao dịch với mã tham chiếu này." });
            }

            return Ok(new { success = true, data = result });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { success = false, message = ex.Message });
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
