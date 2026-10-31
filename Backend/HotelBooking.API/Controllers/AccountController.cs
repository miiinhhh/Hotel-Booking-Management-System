using System.Security.Claims;
using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Authentication;
using HotelBooking.Application.DTOs;

namespace HotelBooking.API.Controllers;

public sealed class AvatarUploadForm
{
    [System.ComponentModel.DataAnnotations.Required]
    public IFormFile File { get; set; } = null!;
}

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
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));

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
            return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));

        var profile = await accountService.UpdateProfileAsync(
            userId.Value,
            request,
            cancellationToken);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>Checks whether an email address and/or phone number is available for this account.</summary>
    [HttpGet("me/availability")]
    public async Task<ActionResult<AccountAvailabilityResponse>> CheckAvailability(
        [FromQuery] string? email, [FromQuery] string? phone, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        return Ok(await accountService.CheckAvailabilityAsync(userId.Value, email, phone, ct));
    }

    /// <summary>Verifies the current password before a sensitive account action.</summary>
    [HttpPost("me/reauthenticate")]
    public async Task<ActionResult<ReauthenticationResponse>> Reauthenticate(ReauthenticateRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        var result = await accountService.ReauthenticateAsync(userId.Value, request.Password, ct);
        return result is null ? Unauthorized(ReauthenticationFailed()) : Ok(result);
    }

    /// <summary>Changes the password and revokes all existing sessions.</summary>
    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        var result = await accountService.ChangePasswordAsync(userId.Value, request, ct);
        return result switch
        {
            AccountOperationResult.Success => NoContent(),
            AccountOperationResult.NotFound => NotFound(),
            _ => Unauthorized(ReauthenticationFailed())
        };
    }

    /// <summary>Uploads or replaces the current account avatar.</summary>
    [HttpPut("me/avatar")]
    [RequestSizeLimit(6 * 1024 * 1024), RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<AccountProfileResponse>> UpdateAvatar([FromForm] AvatarUploadForm request, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        await using var stream = request.File.OpenReadStream();
        var profile = await accountService.UpdateAvatarAsync(userId.Value,
            new ImageUpload(stream, request.File.FileName, request.File.ContentType, request.File.Length, null, true), ct);
        return profile is null ? NotFound() : Ok(profile);
    }

    /// <summary>Returns the current account avatar contents.</summary>
    [HttpGet("me/avatar/content")]
    public async Task<IActionResult> AvatarContent(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        var avatar = await accountService.OpenAvatarAsync(userId.Value, ct);
        if (avatar is null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(avatar.Content, avatar.ContentType);
    }

    /// <summary>Returns a public avatar image suitable for direct use by frontend image elements.</summary>
    [HttpGet("users/{userId:long:min(1)}/avatar"), AllowAnonymous]
    public async Task<IActionResult> PublicAvatar(long userId, CancellationToken ct)
    {
        var avatar = await accountService.OpenAvatarAsync(userId, ct);
        if (avatar is null) return NotFound();
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers.CacheControl = "public,max-age=300";
        return File(avatar.Content, avatar.ContentType);
    }

    /// <summary>Removes the current account avatar.</summary>
    [HttpDelete("me/avatar")]
    public async Task<IActionResult> DeleteAvatar(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized(AuthenticationProblems.AuthenticationRequired(HttpContext));
        return await accountService.DeleteAvatarAsync(userId.Value, ct) == AccountOperationResult.NotFound
            ? NotFound()
            : NoContent();
    }

    /// <summary>Example resource available to hotel staff and administrators.</summary>
    [HttpGet("staff/resource")]
    [Authorize(Policy = AuthorizationPolicies.StaffOrAdmin)]
    public IActionResult GetStaffResource() => Ok(new { Message = "Hotel staff resource authorized." });

    /// <summary>Example resource available only to administrators.</summary>
    [HttpGet("admin")]
    [Authorize(Policy = AuthorizationPolicies.AdminOnly)]
    public IActionResult GetAdminResource() => Ok(new { Message = "Administrator resource authorized." });

    private long? GetCurrentUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return long.TryParse(value, out var userId) && userId > 0 ? userId : null;
    }

    private ProblemDetails ReauthenticationFailed() => AuthenticationProblems.Create(
        HttpContext, StatusCodes.Status401Unauthorized, "AUTH_REAUTHENTICATION_FAILED",
        "Reauthentication failed", "The current password is incorrect.");
}
