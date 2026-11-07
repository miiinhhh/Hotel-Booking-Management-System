using HotelBooking.Application.Authorization;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class PermissionManagementTests
{
    [Fact]
    public async Task AdminCanConfigureCustomRoleAndAffectedSessionsAreRevoked()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        await using var db = Database(connection); await db.Database.EnsureCreatedAsync();
        var adminRole = new Role { RoleName = SystemRoles.Admin, IsSystem = true };
        var custom = new Role { RoleName = "Reception", IsActive = true };
        var manage = new Permission { PermissionCode = SystemPermissions.RolesManage, PermissionName = "Roles", PermissionGroup = "Security" };
        var booking = new Permission { PermissionCode = SystemPermissions.BookingView, PermissionName = "Bookings", PermissionGroup = "Booking" };
        var admin = User("admin@test.local"); var staff = User("staff@test.local");
        db.AddRange(adminRole, custom, manage, booking, admin, staff); await db.SaveChangesAsync();
        db.AddRange(new UserRole { UserId = admin.UserId, RoleId = adminRole.RoleId, AssignedAt = DateTime.UtcNow }, new UserRole { UserId = staff.UserId, RoleId = custom.RoleId, AssignedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = manage.PermissionId, GrantedAt = DateTime.UtcNow }, new RolePermission { RoleId = adminRole.RoleId, PermissionId = booking.PermissionId, GrantedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await new PermissionManagementService(db).SetPermissions(admin.UserId, custom.RoleId,
            new SetRolePermissionsRequest([SystemPermissions.BookingView]), default);

        Assert.Contains(SystemPermissions.BookingView, result.Permissions);
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.Users.Where(x => x.UserId == staff.UserId).Select(x => x.TokenVersion).SingleAsync());
    }

    [Fact]
    public async Task ActorCannotGrantPermissionTheyDoNotHave()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        await using var db = Database(connection); await db.Database.EnsureCreatedAsync();
        var actorRole = new Role { RoleName = SystemRoles.HotelStaff, IsSystem = true };
        var custom = new Role { RoleName = "Reception", IsActive = true };
        var view = new Permission { PermissionCode = SystemPermissions.StaffView, PermissionName = "Staff", PermissionGroup = "Staff" };
        var report = new Permission { PermissionCode = SystemPermissions.ReportsView, PermissionName = "Reports", PermissionGroup = "Reports" };
        var actor = User("staff@test.local"); db.AddRange(actorRole, custom, view, report, actor); await db.SaveChangesAsync();
        db.AddRange(new UserRole { UserId = actor.UserId, RoleId = actorRole.RoleId, AssignedAt = DateTime.UtcNow }, new RolePermission { RoleId = actorRole.RoleId, PermissionId = view.PermissionId, GrantedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => new PermissionManagementService(db).SetPermissions(actor.UserId,
            custom.RoleId, new SetRolePermissionsRequest([SystemPermissions.ReportsView]), default));
    }

    [Fact]
    public async Task AdminCanLockCustomerAndOldSessionsAreRevoked()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        await using var db = Database(connection); await db.Database.EnsureCreatedAsync();
        var adminRole = new Role { RoleName = SystemRoles.Admin, IsSystem = true };
        var customerRole = new Role { RoleName = SystemRoles.Customer, IsSystem = true };
        var admin = User("admin@test.local"); var customer = User("customer@test.local");
        db.AddRange(adminRole, customerRole, admin, customer); await db.SaveChangesAsync();
        db.AddRange(new UserRole { UserId = admin.UserId, RoleId = adminRole.RoleId, AssignedAt = DateTime.UtcNow },
            new UserRole { UserId = customer.UserId, RoleId = customerRole.RoleId, AssignedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await new PermissionManagementService(db).SetUserStatus(admin.UserId, customer.UserId, false, default);

        Assert.False(result.IsActive);
        Assert.Equal(1, await db.Users.Where(x => x.UserId == customer.UserId).Select(x => x.TokenVersion).SingleAsync());
        await Assert.ThrowsAsync<HotelBooking.Application.Rooms.ConflictException>(() =>
            new PermissionManagementService(db).SetUserStatus(admin.UserId, admin.UserId, false, default));
    }

    [Fact]
    public async Task AdminCanChangeCustomerPermissionsWithoutChangingProtectedRoleIdentity()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        await using var db = Database(connection); await db.Database.EnsureCreatedAsync();
        var adminRole = new Role { RoleName = SystemRoles.Admin, IsSystem = true };
        var customerRole = new Role { RoleName = SystemRoles.Customer, IsSystem = true };
        var manage = new Permission { PermissionCode = SystemPermissions.RolesManage, PermissionName = "Roles", PermissionGroup = "Security" };
        var wishlist = new Permission { PermissionCode = SystemPermissions.WishlistSelfManage, PermissionName = "Wishlist", PermissionGroup = "Customer" };
        var areas = new Permission { PermissionCode = SystemPermissions.AreaManage, PermissionName = "Areas", PermissionGroup = "Inventory" };
        var admin = User("admin@test.local"); var customer = User("customer@test.local");
        db.AddRange(adminRole, customerRole, manage, wishlist, areas, admin, customer); await db.SaveChangesAsync();
        db.AddRange(new UserRole { UserId = admin.UserId, RoleId = adminRole.RoleId, AssignedAt = DateTime.UtcNow },
            new UserRole { UserId = customer.UserId, RoleId = customerRole.RoleId, AssignedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = manage.PermissionId, GrantedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = wishlist.PermissionId, GrantedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = areas.PermissionId, GrantedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await new PermissionManagementService(db).SetPermissions(admin.UserId, customerRole.RoleId,
            new SetRolePermissionsRequest([SystemPermissions.WishlistSelfManage]), default);

        Assert.True(result.IsSystem);
        Assert.Equal(SystemRoles.Customer, result.Name);
        Assert.Equal([SystemPermissions.WishlistSelfManage], result.Permissions);
        await Assert.ThrowsAsync<HotelBooking.Application.Rooms.ConflictException>(() =>
            new PermissionManagementService(db).SetPermissions(admin.UserId, customerRole.RoleId,
                new SetRolePermissionsRequest([SystemPermissions.AreaManage]), default));
        db.ChangeTracker.Clear();
        Assert.Equal(1, await db.Users.Where(x => x.UserId == customer.UserId).Select(x => x.TokenVersion).SingleAsync());
    }

    [Fact]
    public async Task HotelStaffCannotReceiveAdministrativePermissions()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:"); await connection.OpenAsync();
        await using var db = Database(connection); await db.Database.EnsureCreatedAsync();
        var adminRole = new Role { RoleName = SystemRoles.Admin, IsSystem = true };
        var staffRole = new Role { RoleName = SystemRoles.HotelStaff, IsSystem = true };
        var manageRoles = new Permission { PermissionCode = SystemPermissions.RolesManage, PermissionName = "Roles", PermissionGroup = "Security" };
        var bookingView = new Permission { PermissionCode = SystemPermissions.BookingView, PermissionName = "Bookings", PermissionGroup = "Booking" };
        var areaManage = new Permission { PermissionCode = SystemPermissions.AreaManage, PermissionName = "Areas", PermissionGroup = "Inventory" };
        var admin = User("admin@test.local");
        db.AddRange(adminRole, staffRole, manageRoles, bookingView, areaManage, admin); await db.SaveChangesAsync();
        db.AddRange(new UserRole { UserId = admin.UserId, RoleId = adminRole.RoleId, AssignedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = manageRoles.PermissionId, GrantedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = bookingView.PermissionId, GrantedAt = DateTime.UtcNow },
            new RolePermission { RoleId = adminRole.RoleId, PermissionId = areaManage.PermissionId, GrantedAt = DateTime.UtcNow });
        await db.SaveChangesAsync();

        var result = await new PermissionManagementService(db).SetPermissions(admin.UserId, staffRole.RoleId,
            new SetRolePermissionsRequest([SystemPermissions.BookingView]), default);
        Assert.Equal([SystemPermissions.BookingView], result.Permissions);
        await Assert.ThrowsAsync<HotelBooking.Application.Rooms.ConflictException>(() =>
            new PermissionManagementService(db).SetPermissions(admin.UserId, staffRole.RoleId,
                new SetRolePermissionsRequest([SystemPermissions.AreaManage]), default));
    }

    private static HotelBookingDbContext Database(SqliteConnection connection) =>
        new(new DbContextOptionsBuilder<HotelBookingDbContext>().UseSqlite(connection).Options);
    private static User User(string email) => new() { FullName = email, Email = email, PasswordHash = "hash", IsActive = true, CreatedAt = DateTime.UtcNow };
}

