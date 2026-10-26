using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.DTOs.Staff;

public sealed class StaffAssignedAreaDto
{
    public int AreaId { get; set; }
    public int HotelId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string AreaType { get; set; } = string.Empty; // "Zone" | "Building"
    public int? ParentAreaId { get; set; }
    public string? ParentAreaName { get; set; }
    public string? Description { get; set; }
    public int? FloorCount { get; set; }
    public int TotalRooms { get; set; }
    public int AvailableRooms { get; set; }
    public int OccupiedRooms { get; set; }
    public DateTime? AssignedAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public sealed class StaffMemberDto
{
    public long UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<StaffAssignedAreaDto> AssignedAreas { get; set; } = new();
}

public sealed class AssignStaffAreasRequest
{
    [Required]
    [Range(1, long.MaxValue, ErrorMessage = "UserId phải lớn hơn 0.")]
    public long UserId { get; set; }

    /// <summary>
    /// Danh sách các AreaId mà nhân viên sẽ phụ trách.
    /// Nếu danh sách rỗng, toàn bộ phân công trước đó sẽ được hủy bỏ.
    /// </summary>
    public List<int> AreaIds { get; set; } = new();
}

public sealed class StaffAssignmentResponseDto
{
    public long AssignmentId { get; set; }
    public long UserId { get; set; }
    public string StaffName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string AreaType { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public long? AssignedByUserId { get; set; }
    public bool IsActive { get; set; }
}
