using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class PriceSurgeRuleConfiguration : IEntityTypeConfiguration<PriceSurgeRule>
{
    public void Configure(EntityTypeBuilder<PriceSurgeRule> builder)
    {
        builder.ToTable("PriceSurgeRules");

        builder.HasKey(r => r.RuleId);

        builder.Property(r => r.HotelId)
            .IsRequired();

        builder.Property(r => r.RoomTypeId);

        builder.Property(r => r.RuleName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(r => r.StartDate)
            .IsRequired();

        builder.Property(r => r.EndDate)
            .IsRequired();

        builder.Property(r => r.AdjustmentType)
            .HasMaxLength(20)
            .IsRequired()
            .HasDefaultValue("PERCENTAGE");

        builder.Property(r => r.AdjustmentValue)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(r => r.Priority)
            .IsRequired()
            .HasDefaultValue(1);

        builder.Property(r => r.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(r => r.CreatedAt)
            .HasDefaultValueSql("SYSDATETIME()");

        builder.Property(r => r.CreatedByUserId)
            .IsRequired();
    }
}
