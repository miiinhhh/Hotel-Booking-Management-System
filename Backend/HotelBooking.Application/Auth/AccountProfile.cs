using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.Auth;

/// <summary>Profile data returned for the authenticated account.</summary>
public sealed record AccountProfileResponse(
    long UserId,
    string FullName,
    string Email,
    string? Phone,
    DateTimeOffset? DateOfBirth,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    IReadOnlyList<string> Roles);

/// <summary>Editable profile data for the authenticated account.</summary>
[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed record UpdateAccountProfileRequest
{
    /// <summary>The account holder's display name.</summary>
    [Required, StringLength(150, MinimumLength = 2)]
    public required string FullName { get; init; }

    /// <summary>The account holder's phone number.</summary>
    [StringLength(20)]
    [Phone]
    public string? Phone { get; init; }

    /// <summary>The account holder's date of birth.</summary>
    public DateTimeOffset? DateOfBirth { get; init; }
}

