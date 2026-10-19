using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class VoucherUsageConfiguration : IEntityTypeConfiguration<VoucherUsage>
{
    public void Configure(EntityTypeBuilder<VoucherUsage> builder)
    {
        builder.ToTable("VoucherUsages");

        builder.HasKey(u => u.VoucherUsageId);

        builder.Property(u => u.VoucherId)
            .IsRequired();

        builder.Property(u => u.CustomerId)
            .IsRequired();

        builder.Property(u => u.BookingId)
            .IsRequired();

        builder.Property(u => u.DiscountApplied)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(u => u.UsedAt)
            .HasDefaultValueSql("SYSDATETIME()");

        builder.HasIndex(u => new { u.VoucherId, u.BookingId })
            .IsUnique();

        builder.HasIndex(u => new { u.VoucherId, u.CustomerId });

        builder.HasIndex(u => u.CustomerId);

        builder.HasOne(u => u.Voucher)
            .WithMany(v => v.VoucherUsages)
            .HasForeignKey(u => u.VoucherId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(u => u.Booking)
            .WithMany(b => b.VoucherUsages)
            .HasForeignKey(u => u.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
