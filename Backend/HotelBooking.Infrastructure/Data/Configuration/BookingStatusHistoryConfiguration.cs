using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class BookingStatusHistoryConfiguration : IEntityTypeConfiguration<BookingStatusHistory>
{
    public void Configure(EntityTypeBuilder<BookingStatusHistory> builder)
    {
        builder.ToTable("BookingStatusHistory");

        builder.HasKey(h => h.BookingStatusHistoryId);

        builder.Property(h => h.BookingId)
            .IsRequired();

        builder.Property(h => h.OldStatus)
            .HasMaxLength(20)
            .IsUnicode(false);

        builder.Property(h => h.NewStatus)
            .IsRequired()
            .HasMaxLength(20)
            .IsUnicode(false);

        builder.Property(h => h.ChangedByUserId);

        builder.Property(h => h.ChangedAt)
            .HasDefaultValueSql("SYSDATETIME()");

        builder.Property(h => h.Note)
            .HasMaxLength(500);

        builder.HasOne(h => h.Booking)
            .WithMany(b => b.StatusHistories)
            .HasForeignKey(h => h.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
