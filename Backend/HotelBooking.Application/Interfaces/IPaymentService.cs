using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Payment;

namespace HotelBooking.Application.Interfaces;

public interface IPaymentService
{
    Task<PaymentResponse> CreatePaymentAsync(
        CreatePaymentRequest request,
        long customerId);

    Task<PaymentResponse?> GetPaymentAsync(
        long paymentId,
        long actorId,
        bool canManageAll);

    Task<IEnumerable<PaymentResponse>> GetPaymentsByBookingAsync(
        long bookingId);

    Task<PaymentResponse?> ConfirmPaymentAsync(
        long paymentId,
        ConfirmPaymentRequest request);

    Task<PagedResult<PaymentHistoryDto>> GetMyPaymentHistoryAsync(
        long customerId,
        int page,
        int pageSize);

    Task<PagedResult<PaymentHistoryDto>> GetBookingPaymentHistoryAsync(
        long bookingId,
        long currentUserId,
        bool isAdmin,
        bool isStaff,
        int page,
        int pageSize);

    Task<PagedResult<PaymentHistoryDto>> GetStaffPaymentHistoryAsync(
        PaymentHistoryFilterRequest filter,
        long staffUserId,
        bool isAdmin);
}
