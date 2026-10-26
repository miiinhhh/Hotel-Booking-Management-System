using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace HotelBooking.Infrastructure.Data;

// Read-only projections; Room module owns the existing inventory tables.
public sealed class InventoryRoom { public long RoomId { get; set; } public int RoomTypeId { get; set; } public int AreaId { get; set; } public string RoomNumber { get; set; } = ""; public int Floor { get; set; } public string Status { get; set; } = ""; public bool IsActive { get; set; } }
public sealed class InventoryType { public int RoomTypeId { get; set; } public int HotelId { get; set; } public int AreaId { get; set; } public string RoomTypeName { get; set; } = ""; public decimal BasePrice { get; set; } public int Capacity { get; set; } public bool IsActive { get; set; } }
public sealed class InventoryHotel { public int HotelId { get; set; } public bool IsActive { get; set; } }
public sealed class InventoryArea { public int AreaId { get; set; } public int HotelId { get; set; } public int? ParentAreaId { get; set; } public bool IsActive { get; set; } }
public sealed class InventoryAssignment { public long AssignmentId { get; set; } public long UserId { get; set; } public int AreaId { get; set; } public bool IsActive { get; set; } }
public static class InventoryModel
{
    public static void Configure(ModelBuilder model)
    {
        model.Entity<InventoryRoom>().ToTable("Rooms", t => t.ExcludeFromMigrations()).HasKey(x => x.RoomId);
        model.Entity<InventoryType>().ToTable("RoomTypes", t => t.ExcludeFromMigrations()).HasKey(x => x.RoomTypeId);
        model.Entity<InventoryType>().Property(x => x.BasePrice).HasPrecision(18, 2);
        model.Entity<InventoryHotel>().ToTable("Hotels", t => t.ExcludeFromMigrations()).HasKey(x => x.HotelId);
        model.Entity<InventoryArea>().ToTable("HotelAreas", t => t.ExcludeFromMigrations()).HasKey(x => x.AreaId);
        model.Entity<InventoryAssignment>().ToTable("StaffAreaAssignments", t => t.ExcludeFromMigrations()).HasKey(x => x.AssignmentId);
        var locks = model.Entity<RoomEmergencyLock>();
        locks.ToTable("RoomEmergencyLocks"); locks.HasKey(x => x.LockId);
        locks.Property(x => x.Reason).HasMaxLength(500).IsRequired();
        locks.HasIndex(x => new { x.RoomId, x.StartsAt, x.EndsAt });
    }
}
