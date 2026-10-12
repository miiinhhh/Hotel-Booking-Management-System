using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.Auth;

/// <summary>Payload used to authenticate an account.</summary>
public sealed record LoginRequest
{
    [Required, EmailAddress]
    public required string Email { get; init; }

    [Required]
    public required string Password { get; init; }
}
