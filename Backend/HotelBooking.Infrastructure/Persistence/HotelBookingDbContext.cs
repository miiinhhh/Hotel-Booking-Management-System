using Hotel = HotelBooking.Domain.Entities.RoomHotel;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Persistence;

public sealed class HotelBookingDbContext(DbContextOptions<HotelBookingDbContext> options) : DbContext(options)
{
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<HotelArea> HotelAreas => Set<HotelArea>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<StaffAreaAssignment> StaffAreaAssignments => Set<StaffAreaAssignment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Hotel>().ToTable("Hotels").HasKey(x => x.HotelId);

        var area = model.Entity<HotelArea>();
        area.ToTable("HotelAreas", table =>
        {
            table.HasCheckConstraint("CK_HotelAreas_Type", "[AreaType] IN ('Zone', 'Building')");
            table.HasCheckConstraint("CK_HotelAreas_FloorCount", "[FloorCount] IS NULL OR [FloorCount] > 0");
        });
        area.HasKey(x => x.AreaId);
        area.Property(x => x.AreaName).HasMaxLength(150).IsRequired();
        area.Property(x => x.AreaType).HasMaxLength(20).IsUnicode(false).IsRequired();
        area.Property(x => x.Description).HasMaxLength(500);
        area.Property(x => x.LocationDescription).HasMaxLength(500);
        area.Property(x => x.IsActive).IsRequired();
        area.Property(x => x.CreatedAt).HasColumnType("datetime2").IsRequired();
        area.Property(x => x.UpdatedAt).HasColumnType("datetime2");
        area.HasIndex(x => new { x.HotelId, x.AreaName }).IsUnique();
        area.HasOne(x => x.Hotel).WithMany().HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Restrict);
        area.HasOne(x => x.ParentArea).WithMany(x => x.SubAreas).HasForeignKey(x => x.ParentAreaId).OnDelete(DeleteBehavior.Restrict);

        var type = model.Entity<RoomType>();
        type.ToTable("RoomTypes");
        type.HasKey(x => x.RoomTypeId);
        type.Property(x => x.RoomTypeName).HasMaxLength(100).IsRequired();
        type.Property(x => x.BasePrice).HasPrecision(18, 2);
        type.HasIndex(x => new { x.HotelId, x.AreaId, x.RoomTypeName }).IsUnique();
        type.HasOne(x => x.Hotel).WithMany(x => x.RoomTypes).HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Restrict);
        type.HasOne(x => x.Area).WithMany(x => x.RoomTypes).HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);

        var room = model.Entity<Room>();
        room.ToTable("Rooms");
        room.HasKey(x => x.RoomId);
        room.Property(x => x.RoomNumber).HasMaxLength(20).IsUnicode(false).IsRequired();
        room.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        room.Property(x => x.Description).HasMaxLength(500);
        room.HasIndex(x => new { x.AreaId, x.RoomNumber }).IsUnique();
        room.HasOne(x => x.RoomType).WithMany(x => x.Rooms).HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);
        room.HasOne(x => x.Area).WithMany(x => x.Rooms).HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);

        var assignment = model.Entity<StaffAreaAssignment>();
        assignment.ToTable("StaffAreaAssignments");
        assignment.HasKey(x => x.AssignmentId);
        assignment.HasIndex(x => new { x.UserId, x.AreaId }).IsUnique();
        assignment.HasOne(x => x.User).WithMany(u => u.StaffAreaAssignments).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        assignment.HasOne(x => x.Area).WithMany(a => a.StaffAssignments).HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);
        assignment.HasOne(x => x.AssignedByUser).WithMany().HasForeignKey(x => x.AssignedByUserId).OnDelete(DeleteBehavior.Restrict);

        var user = model.Entity<User>();
        user.ToTable("Users");
        user.HasKey(x => x.UserId);
        user.HasMany(x => x.UserRoles).WithOne(ur => ur.User).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);

        var role = model.Entity<Role>();
        role.ToTable("Roles");
        role.HasKey(x => x.RoleId);

        var userRole = model.Entity<UserRole>();
        userRole.ToTable("UserRoles");
        userRole.HasKey(x => new { x.UserId, x.RoleId });
        userRole.HasOne(x => x.Role).WithMany(r => r.UserRoles).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
    }
}
