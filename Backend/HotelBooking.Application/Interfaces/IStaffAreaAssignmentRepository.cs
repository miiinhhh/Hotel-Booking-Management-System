using HotelBooking.Application.DTOs.Staff;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public interface IStaffAreaAssignmentRepository
{
    Task<bool> HotelExistsAndActiveAsync(int hotelId, CancellationToken ct);
    Task<IReadOnlyList<HotelArea>> GetAreasByHotelAsync(int hotelId, CancellationToken ct);
    Task<HotelArea?> GetAreaByIdAsync(int areaId, CancellationToken ct);
    Task<IReadOnlyList<StaffMemberDto>> GetStaffMembersWithAssignmentsAsync(int hotelId, CancellationToken ct);
    Task<IReadOnlyList<StaffAssignedAreaDto>> GetAssignedAreasForUserAsync(long userId, int? hotelId, CancellationToken ct);
    Task<User?> FindUserWithRolesAsync(long userId, CancellationToken ct);
    Task<StaffAreaAssignment?> GetAssignmentAsync(long userId, int areaId, CancellationToken ct);
    Task<StaffAreaAssignment?> GetAssignmentByIdAsync(long assignmentId, CancellationToken ct);
    Task AddAssignmentAsync(StaffAreaAssignment assignment, CancellationToken ct);
    Task SyncAssignmentsForUserAsync(long userId, List<int> newAreaIds, long? assignedByUserId, CancellationToken ct);
    Task<bool> DeactivateAssignmentAsync(long assignmentId, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
