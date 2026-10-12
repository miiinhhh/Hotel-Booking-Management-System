using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public sealed class AuthService(
    IUserRepository userRepository,
    IPasswordHasher passwordHasher,
    ITokenService tokenService) : IAuthService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var existing = await userRepository.FindByEmailAsync(email, cancellationToken);
        if (existing is not null)
            throw new DuplicateEmailException(email);

        var customerRole = await userRepository.FindRoleAsync(SystemRoles.Customer, cancellationToken)
            ?? throw new InvalidOperationException("The Customer role has not been configured.");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = email,
            PasswordHash = passwordHasher.Hash(request.Password),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            DateOfBirth = request.DateOfBirth,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.UserRoles.Add(new UserRole { User = user, Role = customerRole, AssignedAt = DateTime.UtcNow });

        await userRepository.AddAsync(user, cancellationToken);
        await userRepository.SaveChangesAsync(cancellationToken);
        return CreateResponse(user, [SystemRoles.Customer]);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await userRepository.FindByEmailAsync(email, cancellationToken);
        if (user is null || !user.IsActive || !passwordHasher.Verify(request.Password, user.PasswordHash))
            return null;

        var roles = user.UserRoles.Select(x => x.Role.RoleName).ToArray();
        return CreateResponse(user, roles);
    }

    private AuthResponse CreateResponse(User user, IReadOnlyList<string> roles)
    {
        var token = tokenService.CreateToken(user, roles);
        return new AuthResponse(user.UserId, user.FullName, user.Email, roles, token.Token, token.ExpiresAt);
    }
}
