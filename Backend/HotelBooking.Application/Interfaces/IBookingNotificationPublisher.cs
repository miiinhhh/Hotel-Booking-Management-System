namespace HotelBooking.Application.Interfaces;

public interface IBookingNotificationPublisher
{
    Task PublishBookingCreatedAsync(long bookingId, string bookingCode, decimal totalAmount, CancellationToken ct = default);
    Task PublishBookingStatusChangedAsync(long bookingId, string bookingCode, string oldStatus, string newStatus, string? note = null, CancellationToken ct = default);
    Task PublishBookingRescheduledAsync(long bookingId, string bookingCode, DateOnly newCheckIn, DateOnly newCheckOut, decimal newTotalAmount, CancellationToken ct = default);
    Task PublishPaymentReceivedAsync(long bookingId, string bookingCode, decimal amount, string paymentMethod, CancellationToken ct = default);
}

