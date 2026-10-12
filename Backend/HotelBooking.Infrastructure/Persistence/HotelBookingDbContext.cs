using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace HotelBooking.Infrastructure.Persistence;

public sealed class HotelBookingDbContext(DbContextOptions<HotelBookingDbContext> options) : DbContext(options)
{
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<HotelArea> HotelAreas => Set<HotelArea>();
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Room> Rooms => Set<Room>();
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<Hotel>().ToTable("Hotels").HasKey(x => x.HotelId);
        var area = model.Entity<HotelArea>();
        area.ToTable("HotelAreas"); area.HasKey(x => x.AreaId);
        area.HasOne(x => x.Hotel).WithMany().HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Restrict);
        var type = model.Entity<RoomType>();
        type.ToTable("RoomTypes"); type.HasKey(x => x.RoomTypeId);
        type.Property(x => x.RoomTypeName).HasMaxLength(100).IsRequired();
        type.Property(x => x.BasePrice).HasPrecision(18, 2);
        type.HasIndex(x => new { x.HotelId, x.AreaId, x.RoomTypeName }).IsUnique();
        type.HasOne(x => x.Hotel).WithMany(x => x.RoomTypes).HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Restrict);
        type.HasOne(x => x.Area).WithMany().HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);
        var room = model.Entity<Room>();
        room.ToTable("Rooms"); room.HasKey(x => x.RoomId);
        room.Property(x => x.RoomNumber).HasMaxLength(20).IsUnicode(false).IsRequired();
        room.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        room.Property(x => x.Description).HasMaxLength(500);
        room.HasIndex(x => new { x.AreaId, x.RoomNumber }).IsUnique();
        room.HasOne(x => x.RoomType).WithMany(x => x.Rooms).HasForeignKey(x => x.RoomTypeId).OnDelete(DeleteBehavior.Restrict);
        room.HasOne(x => x.Area).WithMany(x => x.Rooms).HasForeignKey(x => x.AreaId).OnDelete(DeleteBehavior.Restrict);
    }
}
