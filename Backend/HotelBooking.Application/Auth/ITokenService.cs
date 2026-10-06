using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public interface ITokenService
{
    (string Token, DateTimeOffset ExpiresAt) CreateToken(User user, IReadOnlyCollection<string> roles);
}
