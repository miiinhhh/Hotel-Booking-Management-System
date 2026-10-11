using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.Infrastructure.Data;

public static class RoleSeeder
{
    public static async Task SeedAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<HotelBookingDbContext>();
        var roles = new[]
        {
            (SystemRoles.Customer, "Hotel customer"),
            (SystemRoles.HotelStaff, "Hotel staff member"),
            (SystemRoles.Admin, "System administrator")
        };

        var existing = await db.Roles.Select(x => x.RoleName).ToListAsync();
        foreach (var (name, description) in roles.Where(x => !existing.Contains(x.Item1, StringComparer.OrdinalIgnoreCase)))
            db.Roles.Add(new Domain.Entities.Role { RoleName = name, Description = description });

        if (db.ChangeTracker.HasChanges())
            await db.SaveChangesAsync();
    }
}
