using System.Security.Claims;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Controllers;

[ApiController]
[Route("api")]
[Authorize]
public sealed class AccountController : ControllerBase
{
    /// <summary>Returns the authenticated user's identity and roles.</summary>
    [HttpGet("me", Name = nameof(GetCurrentUser))]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public IActionResult GetCurrentUser()
    {
        return Ok(new
        {
            UserId = User.FindFirstValue(ClaimTypes.NameIdentifier),
            Name = User.Identity?.Name,
            Roles = User.FindAll(ClaimTypes.Role).Select(claim => claim.Value).ToArray()
        });
    }

    /// <summary>Example resource available to hotel staff and administrators.</summary>
    [HttpGet("staff")]
    [Authorize(Roles = $"{SystemRoles.HotelStaff},{SystemRoles.Admin}")]
    public IActionResult GetStaffResource() => Ok(new { Message = "Hotel staff resource authorized." });

    /// <summary>Example resource available only to administrators.</summary>
    [HttpGet("admin")]
    [Authorize(Roles = SystemRoles.Admin)]
    public IActionResult GetAdminResource() => Ok(new { Message = "Administrator resource authorized." });
}
