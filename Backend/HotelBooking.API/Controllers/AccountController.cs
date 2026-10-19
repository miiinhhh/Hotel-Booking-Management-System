using System.Security.Claims;
using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class AccountController(IAccountService accountService) : ControllerBase
{
    /// <summary>Returns the profile of the authenticated account.</summary>
    [HttpGet("me", Name = nameof(GetCurrentUser))]
    [ProducesResponseType<AccountProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountProfileResponse>> GetCurrentUser(
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized();

        var profile = await accountService.GetProfileAsync(userId.Value, cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>Updates editable profile fields for the authenticated account.</summary>
    [HttpPut("me", Name = nameof(UpdateCurrentUser))]
    [ProducesResponseType<AccountProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AccountProfileResponse>> UpdateCurrentUser(
        UpdateAccountProfileRequest request,
        CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return Unauthorized();

        var profile = await accountService.UpdateProfileAsync(
            userId.Value,
            request,
            cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>Example resource available to hotel staff and administrators.</summary>
    [HttpGet("staff/resource")]
    [Authorize(Roles = $"{SystemRoles.HotelStaff},{SystemRoles.Admin}")]
    public IActionResult GetStaffResource() => Ok(new { Message = "Hotel staff resource authorized." });

    /// <summary>Example resource available only to administrators.</summary>
    [HttpGet("admin")]
    [Authorize(Roles = SystemRoles.Admin)]
    public IActionResult GetAdminResource() => Ok(new { Message = "Administrator resource authorized." });

    private long? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return long.TryParse(value, out var userId) && userId > 0 ? userId : null;
    }
}
