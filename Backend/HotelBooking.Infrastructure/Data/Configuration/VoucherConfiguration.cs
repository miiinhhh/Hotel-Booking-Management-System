using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class VoucherConfiguration : IEntityTypeConfiguration<Voucher>
{
    public void Configure(EntityTypeBuilder<Voucher> builder)
    {
        builder.ToTable("Vouchers");

        builder.HasKey(v => v.VoucherId);

        builder.Property(v => v.Code)
            .IsRequired()
            .HasMaxLength(50)
            .IsUnicode(false);

        builder.HasIndex(v => v.Code)
            .IsUnique();

        builder.Property(v => v.VoucherType)
            .IsRequired()
            .HasMaxLength(20)
            .IsUnicode(false);

        builder.Property(v => v.DiscountValue)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(v => v.MinimumOrderAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(v => v.MaxDiscountAmount)
            .HasPrecision(18, 2);

        builder.Property(v => v.UsageLimitPerCustomer)
            .HasDefaultValue(1)
            .IsRequired();

        builder.Property(v => v.StartAt)
            .IsRequired();

        builder.Property(v => v.EndAt)
            .IsRequired();

        builder.Property(v => v.UsageLimit);

        builder.Property(v => v.UsedCount)
            .HasDefaultValue(0)
            .IsRequired();

        builder.Property(v => v.IsActive)
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(v => v.CreatedAt)
            .HasDefaultValueSql("SYSDATETIME()");

        builder.Property(v => v.UpdatedAt);

        builder.HasMany(v => v.Bookings)
            .WithOne(b => b.Voucher)
            .HasForeignKey(b => b.VoucherId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(v => v.VoucherUsages)
            .WithOne(u => u.Voucher)
            .HasForeignKey(u => u.VoucherId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
