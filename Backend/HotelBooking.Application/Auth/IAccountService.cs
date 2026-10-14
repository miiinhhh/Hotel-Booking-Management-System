namespace HotelBooking.Application.Auth;

public interface IAccountService
{
    Task<AccountProfileResponse?> GetProfileAsync(long userId, CancellationToken cancellationToken);
    Task<AccountProfileResponse?> UpdateProfileAsync(
        long userId,
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken);
}

