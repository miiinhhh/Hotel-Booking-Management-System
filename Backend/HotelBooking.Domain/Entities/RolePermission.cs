namespace HotelBooking.Domain.Entities;

public sealed class RolePermission
{
    public int RoleId { get; set; }
    public int PermissionId { get; set; }
    public DateTime GrantedAt { get; set; }
    public long? GrantedByUserId { get; set; }
    public Role Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}

