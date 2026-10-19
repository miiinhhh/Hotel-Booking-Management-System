using System.Security.Claims;
using HotelBooking.Application.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace HotelBooking.API.Authentication;

public sealed class ActiveAccountJwtEvents(IUserRepository users) : JwtBearerEvents
{
    public override async Task TokenValidated(TokenValidatedContext context)
    {
        var idClaim = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.Principal?.FindFirstValue("sub");
        if (!long.TryParse(idClaim, out var id) || id <= 0)
        {
            context.Fail("Invalid account."); return;
        }
        var user = await users.FindByIdAsync(id, context.HttpContext.RequestAborted);
        if (user is null || !user.IsActive)
        {
            context.Fail("Account is unavailable."); return;
        }
        // Use current database roles, never stale roles from an earlier JWT.
        var identity = (ClaimsIdentity)context.Principal!.Identity!;
        foreach (var claim in identity.FindAll(identity.RoleClaimType).ToArray()) identity.RemoveClaim(claim);
        foreach (var role in user.UserRoles.Select(x => x.Role.RoleName).Distinct())
            identity.AddClaim(new Claim(identity.RoleClaimType, role));
        foreach (var claim in identity.FindAll(ClaimTypes.NameIdentifier).ToArray()) identity.RemoveClaim(claim);
        identity.AddClaim(new Claim(ClaimTypes.NameIdentifier, id.ToString()));
    }
}
