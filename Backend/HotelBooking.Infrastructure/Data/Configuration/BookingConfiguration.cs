using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.ToTable("Bookings");

        builder.HasKey(b => b.BookingId);

        builder.Property(b => b.BookingCode)
            .IsRequired()
            .HasMaxLength(30)
            .IsUnicode(false);

        builder.HasIndex(b => b.BookingCode)
            .IsUnique();

        builder.Property(b => b.CustomerId)
            .IsRequired();

        builder.Property(b => b.CheckInDate)
            .IsRequired();

        builder.Property(b => b.CheckOutDate)
            .IsRequired();

        builder.Property(b => b.NumberOfGuests)
            .IsRequired();

        builder.Property(b => b.BookingStatus)
            .IsRequired()
            .HasMaxLength(20)
            .HasConversion<string>()
            .IsUnicode(false);

        builder.Property(b => b.PaymentMethod)
            .IsRequired()
            .HasMaxLength(20)
            .IsUnicode(false);

        builder.Property(b => b.PaymentStatus)
            .IsRequired()
            .HasMaxLength(20)
            .IsUnicode(false);

        builder.Property(b => b.SubTotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(b => b.TaxAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(b => b.FeeAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(b => b.DiscountAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(b => b.TotalAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(b => b.DepositAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(b => b.RemainingAmount)
            .HasPrecision(18, 2)
            .HasDefaultValue(0m);

        builder.Property(b => b.SpecialRequests)
            .HasMaxLength(1000);

        builder.Property(b => b.HoldExpiresAt);

        builder.Property(b => b.CancellationReason)
            .HasMaxLength(500);

        builder.Property(b => b.CreatedAt)
            .HasDefaultValueSql("SYSDATETIME()");

        builder.Property(b => b.UpdatedAt);

        // Relationships
        builder.HasMany(b => b.BookingDetails)
            .WithOne(d => d.Booking)
            .HasForeignKey(d => d.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(b => b.BookingGuests)
            .WithOne(g => g.Booking)
            .HasForeignKey(g => g.BookingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(b => b.StatusHistories)
            .WithOne(h => h.Booking)
            .HasForeignKey(h => h.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
