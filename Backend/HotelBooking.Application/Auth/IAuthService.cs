namespace HotelBooking.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, AuthClientContext client, CancellationToken cancellationToken);
    Task<AuthResult> LoginAsync(LoginRequest request, AuthClientContext client, CancellationToken cancellationToken);
    Task<AuthResult> RefreshAsync(string refreshToken, AuthClientContext client, CancellationToken cancellationToken);
    Task LogoutAsync(string refreshToken, AuthClientContext client, CancellationToken cancellationToken);
    Task LogoutAllAsync(long userId, AuthClientContext client, CancellationToken cancellationToken);
    Task<OtpChallengeResponse> RequestOtpAsync(OtpRequest request, CancellationToken cancellationToken);
    Task<AuthResult> VerifyOtpAsync(OtpVerifyRequest request, AuthClientContext client, CancellationToken cancellationToken);
    Task<AuthFailure> ResetPasswordAsync(ResetPasswordRequest request, AuthClientContext client, CancellationToken cancellationToken);
    Task<AuthResult> GoogleLoginAsync(GoogleLoginRequest request, AuthClientContext client, CancellationToken cancellationToken);
}
