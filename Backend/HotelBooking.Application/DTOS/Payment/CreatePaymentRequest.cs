using HotelBooking.Domain.Enums;

namespace HotelBooking.Application.DTOs.Payment;

public class CreatePaymentRequest
{
    public Guid BookingId { get; set; }

    public PaymentMethod PaymentMethod { get; set; }

    public PaymentType PaymentType { get; set; }

    public decimal Amount { get; set; }

    public string? TransactionCode { get; set; }
}