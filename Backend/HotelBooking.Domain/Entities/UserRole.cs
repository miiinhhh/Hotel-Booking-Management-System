namespace HotelBooking.Domain.Entities;

public sealed class UserRole
{
    public long UserId { get; set; }
    public int RoleId { get; set; }
    public DateTime AssignedAt { get; set; }
    public User User { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
