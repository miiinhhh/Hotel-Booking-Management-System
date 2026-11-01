using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public sealed class AccountService(
    IUserRepository users,
    IPasswordHasher passwordHasher,
    IImageStorage imageStorage,
    TimeProvider timeProvider) : IAccountService
{
    public async Task<AccountProfileResponse?> GetProfileAsync(long userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        return user is null ? null : MapProfile(user);
    }

    public async Task<AccountProfileResponse?> UpdateProfileAsync(long userId, UpdateAccountProfileRequest request, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null) return null;

        var email = string.IsNullOrWhiteSpace(request.Email) ? user.Email : request.Email.Trim().ToLowerInvariant();
        var phone = Normalize(request.Phone);
        var changesIdentity = !string.Equals(email, user.Email, StringComparison.OrdinalIgnoreCase) ||
            !string.Equals(phone, user.Phone, StringComparison.Ordinal);
        if (changesIdentity && (user.LastReauthenticatedAt is null || user.LastReauthenticatedAt < UtcNow.AddMinutes(-5)))
            throw new ReauthenticationRequiredException();
        if (await users.EmailExistsAsync(email, userId, ct))
            throw new DuplicateEmailException(email);
        if (phone is not null && await users.PhoneExistsAsync(phone, userId, ct))
            throw new DuplicatePhoneException(phone);
        if (request.DateOfBirth?.UtcDateTime > UtcNow)
            throw new DomainRuleException("Date of birth cannot be in the future.");

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Phone = phone;
        user.DateOfBirth = request.DateOfBirth?.UtcDateTime;
        user.UpdatedAt = UtcNow;
        if (changesIdentity) user.LastReauthenticatedAt = null;
        await users.SaveChangesAsync(ct);
        return MapProfile(user);
    }

    public async Task<AccountAvailabilityResponse> CheckAvailabilityAsync(
        long userId, string? email, string? phone, CancellationToken ct)
    {
        var normalizedEmail = Normalize(email)?.ToLowerInvariant();
        var normalizedPhone = Normalize(phone);
        if (normalizedEmail is null && normalizedPhone is null)
            throw new DomainRuleException("Provide an email address or phone number to check.");
        return new(
            normalizedEmail is null || !await users.EmailExistsAsync(normalizedEmail, userId, ct),
            normalizedPhone is null || !await users.PhoneExistsAsync(normalizedPhone, userId, ct));
    }

    public async Task<AccountOperationResult> ChangePasswordAsync(long userId, ChangePasswordRequest request, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null) return AccountOperationResult.NotFound;
        if (!passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            return AccountOperationResult.InvalidPassword;
        if (passwordHasher.Verify(request.NewPassword, user.PasswordHash))
            throw new DomainRuleException("The new password must be different from the current password.");

        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        user.TokenVersion++;
        user.UpdatedAt = UtcNow;
        foreach (var token in user.RefreshTokens.Where(x => x.IsActive(UtcNow)))
            token.RevokedAt = UtcNow;
        await users.SaveChangesAsync(ct);
        return AccountOperationResult.Success;
    }

    public async Task<ReauthenticationResponse?> ReauthenticateAsync(long userId, string password, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null || !user.IsActive || !passwordHasher.Verify(password, user.PasswordHash)) return null;
        user.LastReauthenticatedAt = UtcNow;
        await users.SaveChangesAsync(ct);
        return new(new DateTimeOffset(user.LastReauthenticatedAt.Value, TimeSpan.Zero));
    }

    public async Task<AccountProfileResponse?> UpdateAvatarAsync(long userId, ImageUpload upload, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null) return null;
        var stored = await imageStorage.StoreAsync(upload, ct);
        var previousKey = user.AvatarStorageKey;
        try
        {
            user.AvatarStorageKey = stored.Key;
            user.AvatarContentType = stored.ContentType;
            user.AvatarUpdatedAt = UtcNow;
            user.UpdatedAt = UtcNow;
            await users.SaveChangesAsync(ct);
        }
        catch
        {
            await SafeDelete(stored.Key);
            throw;
        }
        if (previousKey is not null) await SafeDelete(previousKey);
        return MapProfile(user);
    }

    public async Task<ImageFile?> OpenAvatarAsync(long userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user?.AvatarStorageKey is null || user.AvatarContentType is null) return null;
        return await imageStorage.OpenAsync(user.AvatarStorageKey, user.AvatarContentType, ct);
    }

    public async Task<AccountOperationResult> DeleteAvatarAsync(long userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null) return AccountOperationResult.NotFound;
        var key = user.AvatarStorageKey;
        user.AvatarStorageKey = null;
        user.AvatarContentType = null;
        user.AvatarUpdatedAt = null;
        user.UpdatedAt = UtcNow;
        await users.SaveChangesAsync(ct);
        if (key is not null) await SafeDelete(key);
        return AccountOperationResult.Success;
    }

    private async Task SafeDelete(string key)
    {
        try { await imageStorage.DeleteAsync(key, CancellationToken.None); }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }

    private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    private DateTime UtcNow => timeProvider.GetUtcNow().UtcDateTime;
    private static AccountProfileResponse MapProfile(User user) => new(
        user.UserId, user.FullName, user.Email, user.Phone,
        user.DateOfBirth is null ? null : new DateTimeOffset(user.DateOfBirth.Value, TimeSpan.Zero),
        user.IsActive, new DateTimeOffset(user.CreatedAt, TimeSpan.Zero),
        user.UpdatedAt is null ? null : new DateTimeOffset(user.UpdatedAt.Value, TimeSpan.Zero),
        user.UserRoles.Select(x => x.Role.RoleName).ToArray(),
        user.AvatarStorageKey is null ? null : $"/api/users/{user.UserId}/avatar",
        user.AvatarUpdatedAt is null ? null : new DateTimeOffset(user.AvatarUpdatedAt.Value, TimeSpan.Zero));
}
