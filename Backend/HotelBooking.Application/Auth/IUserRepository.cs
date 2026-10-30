using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public interface IUserRepository
{
    Task<User?> FindByIdAsync(long userId, CancellationToken cancellationToken);
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);
    Task<User?> FindByPhoneAsync(string phone, CancellationToken cancellationToken);
    Task<User?> FindByExternalLoginAsync(string provider, string subject, CancellationToken cancellationToken);
    Task<RefreshToken?> FindRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken);
    Task<AuthOtpChallenge?> FindOtpChallengeAsync(Guid challengeId, CancellationToken cancellationToken);
    Task<AuthOtpChallenge?> FindRecentOtpChallengeAsync(string destination, string purpose, DateTime createdAfter, CancellationToken cancellationToken);
    Task AddAsync(User user, CancellationToken cancellationToken);
    Task AddRefreshTokenAsync(RefreshToken token, CancellationToken cancellationToken);
    Task AddOtpChallengeAsync(AuthOtpChallenge challenge, CancellationToken cancellationToken);
    Task AddExternalLoginAsync(ExternalLogin login, CancellationToken cancellationToken);
    Task<bool> RoleExistsAsync(string roleName, CancellationToken cancellationToken);
    Task<Role?> FindRoleAsync(string roleName, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
