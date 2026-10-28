using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HotelBooking.Infrastructure.Data.Configuration;

public class CancellationPolicyConfiguration : IEntityTypeConfiguration<CancellationPolicy>
{
    public void Configure(EntityTypeBuilder<CancellationPolicy> builder)
    {
        builder.ToTable("CancellationPolicies");

        builder.HasKey(p => p.CancellationPolicyId);

        builder.Property(p => p.HotelId)
            .IsRequired();

        builder.Property(p => p.PolicyName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(p => p.DaysBeforeCheckIn)
            .IsRequired();

        builder.Property(p => p.RefundPercentage)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(p => p.DepositPenaltyPercentage)
            .HasPrecision(5, 2)
            .IsRequired();

        builder.Property(p => p.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(p => p.CreatedAt)
            .HasDefaultValueSql("sysutcdatetime()");

        builder.Property(p => p.UpdatedAt);
    }
}
