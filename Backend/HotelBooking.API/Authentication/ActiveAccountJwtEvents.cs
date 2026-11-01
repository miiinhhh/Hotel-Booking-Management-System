using System.Security.Claims;
using HotelBooking.Application.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace HotelBooking.API.Authentication;

public sealed class ActiveAccountJwtEvents(IUserRepository users) : JwtBearerEvents
{
    private const string AuthenticationErrorItem = "AuthenticationError";

    public override async Task TokenValidated(TokenValidatedContext context)
    {
        var idClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.Principal?.FindFirstValue("sub");
        if (!long.TryParse(idClaim, out var id) || id <= 0)
        {
            context.HttpContext.Items[AuthenticationErrorItem] = AuthenticationErrorCodes.TokenInvalid;
            context.Fail("Invalid account identifier.");
            return;
        }
        var user = await users.FindByIdAsync(id, context.HttpContext.RequestAborted);
        if (user is null || !user.IsActive)
        {
            context.HttpContext.Items[AuthenticationErrorItem] = AuthenticationErrorCodes.AccountUnavailable;
            context.Fail("Account is unavailable.");
            return;
        }
        if (!int.TryParse(context.Principal?.FindFirstValue("token_version"), out var tokenVersion) ||
            tokenVersion != user.TokenVersion)
        {
            context.HttpContext.Items[AuthenticationErrorItem] = AuthenticationErrorCodes.TokenInvalid;
            context.Fail("The session has been revoked.");
            return;
        }
        // Use current database roles, never stale roles from an earlier JWT.
        var identity = (ClaimsIdentity)context.Principal!.Identity!;
        foreach (var claim in identity.FindAll(identity.RoleClaimType).ToArray()) identity.RemoveClaim(claim);
        foreach (var role in user.UserRoles.Select(x => x.Role.RoleName).Distinct())
            identity.AddClaim(new Claim(identity.RoleClaimType, role));
        foreach (var claim in identity.FindAll(ClaimTypes.NameIdentifier).ToArray()) identity.RemoveClaim(claim);
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, id.ToString()));
    }

    public override async Task Challenge(JwtBearerChallengeContext context)
    {
        context.HandleResponse();
        var (code, detail) = ResolveChallenge(context);
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(
            AuthenticationProblems.AuthenticationRequired(context.HttpContext, code, detail),
            options: null,
            contentType: "application/problem+json",
            cancellationToken: context.HttpContext.RequestAborted);
    }

    public override async Task Forbidden(ForbiddenContext context)
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(
            AuthenticationProblems.Forbidden(context.HttpContext),
            options: null,
            contentType: "application/problem+json",
            cancellationToken: context.HttpContext.RequestAborted);
    }

    private static (string Code, string Detail) ResolveChallenge(JwtBearerChallengeContext context)
    {
        if (context.HttpContext.Items[AuthenticationErrorItem] is string code &&
            code == AuthenticationErrorCodes.AccountUnavailable)
        {
            return (code, "The account is inactive or no longer available.");
        }

        if (context.AuthenticateFailure is SecurityTokenExpiredException)
            return (AuthenticationErrorCodes.TokenExpired, "The bearer token has expired. Sign in again to continue.");

        if (context.HttpContext.Request.Headers.Authorization.Count == 0)
            return (AuthenticationErrorCodes.TokenMissing, "A bearer token is required to access this resource.");

        return (AuthenticationErrorCodes.TokenInvalid, "The bearer token is invalid or cannot be verified.");
    }
}
