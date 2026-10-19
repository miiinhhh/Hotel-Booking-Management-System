using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IPaymentRepository
{
    Task<Payment?> GetByIdAsync(long paymentId);

    Task<IEnumerable<Payment>> GetByBookingIdAsync(long bookingId);

    Task<long> CreateAsync(Payment payment);

    Task<bool> UpdateStatusAsync(
        long paymentId,
        string status,
        DateTime? paidAt);

    Task<decimal> GetTotalPaidAmountAsync(long bookingId);

    Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(long bookingId);

    Task UpdateBookingPaymentSummaryAsync(
        long bookingId,
        decimal totalPaid,
        decimal totalAmount);

    Task<BookingCustomerAccessInfo?> GetBookingCustomerAccessInfoAsync(long bookingId);

    Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId);

    Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetCustomerPaymentHistoryAsync(
        long customerId,
        int page,
        int pageSize);

    Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetBookingPaymentHistoryAsync(
        long bookingId,
        int page,
        int pageSize);

    Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetStaffPaymentHistoryAsync(
        PaymentHistoryFilterRequest filter,
        long staffUserId,
        bool isAdmin);
}

public class BookingPaymentInfo
{
    public long BookingId { get; set; }

    public string BookingStatus { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public decimal DepositAmount { get; set; }

    public decimal RemainingAmount { get; set; }
}