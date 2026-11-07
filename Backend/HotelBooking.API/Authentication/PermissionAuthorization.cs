using Microsoft.AspNetCore.Authorization;

namespace HotelBooking.API.Authentication;

public static class PermissionAuthorization
{
    public const string ClaimType = "permission";
    public const string PolicyPrefix = "Permission:";
    public static string Policy(string permission) => PolicyPrefix + permission;
}

public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission)
    {
        Permission = permission;
        Policy = PermissionAuthorization.Policy(permission);
    }

    public string Permission { get; }
}

