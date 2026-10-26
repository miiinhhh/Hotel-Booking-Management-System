namespace HotelBooking.Domain.Entities;

public sealed class StaffAreaAssignment
{
    public long AssignmentId { get; set; }
    public long UserId { get; set; }
    public int AreaId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public long? AssignedByUserId { get; set; }
    public bool IsActive { get; set; } = true;

    // Navigation properties
    public User? User { get; set; }
    public HotelArea? Area { get; set; }
    public User? AssignedByUser { get; set; }
}
