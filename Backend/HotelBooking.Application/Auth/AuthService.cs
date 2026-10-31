using System.Security.Cryptography;
using System.Text;
using HotelBooking.Domain.Entities;
using Microsoft.Extensions.Options;

namespace HotelBooking.Application.Auth;

public sealed class AuthService(
    IUserRepository users,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    IOtpSender otpSender,
    IGoogleTokenValidator googleTokens,
    IOptions<AdvancedAuthOptions> options,
    TimeProvider timeProvider) : IAuthService
{
    private const string GoogleProvider = "Google";
    private readonly AdvancedAuthOptions settings = options.Value;

    public async Task<AccountAvailabilityResponse> CheckRegistrationAvailabilityAsync(string? email, string? phone, CancellationToken ct)
    {
        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : NormalizeEmail(email);
        var normalizedPhone = NormalizeOptional(phone);
        var emailAvailable = normalizedEmail is null || await users.FindByEmailAsync(normalizedEmail, ct) is null;
        var phoneAvailable = normalizedPhone is null || !await users.PhoneExistsAsync(normalizedPhone, 0, ct);
        return new(emailAvailable, phoneAvailable);
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, AuthClientContext client, CancellationToken ct)
    {
        var email = NormalizeEmail(request.Email);
        if (await users.FindByEmailAsync(email, ct) is not null)
            throw new DuplicateEmailException(email);
        var phone = NormalizeOptional(request.Phone);
        if (phone is not null && await users.PhoneExistsAsync(phone, 0, ct))
            throw new DuplicatePhoneException(phone);
        var customerRole = await CustomerRole(ct);
        var user = new User
        {
            FullName = request.FullName.Trim(), Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            Phone = phone, DateOfBirth = request.DateOfBirth,
            IsActive = true, CreatedAt = UtcNow
        };
        user.UserRoles.Add(new UserRole { User = user, Role = customerRole, AssignedAt = UtcNow });
        await users.AddAsync(user, ct);
        await users.SaveChangesAsync(ct);
        return await IssueSession(user, [SystemRoles.Customer], true, client, ct);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, AuthClientContext client, CancellationToken ct)
    {
        var user = await users.FindByEmailAsync(NormalizeEmail(request.Email), ct);
        if (user is null || !user.IsActive) return AuthResult.Failed(AuthFailure.InvalidCredentials);
        if (user.LockoutEnd is { } lockoutEnd && lockoutEnd > UtcNow)
            return AuthResult.Failed(AuthFailure.LockedOut, new DateTimeOffset(lockoutEnd, TimeSpan.Zero));

        if (!passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            user.AccessFailedCount++;
            DateTimeOffset? retryAt = null;
            if (user.AccessFailedCount >= settings.MaxFailedAccessAttempts)
            {
                user.LockoutEnd = UtcNow.AddMinutes(settings.LockoutMinutes);
                user.AccessFailedCount = 0;
                retryAt = new DateTimeOffset(user.LockoutEnd.Value, TimeSpan.Zero);
            }
            user.UpdatedAt = UtcNow;
            await users.SaveChangesAsync(ct);
            return retryAt is null ? AuthResult.Failed(AuthFailure.InvalidCredentials) : AuthResult.Failed(AuthFailure.LockedOut, retryAt);
        }

        ClearLockout(user);
        return AuthResult.Success(await IssueSession(user, Roles(user), request.RememberMe, client, ct));
    }

    public async Task<AuthResult> RefreshAsync(string refreshToken, AuthClientContext client, CancellationToken ct)
    {
        var token = await users.FindRefreshTokenAsync(HashToken(refreshToken), ct);
        if (token is null || !token.IsActive(UtcNow) || !token.User.IsActive)
            return AuthResult.Failed(AuthFailure.InvalidToken);
        token.RevokedAt = UtcNow;
        token.RevokedByIp = client.IpAddress;
        var rememberMe = token.ExpiresAt - token.CreatedAt > TimeSpan.FromDays(settings.RefreshTokenDays + 1);
        var response = await CreateSession(token.User, Roles(token.User), rememberMe, client, ct);
        token.ReplacedByTokenHash = HashToken(response.RefreshToken);
        await users.SaveChangesAsync(ct);
        return AuthResult.Success(response);
    }

    public async Task LogoutAsync(string refreshToken, AuthClientContext client, CancellationToken ct)
    {
        var token = await users.FindRefreshTokenAsync(HashToken(refreshToken), ct);
        if (token is null || token.RevokedAt is not null) return;
        token.RevokedAt = UtcNow;
        token.RevokedByIp = client.IpAddress;
        token.User.TokenVersion++;
        token.User.UpdatedAt = UtcNow;
        await users.SaveChangesAsync(ct);
    }

    public async Task LogoutAllAsync(long userId, AuthClientContext client, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null) return;
        user.TokenVersion++;
        user.UpdatedAt = UtcNow;
        foreach (var token in user.RefreshTokens.Where(x => x.IsActive(UtcNow)))
        {
            token.RevokedAt = UtcNow;
            token.RevokedByIp = client.IpAddress;
        }
        await users.SaveChangesAsync(ct);
    }

    public async Task<OtpChallengeResponse> RequestOtpAsync(OtpRequest request, CancellationToken ct)
    {
        var destination = request.Channel == OtpChannel.Email ? NormalizeEmail(request.Destination) : request.Destination.Trim();
        var purpose = request.Purpose.ToString();
        var recent = await users.FindRecentOtpChallengeAsync(destination, purpose, UtcNow.AddSeconds(-settings.OtpResendSeconds), ct);
        if (recent is not null)
            return new(recent.ChallengeId, new DateTimeOffset(recent.ExpiresAt, TimeSpan.Zero), settings.OtpResendSeconds);

        var user = request.Channel == OtpChannel.Email
            ? await users.FindByEmailAsync(destination, ct)
            : await users.FindByPhoneAsync(destination, ct);
        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        var challenge = new AuthOtpChallenge
        {
            ChallengeId = Guid.NewGuid(), UserId = user?.UserId, Channel = request.Channel.ToString(),
            Purpose = purpose, Destination = destination, CreatedAt = UtcNow,
            ExpiresAt = UtcNow.AddMinutes(settings.OtpLifetimeMinutes)
        };
        challenge.CodeHash = HashOtp(challenge.ChallengeId, code);
        await users.AddOtpChallengeAsync(challenge, ct);
        await users.SaveChangesAsync(ct);
        if (user is not null && user.IsActive)
        {
            try
            {
                await otpSender.SendAsync(request.Channel, destination, code, request.Purpose, ct);
            }
            catch
            {
                challenge.ConsumedAt = UtcNow;
                await users.SaveChangesAsync(ct);
                throw;
            }
        }
        return new(challenge.ChallengeId, new DateTimeOffset(challenge.ExpiresAt, TimeSpan.Zero), settings.OtpResendSeconds);
    }

    public async Task<AuthResult> VerifyOtpAsync(OtpVerifyRequest request, AuthClientContext client, CancellationToken ct)
    {
        var challenge = await users.FindOtpChallengeAsync(request.ChallengeId, ct);
        var failure = ValidateOtp(challenge, request.Code, OtpPurpose.Login);
        if (failure != AuthFailure.None)
        {
            await users.SaveChangesAsync(ct);
            return AuthResult.Failed(failure);
        }
        challenge!.ConsumedAt = UtcNow;
        ClearLockout(challenge.User!);
        return AuthResult.Success(await IssueSession(challenge.User!, Roles(challenge.User!), request.RememberMe, client, ct));
    }

    public async Task<AuthFailure> ResetPasswordAsync(ResetPasswordRequest request, AuthClientContext client, CancellationToken ct)
    {
        var challenge = await users.FindOtpChallengeAsync(request.ChallengeId, ct);
        var failure = ValidateOtp(challenge, request.Code, OtpPurpose.PasswordReset);
        if (failure != AuthFailure.None)
        {
            await users.SaveChangesAsync(ct);
            return failure;
        }
        challenge!.ConsumedAt = UtcNow;
        var user = challenge.User!;
        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        user.UpdatedAt = UtcNow;
        user.TokenVersion++;
        ClearLockout(user, false);
        foreach (var token in user.RefreshTokens.Where(x => x.IsActive(UtcNow)))
        {
            token.RevokedAt = UtcNow;
            token.RevokedByIp = client.IpAddress;
        }
        await users.SaveChangesAsync(ct);
        return AuthFailure.None;
    }

    public async Task<AuthResult> GoogleLoginAsync(GoogleLoginRequest request, AuthClientContext client, CancellationToken ct)
    {
        var identity = await googleTokens.ValidateAsync(request.IdToken, ct);
        if (identity is null || !identity.EmailVerified) return AuthResult.Failed(AuthFailure.ProviderRejected);
        var user = await users.FindByExternalLoginAsync(GoogleProvider, identity.Subject, ct);
        if (user is null)
        {
            var email = NormalizeEmail(identity.Email);
            user = await users.FindByEmailAsync(email, ct);
            if (user is null)
            {
                var role = await CustomerRole(ct);
                user = new User
                {
                    FullName = string.IsNullOrWhiteSpace(identity.FullName) ? email : identity.FullName.Trim(),
                    Email = email, PasswordHash = passwordHasher.Hash(CreateRandomToken()), IsActive = true, CreatedAt = UtcNow
                };
                user.UserRoles.Add(new UserRole { User = user, Role = role, AssignedAt = UtcNow });
                user.ExternalLogins.Add(new ExternalLogin
                {
                    Provider = GoogleProvider, ProviderSubject = identity.Subject, Email = email, CreatedAt = UtcNow
                });
                await users.AddAsync(user, ct);
            }
            else
            {
                await users.AddExternalLoginAsync(new ExternalLogin
                {
                    User = user, Provider = GoogleProvider, ProviderSubject = identity.Subject, Email = email, CreatedAt = UtcNow
                }, ct);
            }
            await users.SaveChangesAsync(ct);
        }
        if (!user.IsActive) return AuthResult.Failed(AuthFailure.InvalidCredentials);
        ClearLockout(user);
        return AuthResult.Success(await IssueSession(user, Roles(user), request.RememberMe, client, ct));
    }

    private AuthFailure ValidateOtp(AuthOtpChallenge? challenge, string code, OtpPurpose expectedPurpose)
    {
        if (challenge is null || challenge.ConsumedAt is not null || challenge.User is null || !challenge.User.IsActive ||
            !string.Equals(challenge.Purpose, expectedPurpose.ToString(), StringComparison.Ordinal)) return AuthFailure.InvalidOtp;
        if (challenge.ExpiresAt <= UtcNow) return AuthFailure.OtpExpired;
        if (challenge.AttemptCount >= settings.OtpMaxAttempts) return AuthFailure.InvalidOtp;
        var actual = Convert.FromBase64String(HashOtp(challenge.ChallengeId, code));
        var expected = Convert.FromBase64String(challenge.CodeHash);
        if (CryptographicOperations.FixedTimeEquals(actual, expected)) return AuthFailure.None;
        challenge.AttemptCount++;
        return AuthFailure.InvalidOtp;
    }

    private async Task<AuthResponse> IssueSession(User user, IReadOnlyList<string> roles, bool rememberMe, AuthClientContext client, CancellationToken ct)
    {
        var response = await CreateSession(user, roles, rememberMe, client, ct);
        await users.SaveChangesAsync(ct);
        return response;
    }

    private async Task<AuthResponse> CreateSession(User user, IReadOnlyList<string> roles, bool rememberMe, AuthClientContext client, CancellationToken ct)
    {
        var access = tokenService.CreateToken(user, roles);
        var rawRefreshToken = CreateRandomToken();
        var refreshExpires = UtcNow.AddDays(rememberMe ? settings.RememberMeRefreshTokenDays : settings.RefreshTokenDays);
        await users.AddRefreshTokenAsync(new RefreshToken
        {
            User = user, TokenHash = HashToken(rawRefreshToken), CreatedAt = UtcNow, ExpiresAt = refreshExpires,
            CreatedByIp = client.IpAddress, DeviceInfo = Truncate(client.DeviceInfo, 500)
        }, ct);
        return new(user.UserId, user.FullName, user.Email, roles, access.Token, access.ExpiresAt,
            rawRefreshToken, new DateTimeOffset(refreshExpires, TimeSpan.Zero));
    }

    private void ClearLockout(User user, bool updateLastLogin = true)
    {
        user.AccessFailedCount = 0;
        user.LockoutEnd = null;
        if (updateLastLogin) user.LastLoginAt = UtcNow;
        user.UpdatedAt = UtcNow;
    }

    private string HashOtp(Guid challengeId, string code)
    {
        if (Encoding.UTF8.GetByteCount(settings.OtpPepper) < 32)
            throw new InvalidOperationException("AdvancedAuth:OtpPepper must be at least 32 characters.");
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(settings.OtpPepper));
        return Convert.ToBase64String(hmac.ComputeHash(Encoding.UTF8.GetBytes($"{challengeId:N}:{code}")));
    }

    private static string HashToken(string token) => Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static string CreateRandomToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    private static string? NormalizeOptional(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private static string? Truncate(string? value, int max)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        return trimmed[..Math.Min(trimmed.Length, max)];
    }
    private static string[] Roles(User user) => user.UserRoles.Select(x => x.Role.RoleName).Distinct(StringComparer.Ordinal).ToArray();
    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;
    private async Task<Role> CustomerRole(CancellationToken ct) => await users.FindRoleAsync(SystemRoles.Customer, ct)
        ?? throw new InvalidOperationException("The Customer role has not been configured.");
}
