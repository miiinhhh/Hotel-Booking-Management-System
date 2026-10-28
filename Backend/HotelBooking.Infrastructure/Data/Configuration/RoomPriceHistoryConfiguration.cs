using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class RoomPriceHistoryConfiguration : IEntityTypeConfiguration<RoomPriceHistory>
{
    public void Configure(EntityTypeBuilder<RoomPriceHistory> builder)
    {
        builder.ToTable("RoomPriceHistory");

        builder.HasKey(p => p.PriceHistoryId);

        builder.Property(p => p.RoomTypeId)
            .IsRequired();

        builder.Property(p => p.Price)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.EffectiveFrom)
            .IsRequired();

        builder.Property(p => p.EffectiveTo);

        builder.Property(p => p.ChangedByUserId)
            .IsRequired();

        builder.Property(p => p.CreatedAt)
            .HasDefaultValueSql("SYSDATETIME()");
    }
}
