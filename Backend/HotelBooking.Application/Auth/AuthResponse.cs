namespace HotelBooking.Application.Auth;

/// <summary>Authentication result containing a bearer token and assigned roles.</summary>
public sealed record AuthResponse(
    long UserId,
    string FullName,
    string Email,
    IReadOnlyList<string> Roles,
    string AccessToken,
    DateTimeOffset ExpiresAt);
