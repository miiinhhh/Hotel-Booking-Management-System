using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public sealed class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.ToTable("Reviews"); builder.HasKey(x => x.ReviewId);
        builder.HasIndex(x => x.BookingId).IsUnique().HasDatabaseName("UQ_Reviews_BookingId");
        builder.Property(x => x.Rating).HasColumnType("tinyint");
        builder.Property(x => x.Comment).HasMaxLength(2000);
        builder.Property(x => x.Status).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2");
        builder.Property(x => x.UpdatedAt).HasColumnType("datetime2").IsConcurrencyToken();
        builder.HasOne(x => x.Booking).WithMany().HasForeignKey(x => x.BookingId).OnDelete(DeleteBehavior.Restrict);
    }
}
public sealed class ReviewModerationConfiguration : IEntityTypeConfiguration<ReviewModerationHistory>
{
    public void Configure(EntityTypeBuilder<ReviewModerationHistory> builder)
    {
        builder.ToTable("ReviewModerationHistory"); builder.HasKey(x => x.HistoryId);
        builder.Property(x => x.OldStatus).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        builder.Property(x => x.NewStatus).HasConversion<string>().HasMaxLength(20).IsUnicode(false);
        builder.Property(x => x.Action).HasMaxLength(30).IsUnicode(false);
        builder.Property(x => x.Reason).HasMaxLength(500);
        builder.Property(x => x.CreatedAt).HasColumnType("datetime2");
        builder.HasOne<Review>().WithMany().HasForeignKey(x => x.ReviewId).OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(x => new { x.ReviewId, x.HistoryId });
    }
}
