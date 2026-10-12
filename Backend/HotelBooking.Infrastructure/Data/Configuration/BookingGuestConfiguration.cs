using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class BookingGuestConfiguration : IEntityTypeConfiguration<BookingGuest>
{
    public void Configure(EntityTypeBuilder<BookingGuest> builder)
    {
        builder.ToTable("BookingGuests");

        builder.HasKey(g => g.BookingGuestId);

        builder.Property(g => g.BookingId)
            .IsRequired();

        builder.Property(g => g.FullName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(g => g.Phone)
            .HasMaxLength(20)
            .IsUnicode(false);

        builder.Property(g => g.Email)
            .HasMaxLength(255)
            .IsUnicode(false);

        builder.Property(g => g.IsPrimaryGuest)
            .HasDefaultValue(false);

        builder.HasOne(g => g.Booking)
            .WithMany(b => b.BookingGuests)
            .HasForeignKey(g => g.BookingId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
