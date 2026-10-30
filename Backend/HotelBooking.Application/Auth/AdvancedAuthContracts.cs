using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HotelBooking.Application.Auth;

public enum OtpChannel { Email, Phone }
public enum OtpPurpose { Login, PasswordReset }
public enum AuthFailure { None, InvalidCredentials, LockedOut, InvalidToken, InvalidOtp, OtpExpired, ProviderRejected, DeliveryUnavailable }

public sealed record AuthClientContext(string? IpAddress, string? DeviceInfo);
public sealed record AuthResult(AuthResponse? Response, AuthFailure Failure = AuthFailure.None, DateTimeOffset? RetryAt = null)
{
    public static AuthResult Success(AuthResponse response) => new(response);
    public static AuthResult Failed(AuthFailure failure, DateTimeOffset? retryAt = null) => new(null, failure, retryAt);
}

public sealed record RefreshRequest
{
    [Required] public required string RefreshToken { get; init; }
}

public sealed record LogoutRequest
{
    [Required] public required string RefreshToken { get; init; }
}

public sealed record OtpRequest
{
    [Required] public required string Destination { get; init; }
    [JsonConverter(typeof(JsonStringEnumConverter<OtpChannel>))] public OtpChannel Channel { get; init; }
    [JsonConverter(typeof(JsonStringEnumConverter<OtpPurpose>))] public OtpPurpose Purpose { get; init; }
}

public sealed record OtpVerifyRequest
{
    public Guid ChallengeId { get; init; }
    [Required, RegularExpression("^[0-9]{6}$")] public required string Code { get; init; }
    public bool RememberMe { get; init; }
}

public sealed record ResetPasswordRequest
{
    public Guid ChallengeId { get; init; }
    [Required, RegularExpression("^[0-9]{6}$")] public required string Code { get; init; }
    [Required, MinLength(8), MaxLength(128)] public required string NewPassword { get; init; }
}

public sealed record GoogleLoginRequest
{
    [Required] public required string IdToken { get; init; }
    public bool RememberMe { get; init; }
}

public sealed record OtpChallengeResponse(Guid ChallengeId, DateTimeOffset ExpiresAt, int ResendAfterSeconds = 60);
public sealed record GoogleIdentity(string Subject, string Email, string FullName, bool EmailVerified);

public sealed class AdvancedAuthOptions
{
    public const string SectionName = "AdvancedAuth";
    public int MaxFailedAccessAttempts { get; set; } = 5;
    public int LockoutMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 1;
    public int RememberMeRefreshTokenDays { get; set; } = 30;
    public int OtpLifetimeMinutes { get; set; } = 5;
    public int OtpMaxAttempts { get; set; } = 5;
    public int OtpResendSeconds { get; set; } = 60;
    public string OtpPepper { get; set; } = string.Empty;
}

public interface IOtpSender
{
    Task SendAsync(OtpChannel channel, string destination, string code, OtpPurpose purpose, CancellationToken cancellationToken);
}

public interface IGoogleTokenValidator
{
    Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken);
}
