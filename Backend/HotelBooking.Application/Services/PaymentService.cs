using HotelBooking.Application.DTOs.Common;
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

        if (request.PaymentMethod != PaymentMethod.Deposit &&
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
        long paymentId)
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
        GetPaymentsByBookingAsync(long bookingId)
    {
        var payments =
            await _paymentRepository.GetByBookingIdAsync(
                bookingId);

        return payments.Select(MapToResponse);
    }

    public async Task<PaymentResponse?> ConfirmPaymentAsync(
        long paymentId,
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

    public async Task<PagedResult<PaymentHistoryDto>> GetMyPaymentHistoryAsync(
        long customerId,
        int page,
        int pageSize)
    {
        if (page < 1)
        {
            throw new ArgumentException("Page must be at least 1.");
        }

        if (pageSize < 1 || pageSize > 100)
        {
            throw new ArgumentException("PageSize must be between 1 and 100.");
        }

        var (items, totalCount) = await _paymentRepository.GetCustomerPaymentHistoryAsync(
            customerId,
            page,
            pageSize);

        return new PagedResult<PaymentHistoryDto>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<PaymentHistoryDto>> GetBookingPaymentHistoryAsync(
        long bookingId,
        long currentUserId,
        bool isAdmin,
        bool isStaff,
        int page,
        int pageSize)
    {
        if (bookingId <= 0)
        {
            throw new ArgumentException("BookingId must be greater than 0.");
        }

        if (page < 1)
        {
            throw new ArgumentException("Page must be at least 1.");
        }

        if (pageSize < 1 || pageSize > 100)
        {
            throw new ArgumentException("PageSize must be between 1 and 100.");
        }

        var booking = await _paymentRepository.GetBookingCustomerAccessInfoAsync(bookingId);
        if (booking == null)
        {
            throw new KeyNotFoundException("Booking not found.");
        }

        if (!isAdmin)
        {
            if (isStaff)
            {
                var isAssigned = await _paymentRepository.IsStaffAssignedToBookingAsync(bookingId, currentUserId);
                if (!isAssigned)
                {
                    throw new UnauthorizedAccessException("You do not have permission to view payments for this booking.");
                }
            }
            else if (booking.CustomerId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view payments for this booking.");
            }
        }

        var (items, totalCount) = await _paymentRepository.GetBookingPaymentHistoryAsync(
            bookingId,
            page,
            pageSize);

        return new PagedResult<PaymentHistoryDto>(items, totalCount, page, pageSize);
    }

    public async Task<PagedResult<PaymentHistoryDto>> GetStaffPaymentHistoryAsync(
        PaymentHistoryFilterRequest filter,
        long staffUserId,
        bool isAdmin)
    {
        if (filter.Page < 1)
        {
            throw new ArgumentException("Page must be at least 1.");
        }

        if (filter.PageSize < 1 || filter.PageSize > 100)
        {
            throw new ArgumentException("PageSize must be between 1 and 100.");
        }

        if (filter.FromDate.HasValue && filter.ToDate.HasValue && filter.FromDate.Value > filter.ToDate.Value)
        {
            throw new ArgumentException("FromDate cannot be later than ToDate.");
        }

        if (!string.IsNullOrWhiteSpace(filter.Status))
        {
            if (!Enum.TryParse<PaymentStatus>(filter.Status.Trim(), true, out _))
            {
                throw new ArgumentException("Invalid payment status filter.");
            }
        }

        var (items, totalCount) = await _paymentRepository.GetStaffPaymentHistoryAsync(
            filter,
            staffUserId,
            isAdmin);

        return new PagedResult<PaymentHistoryDto>(items, totalCount, filter.Page, filter.PageSize);
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