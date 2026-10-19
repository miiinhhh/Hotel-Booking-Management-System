using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public sealed class AccountService(IUserRepository userRepository) : IAccountService
{
    public async Task<AccountProfileResponse?> GetProfileAsync(
        long userId,
        CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        return user is null ? null : MapProfile(user);
    }

    public async Task<AccountProfileResponse?> UpdateProfileAsync(
        long userId,
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken)
    {
        var user = await userRepository.FindByIdAsync(userId, cancellationToken);
        if (user is null)
            return null;

        user.FullName = request.FullName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.DateOfBirth = request.DateOfBirth?.UtcDateTime;
        user.UpdatedAt = DateTime.UtcNow;

        await userRepository.SaveChangesAsync(cancellationToken);
        return MapProfile(user);
    }

    private static AccountProfileResponse MapProfile(User user) =>
        new(
            user.UserId,
            user.FullName,
            user.Email,
            user.Phone,
            user.DateOfBirth is null ? null : new DateTimeOffset(user.DateOfBirth.Value, TimeSpan.Zero),
            user.IsActive,
            new DateTimeOffset(user.CreatedAt, TimeSpan.Zero),
            user.UpdatedAt is null ? null : new DateTimeOffset(user.UpdatedAt.Value, TimeSpan.Zero),
            user.UserRoles.Select(userRole => userRole.Role.RoleName).ToArray());
}

