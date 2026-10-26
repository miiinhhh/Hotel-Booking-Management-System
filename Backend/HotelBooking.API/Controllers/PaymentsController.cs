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

    public PaymentsController(
        IPaymentService paymentService)
    {
        _paymentService = paymentService;
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
            return BadRequest(new
            {
                message = ex.Message
            });
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
