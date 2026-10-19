using HotelBooking.Application.DTOs.Staff;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Hotel = HotelBooking.Domain.Entities.RoomHotel;

namespace HotelBooking.Tests;

public sealed class StaffAreaAssignmentTests
{
    private static readonly CancellationToken Ct = CancellationToken.None;

    private static HotelBookingDbContext CreateDatabase()
    {
        var dbName = "StaffAreaDb_" + Guid.NewGuid().ToString();
        var options = new DbContextOptionsBuilder<HotelBookingDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new HotelBookingDbContext(options);
    }

    private static (Hotel Hotel, HotelArea AreaA, HotelArea AreaB, User StaffUser, User CustomerUser) SeedData(HotelBookingDbContext db)
    {
        // 1. Hotel
        var hotel = new Hotel();
        db.Hotels.Add(hotel);
        db.Entry(hotel).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;

        // 2. Areas
        var areaA = new HotelArea
        {
            AreaId = 1,
            HotelId = 1,
            AreaName = "Zone A: Royal Pavilion",
            AreaType = "Zone",
            IsActive = true
        };
        var areaB = new HotelArea
        {
            AreaId = 2,
            HotelId = 1,
            AreaName = "Zone B: Ocean Wing",
            AreaType = "Zone",
            IsActive = true
        };
        db.HotelAreas.AddRange(areaA, areaB);

        // 3. Roles
        var staffRole = new Role { RoleId = 1, RoleName = "Hotel Staff" };
        var customerRole = new Role { RoleId = 2, RoleName = "Customer" };
        db.Roles.AddRange(staffRole, customerRole);

        // 4. Users
        var staffUser = new User
        {
            UserId = 10,
            FullName = "Tran Thi Thu",
            Email = "thu.tran@stayluxe.vn",
            Phone = "0987654321",
            IsActive = true
        };
        staffUser.UserRoles.Add(new UserRole { UserId = 10, RoleId = 1, Role = staffRole });

        var customerUser = new User
        {
            UserId = 20,
            FullName = "Nguyen Van Khach",
            Email = "khach@gmail.com",
            Phone = "0900000000",
            IsActive = true
        };
        customerUser.UserRoles.Add(new UserRole { UserId = 20, RoleId = 2, Role = customerRole });

        db.Users.AddRange(staffUser, customerUser);
        db.SaveChanges();

        return (hotel, areaA, areaB, staffUser, customerUser);
    }

    [Fact]
    public async Task GetHotelStaffAssignments_WhenHotelExists_ReturnsStaffListWithAssignedAreas()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, areaB, staff, _) = SeedData(db);

        // Gán phân khu A cho nhân viên
        db.StaffAreaAssignments.Add(new StaffAreaAssignment
        {
            UserId = staff.UserId,
            AreaId = areaA.AreaId,
            IsActive = true,
            AssignedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(Ct);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        var result = await service.GetHotelStaffAssignmentsAsync(hotel.HotelId, Ct);

        Assert.True(result.Success);
        Assert.NotNull(result.Data);
        var staffMember = Assert.Single(result.Data);
        Assert.Equal(staff.UserId, staffMember.UserId);
        Assert.Equal("Hotel Staff", staffMember.Role);
        Assert.Single(staffMember.AssignedAreas);
        Assert.Equal("Zone A: Royal Pavilion", staffMember.AssignedAreas[0].AreaName);
    }

    [Fact]
    public async Task SyncStaffAreas_WhenAddingNewAreas_CreatesActiveAssignments()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, areaB, staff, _) = SeedData(db);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        var request = new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { areaA.AreaId, areaB.AreaId }
        };

        var result = await service.SyncStaffAreasAsync(hotel.HotelId, request, assignedByUserId: 1, Ct);

        Assert.True(result.Success);
        Assert.Equal(2, result.Data!.Count);

        var assignments = await db.StaffAreaAssignments.Where(x => x.UserId == staff.UserId && x.IsActive).ToListAsync(Ct);
        Assert.Equal(2, assignments.Count);
    }

    [Fact]
    public async Task SyncStaffAreas_WhenRemovingArea_DeactivatesOmittedArea()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, areaB, staff, _) = SeedData(db);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        // Ban đầu gán cả 2 khu
        await service.SyncStaffAreasAsync(hotel.HotelId, new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { areaA.AreaId, areaB.AreaId }
        }, assignedByUserId: 1, Ct);

        // Cập nhật lại chỉ còn Area A
        var result = await service.SyncStaffAreasAsync(hotel.HotelId, new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { areaA.AreaId }
        }, assignedByUserId: 1, Ct);

        Assert.True(result.Success);
        Assert.Single(result.Data!);
        Assert.Equal(areaA.AreaId, result.Data![0].AreaId);

        // Phân khu B phải chuyển thành IsActive = false
        var assignmentB = await db.StaffAreaAssignments.FirstAsync(x => x.UserId == staff.UserId && x.AreaId == areaB.AreaId, Ct);
        Assert.False(assignmentB.IsActive);
    }

    [Fact]
    public async Task SyncStaffAreas_WhenReactivatingArea_SetsIsActiveTrue()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, areaB, staff, _) = SeedData(db);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        // Gán cả 2 khu
        await service.SyncStaffAreasAsync(hotel.HotelId, new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { areaA.AreaId, areaB.AreaId }
        }, assignedByUserId: 1, Ct);

        // Bỏ Area B
        await service.SyncStaffAreasAsync(hotel.HotelId, new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { areaA.AreaId }
        }, assignedByUserId: 1, Ct);

        // Kích hoạt lại Area B
        var result = await service.SyncStaffAreasAsync(hotel.HotelId, new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { areaA.AreaId, areaB.AreaId }
        }, assignedByUserId: 1, Ct);

        Assert.True(result.Success);
        Assert.Equal(2, result.Data!.Count);

        var assignmentB = await db.StaffAreaAssignments.FirstAsync(x => x.UserId == staff.UserId && x.AreaId == areaB.AreaId, Ct);
        Assert.True(assignmentB.IsActive);
    }

    [Fact]
    public async Task SyncStaffAreas_WhenInvalidAreaId_ReturnsFailure()
    {
        using var db = CreateDatabase();
        var (hotel, _, _, staff, _) = SeedData(db);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        var request = new AssignStaffAreasRequest
        {
            UserId = staff.UserId,
            AreaIds = new List<int> { 9999 } // Area không tồn tại
        };

        var result = await service.SyncStaffAreasAsync(hotel.HotelId, request, assignedByUserId: 1, Ct);

        Assert.False(result.Success);
        Assert.Contains("không tồn tại hoặc không thuộc quyền quản lý", result.Message);
    }

    [Fact]
    public async Task SyncStaffAreas_WhenUserIsNotStaff_ReturnsFailure()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, _, _, customer) = SeedData(db);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        var request = new AssignStaffAreasRequest
        {
            UserId = customer.UserId,
            AreaIds = new List<int> { areaA.AreaId }
        };

        var result = await service.SyncStaffAreasAsync(hotel.HotelId, request, assignedByUserId: 1, Ct);

        Assert.False(result.Success);
        Assert.Contains("Chỉ có thể phân công", result.Message);
    }

    [Fact]
    public async Task GetMyAssignedAreas_ReturnsOnlyActiveAreasForStaffMember()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, areaB, staff, _) = SeedData(db);

        db.StaffAreaAssignments.AddRange(
            new StaffAreaAssignment { UserId = staff.UserId, AreaId = areaA.AreaId, IsActive = true, AssignedAt = DateTime.UtcNow },
            new StaffAreaAssignment { UserId = staff.UserId, AreaId = areaB.AreaId, IsActive = false, AssignedAt = DateTime.UtcNow }
        );
        await db.SaveChangesAsync(Ct);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        var result = await service.GetMyAssignedAreasAsync(staff.UserId, hotel.HotelId, Ct);

        Assert.True(result.Success);
        Assert.Single(result.Data!);
        Assert.Equal(areaA.AreaId, result.Data![0].AreaId);
    }

    [Fact]
    public async Task RemoveAssignment_DeactivatesAssignmentSuccessfully()
    {
        using var db = CreateDatabase();
        var (hotel, areaA, _, staff, _) = SeedData(db);

        var assignment = new StaffAreaAssignment
        {
            UserId = staff.UserId,
            AreaId = areaA.AreaId,
            IsActive = true,
            AssignedAt = DateTime.UtcNow
        };
        db.StaffAreaAssignments.Add(assignment);
        await db.SaveChangesAsync(Ct);

        var repository = new StaffAreaAssignmentRepository(db);
        var service = new StaffAreaAssignmentService(repository);

        var result = await service.RemoveAssignmentAsync(hotel.HotelId, assignment.AssignmentId, Ct);

        Assert.True(result.Success);
        var updated = await db.StaffAreaAssignments.FindAsync(assignment.AssignmentId);
        Assert.NotNull(updated);
        Assert.False(updated.IsActive);
    }
}
