using HotelBooking.Application.DTOs.Staff;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public class StaffAreaAssignmentRepository : IStaffAreaAssignmentRepository
{
    private readonly HotelBookingDbContext _context;

    public StaffAreaAssignmentRepository(HotelBookingDbContext context)
    {
        _context = context;
    }

    public async Task<bool> HotelExistsAndActiveAsync(int hotelId, CancellationToken ct)
    {
        return await _context.Hotels.AnyAsync(h => h.HotelId == hotelId && h.IsActive, ct);
    }

    public async Task<IReadOnlyList<HotelArea>> GetAreasByHotelAsync(int hotelId, CancellationToken ct)
    {
        return await _context.HotelAreas
            .Where(a => a.HotelId == hotelId && a.IsActive)
            .Include(a => a.ParentArea)
            .Include(a => a.Rooms)
            .OrderBy(a => a.AreaType)
            .ThenBy(a => a.AreaName)
            .ToListAsync(ct);
    }

    public async Task<HotelArea?> GetAreaByIdAsync(int areaId, CancellationToken ct)
    {
        return await _context.HotelAreas
            .Include(a => a.ParentArea)
            .Include(a => a.Rooms)
            .FirstOrDefaultAsync(a => a.AreaId == areaId, ct);
    }

    public async Task<IReadOnlyList<StaffMemberDto>> GetStaffMembersWithAssignmentsAsync(int hotelId, CancellationToken ct)
    {
        // Lấy tất cả nhân sự có Role là Staff hoặc Manager
        var allowedRoles = new[] { "Hotel Staff", "Hotel Manager", "Staff", "Manager" };

        var users = await _context.Users
            .Where(u => u.UserRoles.Any(ur => allowedRoles.Contains(ur.Role.RoleName)))
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.StaffAreaAssignments)
                .ThenInclude(s => s.Area)
                    .ThenInclude(a => a!.Rooms)
            .OrderBy(u => u.FullName)
            .ToListAsync(ct);

        var result = new List<StaffMemberDto>();

        foreach (var user in users)
        {
            var roleName = user.UserRoles
                .Select(ur => ur.Role?.RoleName)
                .FirstOrDefault(r => r != null && allowedRoles.Contains(r)) ?? "Hotel Staff";

            // Lọc các phân khu đang active thuộc hotelId này
            var assignedAreas = user.StaffAreaAssignments
                .Where(sa => sa.IsActive && sa.Area != null && sa.Area.HotelId == hotelId && sa.Area.IsActive)
                .Select(sa => new StaffAssignedAreaDto
                {
                    AreaId = sa.Area!.AreaId,
                    HotelId = sa.Area.HotelId,
                    AreaName = sa.Area.AreaName,
                    AreaType = sa.Area.AreaType,
                    ParentAreaId = sa.Area.ParentAreaId,
                    Description = sa.Area.Description,
                    FloorCount = sa.Area.FloorCount,
                    TotalRooms = sa.Area.Rooms.Count,
                    AvailableRooms = sa.Area.Rooms.Count(r => r.Status == RoomStatus.Available),
                    OccupiedRooms = sa.Area.Rooms.Count(r => r.Status == RoomStatus.Occupied),
                    AssignedAt = sa.AssignedAt,
                    IsActive = sa.IsActive
                })
                .OrderBy(a => a.AreaName)
                .ToList();

            result.Add(new StaffMemberDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                Role = roleName,
                IsActive = user.IsActive,
                AssignedAreas = assignedAreas
            });
        }

        return result;
    }

    public async Task<IReadOnlyList<StaffAssignedAreaDto>> GetAssignedAreasForUserAsync(long userId, int? hotelId, CancellationToken ct)
    {
        var query = _context.StaffAreaAssignments
            .Where(sa => sa.UserId == userId && sa.IsActive && sa.Area != null && sa.Area.IsActive);

        if (hotelId.HasValue && hotelId.Value > 0)
        {
            query = query.Where(sa => sa.Area!.HotelId == hotelId.Value);
        }

        var assignments = await query
            .Include(sa => sa.Area)
                .ThenInclude(a => a!.ParentArea)
            .Include(sa => sa.Area)
                .ThenInclude(a => a!.Rooms)
            .OrderBy(sa => sa.Area!.AreaName)
            .ToListAsync(ct);

        return assignments.Select(sa => new StaffAssignedAreaDto
        {
            AreaId = sa.Area!.AreaId,
            HotelId = sa.Area.HotelId,
            AreaName = sa.Area.AreaName,
            AreaType = sa.Area.AreaType,
            ParentAreaId = sa.Area.ParentAreaId,
            ParentAreaName = sa.Area.ParentArea?.AreaName,
            Description = sa.Area.Description,
            FloorCount = sa.Area.FloorCount,
            TotalRooms = sa.Area.Rooms.Count,
            AvailableRooms = sa.Area.Rooms.Count(r => r.Status == RoomStatus.Available),
            OccupiedRooms = sa.Area.Rooms.Count(r => r.Status == RoomStatus.Occupied),
            AssignedAt = sa.AssignedAt,
            IsActive = sa.IsActive
        }).ToList();
    }

    public async Task<User?> FindUserWithRolesAsync(long userId, CancellationToken ct)
    {
        return await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId, ct);
    }

    public async Task<StaffAreaAssignment?> GetAssignmentAsync(long userId, int areaId, CancellationToken ct)
    {
        return await _context.StaffAreaAssignments
            .Include(sa => sa.Area)
            .FirstOrDefaultAsync(sa => sa.UserId == userId && sa.AreaId == areaId, ct);
    }

    public async Task<StaffAreaAssignment?> GetAssignmentByIdAsync(long assignmentId, CancellationToken ct)
    {
        return await _context.StaffAreaAssignments
            .Include(sa => sa.Area)
            .FirstOrDefaultAsync(sa => sa.AssignmentId == assignmentId, ct);
    }

    public async Task AddAssignmentAsync(StaffAreaAssignment assignment, CancellationToken ct)
    {
        await _context.StaffAreaAssignments.AddAsync(assignment, ct);
    }

    public async Task SyncAssignmentsForUserAsync(long userId, List<int> newAreaIds, long? assignedByUserId, CancellationToken ct)
    {
        var existingAssignments = await _context.StaffAreaAssignments
            .Where(sa => sa.UserId == userId)
            .ToListAsync(ct);

        var newAreaSet = new HashSet<int>(newAreaIds);

        // 1. Với các phân công cũ: nếu không còn nằm trong newAreaSet thì deactivate
        foreach (var existing in existingAssignments)
        {
            if (!newAreaSet.Contains(existing.AreaId))
            {
                if (existing.IsActive)
                {
                    existing.IsActive = false;
                }
            }
            else
            {
                // Nếu đã có và đang inactive thì reactivate
                if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    existing.AssignedAt = DateTime.UtcNow;
                    existing.AssignedByUserId = assignedByUserId;
                }
            }
        }

        // 2. Với các areaId mới hoàn toàn chưa từng có trong bảng thì Insert
        var existingAreaIds = existingAssignments.Select(e => e.AreaId).ToHashSet();
        foreach (var areaId in newAreaSet)
        {
            if (!existingAreaIds.Contains(areaId))
            {
                await _context.StaffAreaAssignments.AddAsync(new StaffAreaAssignment
                {
                    UserId = userId,
                    AreaId = areaId,
                    AssignedAt = DateTime.UtcNow,
                    AssignedByUserId = assignedByUserId,
                    IsActive = true
                }, ct);
            }
        }
    }

    public async Task<bool> DeactivateAssignmentAsync(long assignmentId, CancellationToken ct)
    {
        var assignment = await _context.StaffAreaAssignments.FindAsync([assignmentId], ct);
        if (assignment == null) return false;

        assignment.IsActive = false;
        return true;
    }

    public async Task SaveChangesAsync(CancellationToken ct)
    {
        await _context.SaveChangesAsync(ct);
    }
}
