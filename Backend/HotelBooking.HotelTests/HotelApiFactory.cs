using HotelBooking.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace HotelBooking.HotelTests;

// Only test persistence is SQLite. Production always uses the SQL Server provider.
public sealed class HotelApiFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection connection = new("Data Source=:memory:");

    public HotelApiFactory()
    {
        connection.Open();
        using var context = new TestHotelDbContext(new DbContextOptionsBuilder<HotelDbContext>()
            .UseSqlite(connection).Options);
        context.Database.EnsureCreated();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<HotelDbContext>();
            services.RemoveAll<DbContextOptions<HotelDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<HotelDbContext>>();
            services.AddScoped<HotelDbContext>(_ => new TestHotelDbContext(
                new DbContextOptionsBuilder<HotelDbContext>().UseSqlite(connection).Options));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) connection.Dispose();
    }

    private sealed class TestHotelDbContext(DbContextOptions<HotelDbContext> options) : HotelDbContext(options)
    {
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            foreach (var property in modelBuilder.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
                property.SetColumnType(null); // SQL Server types (nvarchar(max), datetime2) are provider-specific.
        }
    }
}
