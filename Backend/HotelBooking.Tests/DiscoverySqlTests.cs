using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;
using ContentDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using HotelDb = HotelBooking.Infrastructure.Persistence.HotelDbContext;
using BookingDb = HotelBooking.Infrastructure.Data.HotelBookingDBContext;

namespace HotelBooking.Tests;

public sealed class DiscoverySqlTests
{
    [ContentSqlFact]
    public async Task Dated_search_reporting_wishlist_and_upgrade_scripts_work_on_sql_server()
    {
        var cs = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("HOTEL_SQL_TEST_CONNECTION")) { InitialCatalog = "master" };
        var catalog = "HotelDiscoveryTests_" + Guid.NewGuid().ToString("N");
        await using var master = new SqlConnection(cs.ConnectionString); await master.OpenAsync();
        await using (var create = new SqlCommand($"CREATE DATABASE [{catalog}]", master)) await create.ExecuteNonQueryAsync();
        cs.InitialCatalog = catalog;
        await using var content = new ContentDb(new DbContextOptionsBuilder<ContentDb>().UseSqlServer(cs.ConnectionString).Options);
        await using var hotels = new HotelDb(new DbContextOptionsBuilder<HotelDb>().UseSqlServer(cs.ConnectionString).Options);
        await using var bookings = new BookingDb(new DbContextOptionsBuilder<BookingDb>().UseSqlServer(cs.ConnectionString).Options);
        try
        {
            var root = new DirectoryInfo(AppContext.BaseDirectory);
            while (root is not null && !File.Exists(Path.Combine(root.FullName, "Database&Docs", "Hotel_Booking_Database_Updated.sql"))) root = root.Parent;
            Assert.NotNull(root);
            var schema = await File.ReadAllTextAsync(Path.Combine(root.FullName, "Database&Docs", "Hotel_Booking_Database_Updated.sql"));
            await content.Database.ExecuteSqlRawAsync(schema[..schema.IndexOf("CREATE TABLE Bookings", StringComparison.Ordinal)]);
            foreach (var file in new[] { "PropertyContent.sql", "HotelDiscovery.sql", "HotelDiscovery.sql" })
                await content.Database.ExecuteSqlRawAsync(await File.ReadAllTextAsync(Path.Combine(root.FullName, "Backend", "HotelBooking.Infrastructure", "Persistence", "Scripts", file)));
            await content.Database.ExecuteSqlRawAsync(await File.ReadAllTextAsync(Path.Combine(root.FullName, "Database&Docs", "RoomEmergencyLocks.sql")));
            // Minimal booking/payment contract consumed by this read module, without seeding unrelated module data.
            await content.Database.ExecuteSqlRawAsync("""
                CREATE TABLE Bookings(BookingId bigint PRIMARY KEY, BookingStatus varchar(20), CheckInDate date, CheckOutDate date, HoldExpiresAt datetime2 NULL, CreatedAt datetime2);
                CREATE TABLE BookingDetails(BookingDetailId bigint PRIMARY KEY, BookingId bigint, RoomId bigint);
                CREATE TABLE Payments(PaymentId bigint PRIMARY KEY, BookingId bigint, PaymentType varchar(20), Status varchar(20), Amount decimal(18,2), PaidAt datetime2 NULL);
                INSERT Hotels(HotelName, Address, City, Phone, Email, CheckInTime, CheckOutTime) VALUES (N'Test Hotel', N'Address', N'Hue', '0900000000', 'test@example.com', '14:00', '12:00');
                INSERT HotelAreas(HotelId, AreaName, AreaType) VALUES (1, N'Zone', 'Zone');
                INSERT RoomTypes(HotelId, AreaId, RoomTypeName, BasePrice, Capacity, NumberOfBeds) VALUES (1, 1, N'Deluxe', 500000, 2, 1);
                INSERT Rooms(AreaId, RoomTypeId, RoomNumber, Floor, Status) VALUES (1, 1, '101', 1, 'Available'), (1, 1, '102', 1, 'Available');
                INSERT Users(FullName, Email, PasswordHash) VALUES (N'Test', 'user@example.com', 'unused');
                """);
            var repository = new DiscoveryRepository(hotels, content, bookings);
            var service = new DiscoveryService(repository, new Allowed());
            var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(7);
            var request = new HotelDiscoveryRequest { Location = "Hue", CheckIn = day, CheckOut = day.AddDays(1), MinPrice = 500000, MaxPrice = 500000, Adults = 4, Rooms = 2 };
            Assert.Single((await service.SearchAsync(request, default)).Items);
            await service.SetPolicyAsync(1, 1, new("Published policy"), default);
            Assert.Equal("Published policy", (await service.DetailAsync(1, request, default)).Policies.CancellationPolicy);
            await service.SetWishlistAsync(1, 1, true, default); await service.SetWishlistAsync(1, 1, true, default);
            Assert.Single(await service.WishlistAsync(1, default));
            var start = day.ToDateTime(TimeOnly.MinValue); var end = start.AddDays(1);
            await content.Database.ExecuteSqlInterpolatedAsync($"INSERT Bookings VALUES(1, 'Confirmed', {day}, {day.AddDays(1)}, NULL, {start}); INSERT BookingDetails VALUES(1, 1, 1); INSERT Payments VALUES(1, 1, 'Payment', 'Paid', 100, {start}); INSERT Payments VALUES(2, 1, 'Refund', 'Paid', 20, {start});");
            Assert.Empty((await service.SearchAsync(request, default)).Items);
            var report = await service.ReportAsync(1, new(day, day.AddDays(1), 1), default);
            Assert.Equal(80, report.Revenue); Assert.Equal(1, report.BookingCount); Assert.Equal(50, report.OccupancyRate);
        }
        finally { await content.Database.EnsureDeletedAsync(); }
    }
    private sealed class Allowed : IContentAccess { public Task EnsureAdminAsync(long userId, CancellationToken ct) => Task.CompletedTask; }
}
