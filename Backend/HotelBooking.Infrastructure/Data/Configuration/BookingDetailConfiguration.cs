using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class BookingDetailConfiguration : IEntityTypeConfiguration<BookingDetail>
{
    public void Configure(EntityTypeBuilder<BookingDetail> builder)
    {
        builder.ToTable("BookingDetails");

        builder.HasKey(d => d.BookingDetailId);

        builder.Property(d => d.BookingId)
            .IsRequired();

        builder.Property(d => d.RoomId)
            .IsRequired();

        builder.Property(d => d.UnitPrice)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(d => d.NumberOfNights)
            .IsRequired();

        builder.Property(d => d.SubTotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.HasOne(d => d.Booking)
            .WithMany(b => b.BookingDetails)
            .HasForeignKey(d => d.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
