using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public interface IUserRepository
{
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);
    Task AddAsync(User user, CancellationToken cancellationToken);
    Task<bool> RoleExistsAsync(string roleName, CancellationToken cancellationToken);
    Task<Role?> FindRoleAsync(string roleName, CancellationToken cancellationToken);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
