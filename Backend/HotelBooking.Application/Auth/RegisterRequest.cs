using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.Auth;

/// <summary>Payload used to create a customer account.</summary>
public sealed record RegisterRequest
{
    [Required, StringLength(150, MinimumLength = 2)]
    public required string FullName { get; init; }

    [Required, EmailAddress, StringLength(255)]
    public required string Email { get; init; }

    [Required, StringLength(100, MinimumLength = 8)]
    public required string Password { get; init; }

    [StringLength(20)]
    public string? Phone { get; init; }

    public DateTime? DateOfBirth { get; init; }
}
