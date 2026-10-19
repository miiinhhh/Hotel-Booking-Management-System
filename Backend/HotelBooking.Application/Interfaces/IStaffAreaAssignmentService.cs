using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Staff;

namespace HotelBooking.Application.Interfaces;

public interface IStaffAreaAssignmentService
{
    Task<ApiResponse<IReadOnlyList<StaffMemberDto>>> GetHotelStaffAssignmentsAsync(int hotelId, CancellationToken ct);
    Task<ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>> GetMyAssignedAreasAsync(long userId, int? hotelId, CancellationToken ct);
    Task<ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>> SyncStaffAreasAsync(int hotelId, AssignStaffAreasRequest request, long? assignedByUserId, CancellationToken ct);
    Task<ApiResponse<bool>> RemoveAssignmentAsync(int hotelId, long assignmentId, CancellationToken ct);
    Task<ApiResponse<IReadOnlyList<StaffAssignedAreaDto>>> GetHotelAreasAsync(int hotelId, CancellationToken ct);
}
