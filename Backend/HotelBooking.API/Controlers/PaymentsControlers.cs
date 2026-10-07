using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(
        IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    // POST: api/payments
    [HttpPost]
    public async Task<IActionResult> CreatePayment(
        [FromBody] CreatePaymentRequest request)
    {
        try
        {
            var result =
                await _paymentService.CreatePaymentAsync(request);

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
    [HttpGet("{id:Guid}")]
    public async Task<IActionResult> GetPayment(
        Guid id)
    {
        var result =
            await _paymentService.GetPaymentAsync(id);

        if (result == null)
        {
            return NotFound(new
            {
                message = "Payment not found."
            });
        }

        return Ok(result);
    }

    // GET: api/payments/booking/1
    [HttpGet("booking/{bookingId:Guid}")]
    public async Task<IActionResult> GetPaymentsByBooking(
        Guid bookingId)
    {
        var result =
            await _paymentService
                .GetPaymentsByBookingAsync(bookingId);

        return Ok(result);
    }

    // PUT: api/payments/1/confirm
    [HttpPut("{id:Guid}/confirm")]
    public async Task<IActionResult> ConfirmPayment(
        Guid id,
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
}