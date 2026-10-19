using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.Hotels;

public sealed class HotelRequest
{
    [Required, StringLength(200)]
    public string HotelName { get; init; } = string.Empty;
    public string? Description { get; init; }
    [Required, StringLength(300)]
    public string Address { get; init; } = string.Empty;
    [Required, StringLength(100)]
    public string City { get; init; } = string.Empty;
    [Required, StringLength(100)]
    public string Country { get; init; } = "Vietnam";
    [Required, StringLength(20)]
    public string Phone { get; init; } = string.Empty;
    [Required, StringLength(255), EmailAddress]
    public string Email { get; init; } = string.Empty;
    [StringLength(500), Url]
    public string? Website { get; init; }
    [Required]
    public TimeOnly? CheckInTime { get; init; }
    [Required]
    public TimeOnly? CheckOutTime { get; init; }
    public bool IsActive { get; init; } = true;
}
