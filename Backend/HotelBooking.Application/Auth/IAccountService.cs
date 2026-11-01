namespace HotelBooking.Application.Auth;

using HotelBooking.Application.DTOs;

public interface IAccountService
{
    Task<AccountProfileResponse?> GetProfileAsync(long userId, CancellationToken cancellationToken);
    Task<AccountProfileResponse?> UpdateProfileAsync(
        long userId,
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken);
    Task<AccountAvailabilityResponse> CheckAvailabilityAsync(long userId, string? email, string? phone, CancellationToken cancellationToken);
    Task<AccountOperationResult> ChangePasswordAsync(long userId, ChangePasswordRequest request, CancellationToken cancellationToken);
    Task<ReauthenticationResponse?> ReauthenticateAsync(long userId, string password, CancellationToken cancellationToken);
    Task<AccountProfileResponse?> UpdateAvatarAsync(long userId, ImageUpload upload, CancellationToken cancellationToken);
    Task<ImageFile?> OpenAvatarAsync(long userId, CancellationToken cancellationToken);
    Task<AccountOperationResult> DeleteAvatarAsync(long userId, CancellationToken cancellationToken);
}

