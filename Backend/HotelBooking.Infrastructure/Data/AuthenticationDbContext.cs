using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public sealed class HotelBookingDbContext(DbContextOptions<HotelBookingDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(x => x.UserId);
            entity.Property(x => x.FullName).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(255).IsRequired().IsUnicode(false);
            entity.Property(x => x.PasswordHash).HasMaxLength(255).IsRequired().IsUnicode(false);
            entity.Property(x => x.Phone).HasMaxLength(20).IsUnicode(false);
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("SYSDATETIME()");
            entity.Property(x => x.IsActive).HasDefaultValue(true);
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("Roles");
            entity.HasKey(x => x.RoleId);
            entity.Property(x => x.RoleName).HasMaxLength(50).IsRequired().IsUnicode(false);
            entity.Property(x => x.Description).HasMaxLength(255);
            entity.HasIndex(x => x.RoleName).IsUnique();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("UserRoles");
            entity.HasKey(x => new { x.UserId, x.RoleId });
            entity.Property(x => x.AssignedAt).HasDefaultValueSql("SYSDATETIME()");
            entity.HasOne(x => x.User).WithMany(x => x.UserRoles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Role).WithMany(x => x.UserRoles).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
