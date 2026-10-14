using HotelBooking.Domain.Enums;
namespace HotelBooking.Domain.Entities;

public class Payment
{
    public long PaymentId { get; set; }
    public long BookingId { get; set; }
    public PaymentMethod PaymentMethod {get;set;}
    public PaymentType PaymentType {get;set;}
    public decimal Amount {get;set;}
    public PaymentStatus Status {get;set;}
    public string? TransactionCode {get;set;}
    public DateTime? PaidAt {get;set;}
    public DateTime CreatedAt {get;set;}
}