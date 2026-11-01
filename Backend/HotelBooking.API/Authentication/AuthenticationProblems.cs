using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Authentication;

public static class AuthenticationErrorCodes
{
    public const string InvalidCredentials = "AUTH_INVALID_CREDENTIALS";
    public const string TokenMissing = "AUTH_TOKEN_MISSING";
    public const string TokenInvalid = "AUTH_TOKEN_INVALID";
    public const string TokenExpired = "AUTH_TOKEN_EXPIRED";
    public const string AccountUnavailable = "AUTH_ACCOUNT_UNAVAILABLE";
    public const string AccessDenied = "AUTH_ACCESS_DENIED";
    public const string AccountLocked = "AUTH_ACCOUNT_LOCKED";
    public const string RefreshTokenInvalid = "AUTH_REFRESH_TOKEN_INVALID";
    public const string OtpInvalid = "AUTH_OTP_INVALID";
    public const string OtpExpired = "AUTH_OTP_EXPIRED";
    public const string ExternalProviderRejected = "AUTH_EXTERNAL_PROVIDER_REJECTED";
}

public static class AuthenticationProblems
{
    public static ProblemDetails Create(
        HttpContext context,
        int status,
        string code,
        string title,
        string detail)
    {
        var problem = new ProblemDetails
        {
            Type = status == StatusCodes.Status401Unauthorized
                ? "https://datatracker.ietf.org/doc/html/rfc9110#name-401-unauthorized"
                : "https://datatracker.ietf.org/doc/html/rfc9110#name-403-forbidden",
            Title = title,
            Status = status,
            Detail = detail,
            Instance = context.Request.Path
        };
        problem.Extensions["code"] = code;
        problem.Extensions["traceId"] = context.TraceIdentifier;
        return problem;
    }

    public static ProblemDetails InvalidCredentials(HttpContext context) => Create(
        context,
        StatusCodes.Status401Unauthorized,
        AuthenticationErrorCodes.InvalidCredentials,
        "Authentication failed",
        "The email or password is incorrect, or the account is inactive.");

    public static ProblemDetails AuthenticationRequired(
        HttpContext context,
        string code = AuthenticationErrorCodes.TokenMissing,
        string detail = "A valid bearer token is required to access this resource.") => Create(
            context,
            StatusCodes.Status401Unauthorized,
            code,
            "Authentication required",
            detail);

    public static ProblemDetails Forbidden(HttpContext context, string? detail = null) => Create(
        context,
        StatusCodes.Status403Forbidden,
        AuthenticationErrorCodes.AccessDenied,
        "Access denied",
        detail ?? "Your account does not have permission to access this resource.");
}
