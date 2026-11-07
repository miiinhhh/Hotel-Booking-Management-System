using System;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace HotelBooking.API.Hubs;

public class SignalRBookingNotificationPublisher(IHubContext<BookingHub> hubContext) : IBookingNotificationPublisher
{
    public async Task PublishBookingCreatedAsync(long bookingId, string bookingCode, decimal totalAmount, CancellationToken ct = default)
    {
        await hubContext.Clients.All.SendAsync("OnBookingCreated", new
        {
            BookingId = bookingId,
            BookingCode = bookingCode,
            TotalAmount = totalAmount,
            CreatedAt = DateTime.UtcNow
        }, ct);
    }

    public async Task PublishBookingStatusChangedAsync(long bookingId, string bookingCode, string oldStatus, string newStatus, string? note = null, CancellationToken ct = default)
    {
        await hubContext.Clients.All.SendAsync("OnBookingStatusChanged", new
        {
            BookingId = bookingId,
            BookingCode = bookingCode,
            OldStatus = oldStatus,
            NewStatus = newStatus,
            Note = note,
            Timestamp = DateTime.UtcNow
        }, ct);
    }

    public async Task PublishBookingRescheduledAsync(long bookingId, string bookingCode, DateOnly newCheckIn, DateOnly newCheckOut, decimal newTotalAmount, CancellationToken ct = default)
    {
        await hubContext.Clients.All.SendAsync("OnBookingRescheduled", new
        {
            BookingId = bookingId,
            BookingCode = bookingCode,
            NewCheckIn = newCheckIn,
            NewCheckOut = newCheckOut,
            NewTotalAmount = newTotalAmount,
            Timestamp = DateTime.UtcNow
        }, ct);
    }

    public async Task PublishPaymentReceivedAsync(long bookingId, string bookingCode, decimal amount, string paymentMethod, CancellationToken ct = default)
    {
        await hubContext.Clients.All.SendAsync("OnPaymentReceived", new
        {
            BookingId = bookingId,
            BookingCode = bookingCode,
            Amount = amount,
            PaymentMethod = paymentMethod,
            Timestamp = DateTime.UtcNow
        }, ct);
    }
}

