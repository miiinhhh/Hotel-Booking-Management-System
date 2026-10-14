using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Persistence;

public sealed class HotelConfiguration : IEntityTypeConfiguration<Hotel>
{
    public void Configure(EntityTypeBuilder<Hotel> builder)
    {
        builder.ToTable("Hotels", "dbo", table =>
            table.HasCheckConstraint("CK_Hotels_CheckInOut", "[CheckOutTime] <> [CheckInTime]"));
        builder.HasKey(hotel => hotel.HotelId).HasName("PK_Hotels");
        builder.Property(hotel => hotel.HotelId).UseIdentityColumn();
        builder.Property(hotel => hotel.HotelName).HasMaxLength(200).IsRequired();
        builder.Property(hotel => hotel.Description).HasColumnType("nvarchar(max)");
        builder.Property(hotel => hotel.Address).HasMaxLength(300).IsRequired();
        builder.Property(hotel => hotel.City).HasMaxLength(100).IsRequired();
        builder.Property(hotel => hotel.Country).HasMaxLength(100).IsRequired();
        builder.Property(hotel => hotel.Phone).HasMaxLength(20).IsUnicode(false).IsRequired();
        builder.Property(hotel => hotel.Email).HasMaxLength(255).IsUnicode(false).IsRequired();
        builder.Property(hotel => hotel.Website).HasMaxLength(500).IsUnicode(false);
        builder.Property(hotel => hotel.CheckInTime).HasColumnType("time").IsRequired();
        builder.Property(hotel => hotel.CheckOutTime).HasColumnType("time").IsRequired();
        builder.Property(hotel => hotel.IsActive).IsRequired();
        builder.Property(hotel => hotel.CreatedAt).HasColumnType("datetime2").IsRequired();
        builder.Property(hotel => hotel.UpdatedAt).HasColumnType("datetime2");
    }
}
