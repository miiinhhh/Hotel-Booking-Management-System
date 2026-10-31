namespace HotelBooking.Domain.Entities;

public sealed class User
{
    public long UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public bool IsActive { get; set; } = true;
    public int AccessFailedCount { get; set; }
    public DateTime? LockoutEnd { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public int TokenVersion { get; set; }
    public string? AvatarStorageKey { get; set; }
    public string? AvatarContentType { get; set; }
    public DateTime? AvatarUpdatedAt { get; set; }
    public DateTime? LastReauthenticatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<ExternalLogin> ExternalLogins { get; set; } = new List<ExternalLogin>();
    public ICollection<StaffAreaAssignment> StaffAreaAssignments { get; set; } = new List<StaffAreaAssignment>();
}
