using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;

namespace HotelBooking.Application.Services;

public class PaymentService : IPaymentService
{
    private readonly IPaymentRepository _paymentRepository;

    public PaymentService(
        IPaymentRepository paymentRepository)
    {
        _paymentRepository = paymentRepository;
    }

    public async Task<PaymentResponse> CreatePaymentAsync(
        CreatePaymentRequest request)
    {
        if (request.Amount <= 0)
        {
            throw new ArgumentException(
                "Payment amount must be greater than 0.");
        }

        var booking =
            await _paymentRepository.GetBookingPaymentInfoAsync(
                request.BookingId);

        if (booking == null)
        {
            throw new KeyNotFoundException(
                "Booking not found.");
        }

        if (booking.BookingStatus == "Cancelled")
        {
            throw new InvalidOperationException(
                "Cannot create payment for a cancelled booking.");
        }

        if (booking.BookingStatus == "Expired")
        {
            throw new InvalidOperationException(
                "Cannot create payment for an expired booking.");
        }

        if (request.PaymentType == PaymentType.Refund)
        {
            throw new InvalidOperationException(
                "Refund must be handled by refund workflow.");
        }

        var totalPaid =
            await _paymentRepository.GetTotalPaidAmountAsync(
                request.BookingId);

        var remainingAmount =
            booking.TotalAmount - totalPaid;

        if (remainingAmount <= 0)
        {
            throw new InvalidOperationException(
                "This booking has already been fully paid.");
        }

        if (request.Amount > remainingAmount)
        {
            throw new InvalidOperationException(
                $"Payment amount cannot exceed remaining amount: {remainingAmount:N0}.");
        }

        if (request.PaymentType == PaymentType.Deposit)
        {
            if (request.PaymentMethod != PaymentMethod.BankTransfer)
            {
                throw new InvalidOperationException(
                    "Deposit must be paid by bank transfer.");
            }
        }

        if (request.PaymentType == PaymentType.Payment &&
            request.PaymentMethod != PaymentMethod.BankTransfer &&
            request.PaymentMethod != PaymentMethod.Cash)
        {
            throw new InvalidOperationException(
                "Payment method is invalid.");
        }

        var payment = new Payment
        {
            BookingId = request.BookingId,
            PaymentMethod = request.PaymentMethod,
            PaymentType = request.PaymentType,
            Amount = request.Amount,

            // Payment is initially waiting for confirmation.
            Status = PaymentStatus.Pending,

            TransactionCode = request.TransactionCode,
            PaidAt = null,
            CreatedAt = DateTime.UtcNow
        };

        var paymentId =
            await _paymentRepository.CreateAsync(payment);

        var createdPayment =
            await _paymentRepository.GetByIdAsync(paymentId);

        if (createdPayment == null)
        {
            throw new InvalidOperationException(
                "Failed to create payment.");
        }

        return MapToResponse(createdPayment);
    }

    public async Task<PaymentResponse?> GetPaymentAsync(
        Guid paymentId)
    {
        var payment =
            await _paymentRepository.GetByIdAsync(paymentId);

        if (payment == null)
        {
            return null;
        }

        return MapToResponse(payment);
    }

    public async Task<IEnumerable<PaymentResponse>>
        GetPaymentsByBookingAsync(Guid bookingId)
    {
        var payments =
            await _paymentRepository.GetByBookingIdAsync(
                bookingId);

        return payments.Select(MapToResponse);
    }

    public async Task<PaymentResponse?> ConfirmPaymentAsync(
        Guid paymentId,
        ConfirmPaymentRequest request)
    {
        var payment =
            await _paymentRepository.GetByIdAsync(paymentId);

        if (payment == null)
        {
            return null;
        }

        if (payment.Status != PaymentStatus.Pending)
        {
            throw new InvalidOperationException(
                "Only pending payments can be confirmed.");
        }

        var booking =
            await _paymentRepository.GetBookingPaymentInfoAsync(
                payment.BookingId);

        if (booking == null)
        {
            throw new KeyNotFoundException(
                "Booking not found.");
        }

        if (!request.IsSuccessful)
        {
            await _paymentRepository.UpdateStatusAsync(
                paymentId,
                PaymentStatus.Failed.ToString(),
                null);

            var failedPayment =
                await _paymentRepository.GetByIdAsync(paymentId);

            return failedPayment == null
                ? null
                : MapToResponse(failedPayment);
        }

        var paidAt = DateTime.UtcNow;

        await _paymentRepository.UpdateStatusAsync(
            paymentId,
            PaymentStatus.Paid.ToString(),
            paidAt);

        var totalPaid =
            await _paymentRepository.GetTotalPaidAmountAsync(
                payment.BookingId);

        await _paymentRepository
            .UpdateBookingPaymentSummaryAsync(
                payment.BookingId,
                totalPaid,
                booking.TotalAmount);

        var confirmedPayment =
            await _paymentRepository.GetByIdAsync(paymentId);

        return confirmedPayment == null
            ? null
            : MapToResponse(confirmedPayment);
    }

    private static PaymentResponse MapToResponse(
        Payment payment)
    {
        return new PaymentResponse
        {
            PaymentId = payment.PaymentId,
            BookingId = payment.BookingId,
            PaymentMethod = payment.PaymentMethod,
            PaymentType = payment.PaymentType,
            Amount = payment.Amount,
            Status = payment.Status,
            TransactionCode = payment.TransactionCode,
            PaidAt = payment.PaidAt,
            CreatedAt = payment.CreatedAt
        };
    }
}