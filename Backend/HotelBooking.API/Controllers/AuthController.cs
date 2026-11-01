using System.Security.Claims;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(IAuthService authService) : ControllerBase
{
    [HttpGet("availability"), AllowAnonymous]
    [ProducesResponseType(typeof(AccountAvailabilityResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AccountAvailabilityResponse>> CheckAvailability(
        [FromQuery] string? email, [FromQuery] string? phone, CancellationToken ct) =>
        Ok(await authService.CheckRegistrationAvailabilityAsync(email, phone, ct));

    [HttpPost("register"), AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken ct)
    {
        try
        {
            var response = await authService.RegisterAsync(request, Client(), ct);
            return CreatedAtAction(nameof(AccountController.GetCurrentUser), "Account", null, response);
        }
        catch (DuplicateEmailException exception)
        {
            return Conflict(Problem(StatusCodes.Status409Conflict, "AUTH_EMAIL_EXISTS", "Registration failed", exception.Message));
        }
        catch (DuplicatePhoneException exception)
        {
            return Conflict(Problem(StatusCodes.Status409Conflict, "AUTH_PHONE_EXISTS", "Registration failed", exception.Message));
        }
    }

    [HttpPost("login"), AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct) =>
        Result(await authService.LoginAsync(request, Client(), ct));

    [HttpPost("refresh"), AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct) =>
        Result(await authService.RefreshAsync(request.RefreshToken, Client(), ct));

    [HttpPost("logout"), AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Logout(LogoutRequest request, CancellationToken ct)
    {
        await authService.LogoutAsync(request.RefreshToken, Client(), ct);
        return NoContent();
    }

    [HttpPost("logout-all"), Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> LogoutAll(CancellationToken ct)
    {
        if (!long.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        await authService.LogoutAllAsync(userId, Client(), ct);
        return NoContent();
    }

    [HttpPost("otp/request"), AllowAnonymous]
    [ProducesResponseType(typeof(OtpChallengeResponse), StatusCodes.Status202Accepted)]
    public async Task<ActionResult<OtpChallengeResponse>> RequestOtp(OtpRequest request, CancellationToken ct)
    {
        try
        {
            return Accepted(await authService.RequestOtpAsync(request, ct));
        }
        catch (InvalidOperationException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                Problem(StatusCodes.Status503ServiceUnavailable, "AUTH_OTP_DELIVERY_UNAVAILABLE", "OTP unavailable",
                    "The selected OTP delivery channel is not available."));
        }
    }

    [HttpPost("otp/verify"), AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> VerifyOtp(OtpVerifyRequest request, CancellationToken ct) =>
        Result(await authService.VerifyOtpAsync(request, Client(), ct));

    [HttpPost("reset-password"), AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken ct)
    {
        var failure = await authService.ResetPasswordAsync(request, Client(), ct);
        if (failure == AuthFailure.None) return NoContent();
        return AuthFailureProblem(failure);
    }

    [HttpPost("google"), AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Google(GoogleLoginRequest request, CancellationToken ct) =>
        Result(await authService.GoogleLoginAsync(request, Client(), ct));

    private ActionResult<AuthResponse> Result(AuthResult result)
    {
        if (result.Response is not null) return Ok(result.Response);
        return AuthFailureProblem(result.Failure, result.RetryAt);
    }

    private ObjectResult AuthFailureProblem(AuthFailure failure, DateTimeOffset? retryAt = null)
    {
        var (status, code, title, detail) = failure switch
        {
            AuthFailure.LockedOut => (StatusCodes.Status423Locked, AuthenticationErrorCodes.AccountLocked,
                "Account locked", "Too many failed attempts. Try again after the lockout period."),
            AuthFailure.InvalidToken => (StatusCodes.Status401Unauthorized, AuthenticationErrorCodes.RefreshTokenInvalid,
                "Session expired", "The refresh token is invalid, expired or revoked."),
            AuthFailure.InvalidOtp => (StatusCodes.Status400BadRequest, AuthenticationErrorCodes.OtpInvalid,
                "Invalid verification code", "The verification code is invalid or has already been used."),
            AuthFailure.OtpExpired => (StatusCodes.Status410Gone, AuthenticationErrorCodes.OtpExpired,
                "Verification code expired", "Request a new verification code and try again."),
            AuthFailure.ProviderRejected => (StatusCodes.Status401Unauthorized, AuthenticationErrorCodes.ExternalProviderRejected,
                "Google authentication failed", "The Google identity token could not be verified."),
            _ => (StatusCodes.Status401Unauthorized, AuthenticationErrorCodes.InvalidCredentials,
                "Authentication failed", "The supplied credentials are not valid.")
        };
        var problem = Problem(status, code, title, detail);
        if (retryAt is not null)
        {
            problem.Extensions["retryAt"] = retryAt;
            Response.Headers.RetryAfter = Math.Max(1, (int)(retryAt.Value - DateTimeOffset.UtcNow).TotalSeconds).ToString();
        }
        return StatusCode(status, problem);
    }

    private ProblemDetails Problem(int status, string code, string title, string detail)
    {
        var problem = AuthenticationProblems.Create(HttpContext, status, code, title, detail);
        problem.Extensions["code"] = code;
        return problem;
    }

    private AuthClientContext Client() => new(
        HttpContext.Connection.RemoteIpAddress?.ToString(),
        Request.Headers.UserAgent.ToString());
}
