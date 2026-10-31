using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public sealed class UserRepository(HotelBookingDbContext dbContext) : IUserRepository
{
    public Task<User?> FindByIdAsync(long userId, CancellationToken cancellationToken) =>
        dbContext.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role).Include(x => x.RefreshTokens)
            .SingleOrDefaultAsync(x => x.UserId == userId, cancellationToken);

    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken) =>
        dbContext.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

    public Task<User?> FindByPhoneAsync(string phone, CancellationToken cancellationToken) =>
        dbContext.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.Phone == phone, cancellationToken);

    public Task<User?> FindByExternalLoginAsync(string provider, string subject, CancellationToken cancellationToken) =>
        dbContext.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.ExternalLogins.Any(login =>
                login.Provider == provider && login.ProviderSubject == subject), cancellationToken);

    public Task<bool> EmailExistsAsync(string email, long excludingUserId, CancellationToken cancellationToken) =>
        dbContext.Users.AnyAsync(x => x.UserId != excludingUserId && x.Email == email, cancellationToken);

    public Task<bool> PhoneExistsAsync(string phone, long excludingUserId, CancellationToken cancellationToken) =>
        dbContext.Users.AnyAsync(x => x.UserId != excludingUserId && x.Phone == phone, cancellationToken);

    public Task<RefreshToken?> FindRefreshTokenAsync(string tokenHash, CancellationToken cancellationToken) =>
        dbContext.RefreshTokens.Include(x => x.User).ThenInclude(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

    public Task<AuthOtpChallenge?> FindOtpChallengeAsync(Guid challengeId, CancellationToken cancellationToken) =>
        dbContext.AuthOtpChallenges.Include(x => x.User!).ThenInclude(x => x.UserRoles).ThenInclude(x => x.Role)
            .Include(x => x.User!).ThenInclude(x => x.RefreshTokens)
            .SingleOrDefaultAsync(x => x.ChallengeId == challengeId, cancellationToken);

    public Task<AuthOtpChallenge?> FindRecentOtpChallengeAsync(string destination, string purpose, DateTime createdAfter, CancellationToken cancellationToken) =>
        dbContext.AuthOtpChallenges.OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(x => x.Destination == destination && x.Purpose == purpose &&
                x.ConsumedAt == null && x.CreatedAt >= createdAfter, cancellationToken);

    public Task AddAsync(User user, CancellationToken cancellationToken) =>
        dbContext.Users.AddAsync(user, cancellationToken).AsTask();

    public Task AddRefreshTokenAsync(RefreshToken token, CancellationToken cancellationToken) =>
        dbContext.RefreshTokens.AddAsync(token, cancellationToken).AsTask();

    public Task AddOtpChallengeAsync(AuthOtpChallenge challenge, CancellationToken cancellationToken) =>
        dbContext.AuthOtpChallenges.AddAsync(challenge, cancellationToken).AsTask();

    public Task AddExternalLoginAsync(ExternalLogin login, CancellationToken cancellationToken) =>
        dbContext.ExternalLogins.AddAsync(login, cancellationToken).AsTask();

    public Task<bool> RoleExistsAsync(string roleName, CancellationToken cancellationToken) =>
        dbContext.Roles.AnyAsync(x => x.RoleName == roleName, cancellationToken);

    public Task<Role?> FindRoleAsync(string roleName, CancellationToken cancellationToken) =>
        dbContext.Roles.SingleOrDefaultAsync(x => x.RoleName == roleName, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
