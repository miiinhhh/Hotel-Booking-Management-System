using HotelBooking.Application.DTOs.Payment;

namespace HotelBooking.Application.Interfaces;

public interface IPaymentService
{
    Task<PaymentResponse> CreatePaymentAsync(
        CreatePaymentRequest request);

    Task<PaymentResponse?> GetPaymentAsync(
        Guid paymentId);

    Task<IEnumerable<PaymentResponse>> GetPaymentsByBookingAsync(
        Guid bookingId);

    Task<PaymentResponse?> ConfirmPaymentAsync(
        Guid paymentId,
        ConfirmPaymentRequest request);
}