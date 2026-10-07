using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public sealed class UserRepository(HotelBookingDbContext dbContext) : IUserRepository
{
    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken) =>
        dbContext.Users.Include(x => x.UserRoles).ThenInclude(x => x.Role)
            .SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

    public Task AddAsync(User user, CancellationToken cancellationToken) =>
        dbContext.Users.AddAsync(user, cancellationToken).AsTask();

    public Task<bool> RoleExistsAsync(string roleName, CancellationToken cancellationToken) =>
        dbContext.Roles.AnyAsync(x => x.RoleName == roleName, cancellationToken);

    public Task<Role?> FindRoleAsync(string roleName, CancellationToken cancellationToken) =>
        dbContext.Roles.SingleOrDefaultAsync(x => x.RoleName == roleName, cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
