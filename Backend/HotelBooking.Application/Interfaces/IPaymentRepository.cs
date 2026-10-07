using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IPaymentRepository
{
    Task<Payment?> GetByIdAsync(Guid paymentId);

    Task<IEnumerable<Payment>> GetByBookingIdAsync(Guid bookingId);

    Task<Guid> CreateAsync(Payment payment);

    Task<bool> UpdateStatusAsync(
        Guid paymentId,
        string status,
        DateTime? paidAt);

    Task<decimal> GetTotalPaidAmountAsync(Guid bookingId);

    Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(Guid bookingId);

    Task UpdateBookingPaymentSummaryAsync(
        Guid bookingId,
        decimal totalPaid,
        decimal totalAmount);
}

public class BookingPaymentInfo
{
    public Guid BookingId { get; set; }

    public string BookingStatus { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public decimal DepositAmount { get; set; }

    public decimal RemainingAmount { get; set; }
}