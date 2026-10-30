using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Data;

public sealed class HotelBookingDbContext(DbContextOptions<HotelBookingDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<AuthOtpChallenge> AuthOtpChallenges => Set<AuthOtpChallenge>();
    public DbSet<ExternalLogin> ExternalLogins => Set<ExternalLogin>();

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
            entity.Property(x => x.AccessFailedCount).HasDefaultValue(0);
            entity.Property(x => x.TokenVersion).HasDefaultValue(0);
            entity.HasIndex(x => x.Email).IsUnique();
            entity.Ignore(x => x.StaffAreaAssignments);
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

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshTokens");
            entity.HasKey(x => x.RefreshTokenId);
            entity.Property(x => x.TokenHash).HasMaxLength(100).IsUnicode(false).IsRequired();
            entity.Property(x => x.CreatedByIp).HasMaxLength(64).IsUnicode(false);
            entity.Property(x => x.RevokedByIp).HasMaxLength(64).IsUnicode(false);
            entity.Property(x => x.DeviceInfo).HasMaxLength(500);
            entity.Property(x => x.ReplacedByTokenHash).HasMaxLength(100).IsUnicode(false);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasIndex(x => new { x.UserId, x.ExpiresAt });
            entity.HasOne(x => x.User).WithMany(x => x.RefreshTokens).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AuthOtpChallenge>(entity =>
        {
            entity.ToTable("AuthOtpChallenges");
            entity.HasKey(x => x.ChallengeId);
            entity.Property(x => x.Channel).HasMaxLength(20).IsUnicode(false).IsRequired();
            entity.Property(x => x.Purpose).HasMaxLength(30).IsUnicode(false).IsRequired();
            entity.Property(x => x.Destination).HasMaxLength(255).IsRequired();
            entity.Property(x => x.CodeHash).HasMaxLength(100).IsUnicode(false).IsRequired();
            entity.HasIndex(x => new { x.Destination, x.Purpose, x.CreatedAt });
            entity.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExternalLogin>(entity =>
        {
            entity.ToTable("ExternalLogins");
            entity.HasKey(x => x.ExternalLoginId);
            entity.Property(x => x.Provider).HasMaxLength(50).IsUnicode(false).IsRequired();
            entity.Property(x => x.ProviderSubject).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.Property(x => x.Email).HasMaxLength(255).IsUnicode(false).IsRequired();
            entity.HasIndex(x => new { x.Provider, x.ProviderSubject }).IsUnique();
            entity.HasOne(x => x.User).WithMany(x => x.ExternalLogins).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
