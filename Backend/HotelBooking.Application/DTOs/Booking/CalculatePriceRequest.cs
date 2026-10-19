using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.DTOs.Booking;

public class CalculatePriceRequest
{
    [Required]
    public DateOnly CheckInDate { get; set; }

    [Required]
    public DateOnly CheckOutDate { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "Vui lòng chọn ít nhất 1 phòng.")]
    public List<long> RoomIds { get; set; } = new();

    public string? VoucherCode { get; set; }

    public string PaymentMethod { get; set; } = "Deposit"; // "Deposit" hoặc "Cash" / "PayAtHotel"

    public int? NumberOfGuests { get; set; }
}
