using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.DTOs.Booking;

/// <summary>Lễ tân chuyển một phòng của đơn sang phòng khác cùng hạng.</summary>
public class ChangeRoomRequest
{
    [Range(1, long.MaxValue)] public long CurrentRoomId { get; set; }
    [Range(1, long.MaxValue)] public long NewRoomId { get; set; }
    [StringLength(300)] public string? Reason { get; set; }
}
