namespace HotelBooking.Application.DTOs.Booking;

public class CreateBookingRequest
{
    public DateOnly CheckInDate { get; set; }
    public DateOnly CheckOutDate { get; set; }
    public int NumberOfGuests { get; set; }
    public string PaymentMethod { get; set; } = "Deposit"; // "Deposit" hoặc "Cash"
    public string? VoucherCode { get; set; }
    public string? SpecialRequests { get; set; }
    public List<BookingRoomItemRequest> Rooms { get; set; } = new();
    public List<BookingGuestRequest> Guests { get; set; } = new();
}

public class BookingRoomItemRequest
{
    public long RoomId { get; set; }
    public decimal UnitPrice { get; set; }
}

public class BookingGuestRequest
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public bool IsPrimaryGuest { get; set; }
}
