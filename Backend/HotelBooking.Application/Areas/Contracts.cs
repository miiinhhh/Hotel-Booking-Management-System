using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.Areas;

public sealed record HotelAreaRequest(
    [Required, StringLength(150)] string AreaName,
    [Required, RegularExpression("(?i)^(Zone|Building)$", ErrorMessage = "AreaType must be Zone or Building.")] string AreaType,
    [Range(1, int.MaxValue)] int? ParentAreaId,
    [StringLength(500)] string? Description,
    [StringLength(500)] string? LocationDescription,
    [Range(1, int.MaxValue)] int? FloorCount,
    bool IsActive = true);

public sealed record HotelAreaDto(
    int AreaId,
    int HotelId,
    string AreaName,
    string AreaType,
    int? ParentAreaId,
    string? ParentAreaName,
    string? Description,
    string? LocationDescription,
    int? FloorCount,
    bool IsActive,
    int ChildAreaCount,
    int RoomTypeCount,
    int RoomCount,
    int AssignedStaffCount,
    DateTime CreatedAt,
    DateTime? UpdatedAt);
