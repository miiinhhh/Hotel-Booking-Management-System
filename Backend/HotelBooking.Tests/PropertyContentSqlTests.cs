using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;
using ContentDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Tests;

public sealed class ContentSqlFactAttribute : FactAttribute
{
    public ContentSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HOTEL_SQL_TEST_CONNECTION")))
            Skip = "Set HOTEL_SQL_TEST_CONNECTION to a local SQL Server; this test creates and deletes its own temporary database.";
    }
}

public sealed class PropertyContentSqlTests
{
    [ContentSqlFact]
    public async Task Additive_script_upgrades_original_schema_is_rerunnable_and_repairs_legacy_primaries()
    {
        var catalog = "HotelContentTests_" + Guid.NewGuid().ToString("N");
        var connection = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("HOTEL_SQL_TEST_CONNECTION")) { InitialCatalog = "master" };
        await using var master = new SqlConnection(connection.ConnectionString);
        await master.OpenAsync();
        await using (var create = new SqlCommand($"CREATE DATABASE [{catalog}]", master)) await create.ExecuteNonQueryAsync();
        connection.InitialCatalog = catalog;
        await using var db = new ContentDb(new DbContextOptionsBuilder<ContentDb>().UseSqlServer(connection.ConnectionString).Options);
        try
        {
            var directory = new DirectoryInfo(AppContext.BaseDirectory);
            while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Database&Docs", "Hotel_Booking_Database_Updated.sql")))
                directory = directory.Parent;
            Assert.NotNull(directory);
            var root = directory.FullName;
            var originalSchema = await File.ReadAllTextAsync(Path.Combine(root, "Database&Docs", "Hotel_Booking_Database_Updated.sql"));
            // Exercise the original property/room schema; booking/voucher setup is outside this module.
            originalSchema = originalSchema[..originalSchema.IndexOf("CREATE TABLE Bookings", StringComparison.Ordinal)];
            await db.Database.ExecuteSqlRawAsync(originalSchema);
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO Hotels (HotelName, Address, City, Phone, Email, CheckInTime, CheckOutTime)
                VALUES (N'Test', N'Test', N'Test', '0900000000', 'test@example.com', '14:00', '12:00');
                INSERT INTO HotelImages (HotelId, ImageUrl, IsPrimary) VALUES (1, '/legacy-a', 1), (1, '/legacy-b', 1);
                """);
            var script = await File.ReadAllTextAsync(Path.Combine(root, "Backend", "HotelBooking.Infrastructure", "Persistence", "Scripts", "PropertyContent.sql"));
            await db.Database.ExecuteSqlRawAsync(script);
            await db.Database.ExecuteSqlRawAsync(script);
            Assert.Equal(2, await db.HotelImages.CountAsync());
            Assert.Equal(1, await db.HotelImages.CountAsync(x => x.IsPrimary));
            Assert.All(await db.HotelImages.ToListAsync(), x => Assert.Null(x.StorageKey));
            var service = new PropertyContentService(new PropertyContentRepository(db), new StubStorage(), new AdminAccess());
            var amenity = await service.CreateAmenityAsync(1, new("Wi-Fi", "Internet"), default);
            await service.SetAmenityAsync(1, new(1), amenity.AmenityId, true, default);
            Assert.Single(await service.LinkedAmenitiesAsync(new(1), default));
            var uploaded = await service.UploadAsync(1, new(1), new(new MemoryStream([1]), "test.png", "image/png", 1, null, true), default);
            Assert.EndsWith($"/{uploaded.ImageId}/content", uploaded.Url);
            Assert.Equal(1, await db.HotelImages.CountAsync(x => x.IsPrimary));
        }
        finally { await db.Database.EnsureDeletedAsync(); }
    }

    [ContentSqlFact]
    public async Task Concurrent_uploads_primary_changes_and_deletes_preserve_gallery_invariant()
    {
        var connection = new SqlConnectionStringBuilder(Environment.GetEnvironmentVariable("HOTEL_SQL_TEST_CONNECTION"));
        connection.InitialCatalog = "HotelContentTests_" + Guid.NewGuid().ToString("N");
        var options = new DbContextOptionsBuilder<ContentDb>().UseSqlServer(connection.ConnectionString).Options;
        await using var setup = new ContentDb(options);
        try
        {
            await setup.Database.EnsureCreatedAsync();
            var hotel = new RoomHotel(); setup.Hotels.Add(hotel);
            setup.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;
            await setup.SaveChangesAsync();
            var hotelId = hotel.HotelId;
            var storage = new StubStorage();
            async Task<ImageDto> Upload()
            {
                await using var db = new ContentDb(options);
                var service = new PropertyContentService(new PropertyContentRepository(db), storage, new AdminAccess());
                return await service.UploadAsync(1, new(hotelId), new(new MemoryStream([1]), "test.png", "image/png", 1, null, true), default);
            }
            var images = await Task.WhenAll(Enumerable.Range(0, 5).Select(_ => Upload()));
            setup.ChangeTracker.Clear();
            Assert.Equal(5, await setup.HotelImages.CountAsync());
            Assert.Equal(1, await setup.HotelImages.CountAsync(x => x.IsPrimary));
            await Task.WhenAll(images.Select(async image =>
            {
                await using var db = new ContentDb(options);
                var service = new PropertyContentService(new PropertyContentRepository(db), storage, new AdminAccess());
                await service.SelectPrimaryAsync(1, new(hotelId), image.ImageId, default);
            }));
            Assert.Equal(1, await setup.HotelImages.CountAsync(x => x.IsPrimary));
            var currentPrimary = await setup.HotelImages.AsNoTracking().SingleAsync(x => x.IsPrimary);
            await using (var db = new ContentDb(options))
            {
                var service = new PropertyContentService(new PropertyContentRepository(db), storage, new AdminAccess());
                await service.DeleteImageAsync(1, new(hotelId), currentPrimary.ImageId, default);
            }
            Assert.Equal(4, await setup.HotelImages.CountAsync());
            Assert.Equal(1, await setup.HotelImages.CountAsync(x => x.IsPrimary));
            Assert.Equal(1, await setup.ImageFileDeletions.CountAsync());
        }
        finally
        {
            // The catalog name is generated above and never comes from user configuration.
            await setup.Database.EnsureDeletedAsync();
        }
    }
    private sealed class AdminAccess : IContentAccess
    {
        public Task EnsureAdminAsync(long userId, CancellationToken ct) => Task.CompletedTask;
    }
    private sealed class StubStorage : IImageStorage
    {
        public Task<StoredImage> StoreAsync(ImageUpload upload, CancellationToken ct) =>
            Task.FromResult(new StoredImage(Guid.NewGuid().ToString("N") + ".png", "", "test.png", "image/png", 1, 1, 1));
        public Task<ImageFile> OpenAsync(string key, string contentType, CancellationToken ct) => throw new NotSupportedException();
        public Task DeleteAsync(string key, CancellationToken ct) => Task.CompletedTask;
    }
}
