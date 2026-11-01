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
    IReadOnlyList<string> Roles,
    string? AvatarUrl,
    DateTimeOffset? AvatarUpdatedAt);

/// <summary>Editable profile data for the authenticated account.</summary>
[System.Text.Json.Serialization.JsonUnmappedMemberHandling(System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow)]
public sealed record UpdateAccountProfileRequest
{
    /// <summary>The account holder's display name.</summary>
    [Required, StringLength(150, MinimumLength = 2)]
    public required string FullName { get; init; }

    /// <summary>New email address. Omit to retain the existing email.</summary>
    [EmailAddress, StringLength(255)]
    public string? Email { get; init; }

    /// <summary>The account holder's phone number.</summary>
    [StringLength(20)]
    [Phone]
    public string? Phone { get; init; }

    /// <summary>The account holder's date of birth.</summary>
    public DateTimeOffset? DateOfBirth { get; init; }
}

public sealed record ChangePasswordRequest
{
    [Required] public required string CurrentPassword { get; init; }
    [Required, StringLength(128, MinimumLength = 8)] public required string NewPassword { get; init; }
}

public sealed record ReauthenticateRequest
{
    [Required] public required string Password { get; init; }
}

public sealed record ReauthenticationResponse(DateTimeOffset VerifiedAt, int ValidForSeconds = 300);
public sealed record AccountAvailabilityResponse(bool EmailAvailable, bool PhoneAvailable);
public enum AccountOperationResult { Success, NotFound, InvalidPassword }

public sealed class ReauthenticationRequiredException()
    : Exception("Reauthenticate before changing the email address or phone number.");

