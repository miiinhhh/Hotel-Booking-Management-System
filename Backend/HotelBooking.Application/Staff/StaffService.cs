using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using HotelBooking.Application.Auth;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Staff;

public sealed class StaffAccessDeniedException() : Exception("You cannot manage this staff account.");

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record UpdateStaffRequest(
    [Required, StringLength(150, MinimumLength = 2)] string FullName,
    [Phone, StringLength(20)] string? Phone,
    DateOnly? DateOfBirth);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record StaffStatusRequest([Required] bool? IsActive);

public sealed record StaffResponse(long UserId, string FullName, string Email, string? Phone,
    DateOnly? DateOfBirth, bool IsActive, IReadOnlyList<string> Roles);
public sealed record StaffPage(IReadOnlyList<StaffResponse> Items, int Page, int PageSize, int Total);

public interface IStaffRepository
{
    Task<(IReadOnlyList<User> Users, int Total)> ListAsync(long? onlyUserId, int page, int pageSize, CancellationToken ct);
}

public sealed class StaffService(IUserRepository users, IStaffRepository staff)
{
    private async Task<User> Actor(long id, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(id, ct);
        if (user is null || !user.IsActive || !user.UserRoles.Any(x => x.Role.RoleName is SystemRoles.Admin or SystemRoles.HotelStaff))
            throw new StaffAccessDeniedException();
        return user;
    }
    private static bool IsAdmin(User user) => user.UserRoles.Any(x => x.Role.RoleName == SystemRoles.Admin);
    private async Task<User> Target(long actorId, long targetId, bool adminOnly, CancellationToken ct)
    {
        var actor = await Actor(actorId, ct);
        if ((!IsAdmin(actor) && (adminOnly || actorId != targetId))) throw new StaffAccessDeniedException();
        var target = await users.FindByIdAsync(targetId, ct);
        if (target is null || !target.UserRoles.Any(x => x.Role.RoleName == SystemRoles.HotelStaff))
            throw new NotFoundException("Staff account not found.");
        // A staff-management endpoint must never modify an administrator account.
        if (IsAdmin(target) && adminOnly) throw new StaffAccessDeniedException();
        if (IsAdmin(target) && actorId != targetId) throw new StaffAccessDeniedException();
        return target;
    }
    public async Task<StaffPage> List(long actorId, int page, int pageSize, CancellationToken ct)
    {
        if (page < 1 || pageSize < 1 || pageSize > 100) throw new DomainRuleException("Page must be positive and pageSize must be between 1 and 100.");
        var actor = await Actor(actorId, ct);
        var result = await staff.ListAsync(IsAdmin(actor) ? null : actorId, page, pageSize, ct);
        return new(result.Users.Select(Map).ToArray(), page, pageSize, result.Total);
    }
    public async Task<StaffResponse> Get(long actorId, long id, CancellationToken ct) => Map(await Target(actorId, id, false, ct));
    public async Task<StaffResponse> Update(long actorId, long id, UpdateStaffRequest request, CancellationToken ct)
    {
        var target = await Target(actorId, id, false, ct);
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length is < 2 or > 150 || request.Phone?.Length > 20)
            throw new DomainRuleException("Invalid staff name or phone number.");
        if (request.DateOfBirth > DateOnly.FromDateTime(DateTime.UtcNow)) throw new DomainRuleException("Date of birth cannot be in the future.");
        target.FullName = request.FullName.Trim();
        target.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        target.DateOfBirth = request.DateOfBirth?.ToDateTime(TimeOnly.MinValue);
        target.UpdatedAt = DateTime.UtcNow;
        await users.SaveChangesAsync(ct);
        return Map(target);
    }
    public async Task<StaffResponse> SetActive(long actorId, long id, bool active, CancellationToken ct)
    {
        var target = await Target(actorId, id, true, ct);
        target.IsActive = active;
        target.UpdatedAt = DateTime.UtcNow;
        await users.SaveChangesAsync(ct);
        return Map(target);
    }
    private static StaffResponse Map(User u) => new(u.UserId, u.FullName, u.Email, u.Phone,
        u.DateOfBirth is { } date ? DateOnly.FromDateTime(date) : null, u.IsActive,
        u.UserRoles.Select(x => x.Role.RoleName).ToArray());
}
