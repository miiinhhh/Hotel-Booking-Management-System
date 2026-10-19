using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Staff;
using HotelBooking.Application.Interfaces;

namespace HotelBooking.Application.Services;

public class StaffAreaAssignmentService : IStaffAreaAssignmentService
{
    private readonly IStaffAreaAssignmentRepository _repository;

    public StaffAreaAssignmentService(IStaffAreaAssignmentRepository repository)
    {
        _repository = repository;
    }

    public async Task<ApiResponse<IReadOnlyList<StaffMemberDto>>> GetHotelStaffAssignmentsAsync(int hotelId, CancellationToken ct)
    {
        if (hotelId <= 0)
        {
            return ApiResponse<IReadOnlyList<StaffMemberDto>>.FailureResult("Mã khách sạn không hợp lệ.");
        }

        if (!await _repository.HotelExistsAndActiveAsync(hotelId, ct))
        {
            return ApiResponse<IReadOnlyList<StaffMemberDto>>.FailureResult("Khách sạn không tồn tại hoặc đã tạm dừng hoạt động.");
        }

        var staffList = await _repository.GetStaffMembersWithAssignmentsAsync(hotelId, ct);
        return ApiResponse<IReadOnlyList<StaffMemberDto>>.SuccessResult(staffList, "Lấy danh sách phân công nhân viên thành công.");
    }

    public async Task<ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>> GetMyAssignedAreasAsync(long userId, int? hotelId, CancellationToken ct)
    {
        if (userId <= 0)
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Mã người dùng không hợp lệ.");
        }

        var areas = await _repository.GetAssignedAreasForUserAsync(userId, hotelId, ct);
        return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.SuccessResult(areas, "Lấy danh sách phân khu phụ trách thành công.");
    }

    public async Task<ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>> SyncStaffAreasAsync(
        int hotelId,
        AssignStaffAreasRequest request,
        long? assignedByUserId,
        CancellationToken ct)
    {
        if (hotelId <= 0)
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Mã khách sạn không hợp lệ.");
        }

        if (request.UserId <= 0)
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Vui lòng chọn nhân viên cần phân công.");
        }

        if (!await _repository.HotelExistsAndActiveAsync(hotelId, ct))
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Khách sạn không tồn tại hoặc đã tạm dừng hoạt động.");
        }

        var user = await _repository.FindUserWithRolesAsync(request.UserId, ct);
        if (user == null || !user.IsActive)
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Nhân viên không tồn tại hoặc tài khoản đang bị khóa.");
        }

        // Kiểm tra vai trò của người dùng: chỉ cho phép phân công cho Staff hoặc Manager
        var allowedRoles = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Hotel Staff",
            "Hotel Manager",
            "Staff",
            "Manager",
            "Admin"
        };

        bool hasStaffRole = user.UserRoles.Any(ur => ur.Role != null && allowedRoles.Contains(ur.Role.RoleName));
        if (!hasStaffRole)
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Chỉ có thể phân công phân khu cho tài khoản nhân sự (Hotel Staff / Manager).");
        }

        // Kiểm tra các AreaIds có thuộc khách sạn và còn active không
        var cleanAreaIds = request.AreaIds.Distinct().ToList();
        if (cleanAreaIds.Count > 0)
        {
            var hotelAreas = await _repository.GetAreasByHotelAsync(hotelId, ct);
            var hotelAreaMap = hotelAreas.ToDictionary(a => a.AreaId);

            foreach (var areaId in cleanAreaIds)
            {
                if (!hotelAreaMap.TryGetValue(areaId, out var area) || !area.IsActive)
                {
                    return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult(
                        $"Phân khu có mã #{areaId} không tồn tại hoặc không thuộc quyền quản lý của khách sạn này.");
                }
            }
        }

        // Thực hiện đồng bộ phân công
        await _repository.SyncAssignmentsForUserAsync(request.UserId, cleanAreaIds, assignedByUserId, ct);
        await _repository.SaveChangesAsync(ct);

        var updatedAreas = await _repository.GetAssignedAreasForUserAsync(request.UserId, hotelId, ct);
        return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.SuccessResult(
            updatedAreas,
            $"Đã cập nhật phân công {updatedAreas.Count} phân khu cho nhân viên {user.FullName}.");
    }

    public async Task<ApiResponse<bool>> RemoveAssignmentAsync(int hotelId, long assignmentId, CancellationToken ct)
    {
        if (assignmentId <= 0)
        {
            return ApiResponse<bool>.FailureResult("Mã phân công không hợp lệ.");
        }

        var assignment = await _repository.GetAssignmentByIdAsync(assignmentId, ct);
        if (assignment == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy phân công yêu cầu.");
        }

        if (assignment.Area != null && assignment.Area.HotelId != hotelId)
        {
            return ApiResponse<bool>.FailureResult("Phân công này không thuộc khách sạn hiện tại.");
        }

        await _repository.DeactivateAssignmentAsync(assignmentId, ct);
        await _repository.SaveChangesAsync(ct);

        return ApiResponse<bool>.SuccessResult(true, "Hủy phân công phân khu thành công.");
    }

    public async Task<ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>> GetHotelAreasAsync(int hotelId, CancellationToken ct)
    {
        if (hotelId <= 0)
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Mã khách sạn không hợp lệ.");
        }

        if (!await _repository.HotelExistsAndActiveAsync(hotelId, ct))
        {
            return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.FailureResult("Khách sạn không tồn tại hoặc đã tạm dừng hoạt động.");
        }

        var areas = await _repository.GetAreasByHotelAsync(hotelId, ct);
        var dtos = areas.Select(a => new StaffAssignedAreaDto
        {
            AreaId = a.AreaId,
            HotelId = a.HotelId,
            AreaName = a.AreaName,
            AreaType = a.AreaType,
            ParentAreaId = a.ParentAreaId,
            ParentAreaName = a.ParentArea?.AreaName,
            Description = a.Description,
            FloorCount = a.FloorCount,
            TotalRooms = a.Rooms?.Count ?? 0,
            AvailableRooms = a.Rooms?.Count(r => r.Status == Domain.Entities.RoomStatus.Available) ?? 0,
            OccupiedRooms = a.Rooms?.Count(r => r.Status == Domain.Entities.RoomStatus.Occupied) ?? 0,
            IsActive = a.IsActive
        }).ToList();

        return ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>.SuccessResult(dtos, "Lấy danh sách phân khu thành công.");
    }
}
