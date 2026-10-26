using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using HotelBooking.Application.Auth;
using HotelBooking.Application.DTOs;
using HotelBooking.Domain.Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using SkiaSharp;
using Xunit;
using AuthDb = HotelBooking.Infrastructure.Data.HotelBookingDbContext;
using ContentDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Tests;

public sealed class PropertyContentFactory : WebApplicationFactory<Program>
{
    private readonly string authDatabase = Guid.NewGuid().ToString();
    public string ImageRoot { get; } = Path.Combine(Path.GetTempPath(), "hotel-image-tests-" + Guid.NewGuid().ToString("N"));
    private readonly SqliteConnection connection = new("Data Source=:memory:");
    public bool FailNextImageInsert { get; set; }
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        connection.Open();
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        { ["ImageStorage:LocalRoot"] = ImageRoot }));
        builder.ConfigureServices(services =>
        {
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters.ValidIssuer = "ContentTests";
                options.TokenValidationParameters.ValidAudience = "ContentTests";
                options.TokenValidationParameters.IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("content-tests-secret-key-at-least-32-characters"));
            });
            services.PostConfigure<HotelBooking.Infrastructure.Security.JwtOptions>(options =>
            {
                options.Issuer = "ContentTests"; options.Audience = "ContentTests";
                options.SecretKey = "content-tests-secret-key-at-least-32-characters";
            });
            services.RemoveAll<AuthDb>(); services.RemoveAll<DbContextOptions<AuthDb>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AuthDb>>();
            services.AddDbContext<AuthDb>(o => o.UseInMemoryDatabase(authDatabase));
            services.RemoveAll<ContentDb>(); services.RemoveAll<DbContextOptions<ContentDb>>();
            services.RemoveAll<IDbContextOptionsConfiguration<ContentDb>>();
            services.AddDbContext<ContentDb>(o => o.UseSqlite(connection).AddInterceptors(new ImageInsertFailure(this)));
            services.RemoveAll<HotelBooking.Infrastructure.Persistence.HotelDbContext>();
            services.RemoveAll<DbContextOptions<HotelBooking.Infrastructure.Persistence.HotelDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<HotelBooking.Infrastructure.Persistence.HotelDbContext>>();
            services.AddDbContext<HotelBooking.Infrastructure.Persistence.HotelDbContext>(o => o.UseInMemoryDatabase(authDatabase + "hotels"));
        });
    }
    private sealed class ImageInsertFailure(PropertyContentFactory factory) : SaveChangesInterceptor
    {
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData data,
            InterceptionResult<int> result, CancellationToken ct = default)
        {
            if (factory.FailNextImageInsert && data.Context!.ChangeTracker.Entries<HotelImage>().Any(x => x.State == EntityState.Added))
            {
                factory.FailNextImageInsert = false;
                throw new InvalidOperationException("Injected metadata failure.");
            }
            return ValueTask.FromResult(result);
        }
    }
    public async Task Seed()
    {
        using var scope = Services.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<AuthDb>();
        foreach (var (id, roleName) in new[] { (1L, SystemRoles.Admin), (2L, SystemRoles.HotelStaff), (3L, SystemRoles.Customer) })
        {
            var user = new User { UserId = id, FullName = "Test", Email = $"user{id}@example.com", PasswordHash = "unused", IsActive = true };
            user.UserRoles.Add(new UserRole { User = user, Role = await auth.Roles.SingleAsync(x => x.RoleName == roleName) });
            auth.Users.Add(user);
        }
        await auth.SaveChangesAsync();
        var db = scope.ServiceProvider.GetRequiredService<ContentDb>();
        await db.Database.EnsureCreatedAsync();
        db.Users.AddRange(new User { UserId = 1, Email = "admin@example.com", FullName = "Admin", PasswordHash = "unused" },
            new User { UserId = 2, Email = "staff@example.com", FullName = "Staff", PasswordHash = "unused" },
            new User { UserId = 3, Email = "customer@example.com", FullName = "Customer", PasswordHash = "unused" });
        for (var hotelId = 1; hotelId <= 2; hotelId++)
        {
            var hotel = new RoomHotel(); db.Hotels.Add(hotel);
            db.Entry(hotel).Property(x => x.HotelId).CurrentValue = hotelId;
            db.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;
            db.HotelAreas.Add(new HotelArea { AreaId = hotelId, HotelId = hotelId, AreaName = "Area" });
        }
        await db.SaveChangesAsync();
        var hotelDb = scope.ServiceProvider.GetRequiredService<HotelBooking.Infrastructure.Persistence.HotelDbContext>();
        for (var id = 1; id <= 2; id++)
        {
            var hotel = Hotel.Create(new($"Hotel {id}", null, "Address", "City", "Vietnam", "0900000000", $"hotel{id}@example.com", null, new(14, 0), new(12, 0), true));
            hotelDb.Hotels.Add(hotel); hotelDb.Entry(hotel).Property(x => x.HotelId).CurrentValue = id;
        }
        await hotelDb.SaveChangesAsync();
        var type = new RoomType(1, 1, "Deluxe", null, 500000, 2, 1);
        db.RoomTypes.Add(type); await db.SaveChangesAsync();
        db.Rooms.Add(new Room(type.RoomTypeId, 1, "101", 1, RoomStatus.Available, null));
        db.Rooms.Add(new Room(type.RoomTypeId, 1, "102", 1, RoomStatus.Available, null));
        await db.SaveChangesAsync();
    }
    public async Task<string> Token(long userId)
    {
        using var scope = Services.CreateScope();
        var user = (await scope.ServiceProvider.GetRequiredService<IUserRepository>().FindByIdAsync(userId, default))!;
        return scope.ServiceProvider.GetRequiredService<ITokenService>().CreateToken(user, user.UserRoles.Select(x => x.Role.RoleName).ToList()).Token;
    }
    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            connection.Dispose();
            if (Directory.Exists(ImageRoot)) Directory.Delete(ImageRoot, true);
        }
    }
}

public sealed class PropertyContentApiTests
{
    private static void Authenticate(HttpClient client, string token) => client.DefaultRequestHeaders.Authorization = new("Bearer", token);
    private static byte[] Png()
    {
        using var image = new SKBitmap(2, 2);
        image.Erase(SKColors.Blue);
        using var encoded = image.Encode(SKEncodedImageFormat.Png, 90);
        return encoded.ToArray();
    }
    private static MultipartFormDataContent Upload(byte[]? bytes = null, string name = "test.png", string mime = "image/png", bool primary = false)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes ?? Png());
        file.Headers.ContentType = new MediaTypeHeaderValue(mime);
        content.Add(file, "file", name);
        content.Add(new StringContent(primary.ToString()), "isPrimary");
        content.Add(new StringContent("Ảnh khách sạn"), "altText");
        return content;
    }
    private static async Task<ImageDto> AddImage(HttpClient client, string gallery, bool primary = false)
    {
        using var content = Upload(primary: primary);
        var response = await client.PostAsync(gallery, content);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ImageDto>())!;
    }
    [Fact]
    public async Task Amenity_crud_and_idempotent_assignments_persist_in_both_join_tables()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        var created = await client.PostAsJsonAsync("/api/amenities", new { name = "  Wi-Fi  ", description = "Internet" });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var amenity = (await created.Content.ReadFromJsonAsync<AmenityDto>())!;
        Assert.Equal("Wi-Fi", amenity.Name);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/amenities", new { name = "wi-fi" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/amenities/{amenity.AmenityId}", new { name = "Wi-Fi", description = "Updated" })).StatusCode);
        foreach (var url in new[] { "/api/hotels/1/amenities", "/api/hotels/1/rooms/1/amenities" })
        {
            Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsync($"{url}/{amenity.AmenityId}", null)).StatusCode);
            Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsync($"{url}/{amenity.AmenityId}", null)).StatusCode);
            Assert.Single((await client.GetFromJsonAsync<List<AmenityDto>>(url))!);
        }
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsync($"/api/hotels/2/rooms/1/amenities/{amenity.AmenityId}", null)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/hotels/1/rooms/1/amenities/{amenity.AmenityId}")).StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<List<AmenityDto>>("/api/hotels/1/rooms/1/amenities"))!);
        Assert.Single((await client.GetFromJsonAsync<List<AmenityDto>>("/api/hotels/1/amenities"))!);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/amenities/{amenity.AmenityId}")).StatusCode);
        Assert.Empty((await client.GetFromJsonAsync<List<AmenityDto>>("/api/hotels/1/amenities"))!);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsync($"/api/hotels/1/amenities/{amenity.AmenityId}", null)).StatusCode);
    }
    [Theory]
    [InlineData("/api/hotels/1/images")]
    [InlineData("/api/hotels/1/rooms/1/images")]
    public async Task Gallery_upload_read_reorder_primary_and_delete_preserve_one_primary(string gallery)
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        var first = await AddImage(client, gallery);
        var second = await AddImage(client, gallery, true);
        Assert.True(first.IsPrimary);
        Assert.True(second.IsPrimary);
        Assert.Equal("test.png", second.OriginalFileName);
        Assert.Equal(2, second.Width);
        Assert.Equal("image/png", second.ContentType);
        Assert.True(second.FileSize > 0);
        var images = (await client.GetFromJsonAsync<List<ImageDto>>(gallery))!;
        Assert.Equal(second.ImageId, Assert.Single(images, x => x.IsPrimary).ImageId);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync(gallery + "/order", new { imageIds = new[] { second.ImageId, first.ImageId } })).StatusCode);
        Assert.Equal(second.ImageId, (await client.GetFromJsonAsync<List<ImageDto>>(gallery))![0].ImageId);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(gallery + "/order", new { imageIds = new[] { first.ImageId, first.ImageId } })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsync($"{gallery}/{first.ImageId}/primary", null)).StatusCode);
        client.DefaultRequestHeaders.Authorization = null;
        var imageFile = await client.GetAsync(first.Url);
        Assert.Equal(HttpStatusCode.OK, imageFile.StatusCode);
        Assert.Equal("image/png", imageFile.Content.Headers.ContentType!.MediaType);
        Assert.Equal("nosniff", imageFile.Headers.GetValues("X-Content-Type-Options").Single());
        Authenticate(client, await factory.Token(1));
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"{gallery}/{first.ImageId}")).StatusCode);
        Assert.True(Assert.Single((await client.GetFromJsonAsync<List<ImageDto>>(gallery))!).IsPrimary);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(first.Url)).StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<ContentDb>().ImageFileDeletions.CountAsync());
        var worker = new HotelBooking.Infrastructure.Persistence.ImageCleanupWorker(
            factory.Services.GetRequiredService<IServiceScopeFactory>(),
            Microsoft.Extensions.Logging.Abstractions.NullLogger<HotelBooking.Infrastructure.Persistence.ImageCleanupWorker>.Instance);
        await worker.CleanupAsync(default);
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<ContentDb>().ImageFileDeletions.CountAsync());
        Assert.Single(Directory.GetFiles(factory.ImageRoot));
    }
    [Theory]
    [InlineData(0, 401)]
    [InlineData(2, 403)]
    [InlineData(3, 403)]
    public async Task Non_admin_cannot_upload_delete_or_change_content(long actor, int expected)
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        if (actor > 0) Authenticate(client, await factory.Token(actor));
        using var upload = Upload();
        Assert.Equal(expected, (int)(await client.PostAsync("/api/hotels/1/images", upload)).StatusCode);
        Assert.Equal(expected, (int)(await client.DeleteAsync("/api/hotels/1/images/1")).StatusCode);
        Assert.Equal(expected, (int)(await client.PutAsync("/api/hotels/1/images/1/primary", null)).StatusCode);
        Assert.Equal(expected, (int)(await client.PostAsJsonAsync("/api/amenities", new { name = "Pool" })).StatusCode);
        Assert.False(Directory.Exists(factory.ImageRoot));
    }
    [Theory]
    [InlineData("test.svg", "image/svg+xml", false)]
    [InlineData("test.jpg", "image/jpeg", false)]
    [InlineData("test.png", "application/octet-stream", false)]
    [InlineData("test.png", "image/png", true)]
    public async Task Invalid_formats_or_corrupt_files_are_rejected_without_disk_files(string name, string mime, bool corrupt)
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        using var upload = Upload(corrupt ? Encoding.UTF8.GetBytes("not an image") : null, name, mime);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/hotels/1/images", upload)).StatusCode);
        Assert.False(Directory.Exists(factory.ImageRoot));
    }
    [Fact]
    public async Task Wrong_hotel_room_or_gallery_cannot_modify_image_or_create_orphan_file()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        var image = await AddImage(client, "/api/hotels/1/rooms/1/images");
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/hotels/1/rooms/2/images/{image.ImageId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsync($"/api/hotels/1/rooms/2/images/{image.ImageId}/primary", null)).StatusCode);
        using var upload = Upload();
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/hotels/2/rooms/1/images", upload)).StatusCode);
        Assert.Single(Directory.GetFiles(factory.ImageRoot));
    }
    [Fact]
    public async Task Database_rejects_multiple_primaries_within_one_gallery()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ContentDb>();
        var first = new HotelImage { HotelId = 1, ImageUrl = "/one" }; first.SetPrimary(true);
        var second = new HotelImage { HotelId = 1, ImageUrl = "/two" }; second.SetPrimary(true);
        db.HotelImages.AddRange(first, second);
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Oversize_and_excessive_dimensions_are_rejected_without_writing_files()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        using var oversized = Upload(new byte[5 * 1024 * 1024 + 1]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/hotels/1/images", oversized)).StatusCode);
        using var bitmap = new SKBitmap(8001, 1);
        using var data = bitmap.Encode(SKEncodedImageFormat.Png, 90);
        using var tooWide = Upload(data.ToArray());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/hotels/1/images", tooWide)).StatusCode);
        Assert.False(Directory.Exists(factory.ImageRoot));
    }

    [Fact]
    public async Task Hidden_hotel_blocks_public_image_reads_and_inactive_account_cannot_delete()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        var token = await factory.Token(1); Authenticate(client, token);
        var image = await AddImage(client, "/api/hotels/1/images");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ContentDb>();
            var hotel = await db.Hotels.SingleAsync(x => x.HotelId == 1);
            db.Entry(hotel).Property(x => x.IsActive).CurrentValue = false;
            await db.SaveChangesAsync();
            var auth = scope.ServiceProvider.GetRequiredService<AuthDb>();
            (await auth.Users.SingleAsync(x => x.UserId == 1)).IsActive = false;
            await auth.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync("/api/hotels/1/images/" + image.ImageId)).StatusCode);
        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(image.Url)).StatusCode);
    }

    [Fact]
    public async Task Separate_hotels_and_rooms_can_each_have_their_own_primary()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        foreach (var gallery in new[] { "/api/hotels/1/images", "/api/hotels/2/images", "/api/hotels/1/rooms/1/images", "/api/hotels/1/rooms/2/images" })
        {
            var image = await AddImage(client, gallery);
            Assert.True(image.IsPrimary);
            Assert.Single((await client.GetFromJsonAsync<List<ImageDto>>(gallery))!);
        }
    }

    [Fact]
    public async Task Metadata_failure_rolls_back_primary_change_and_removes_uploaded_file()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        var first = await AddImage(client, "/api/hotels/1/images");
        factory.FailNextImageInsert = true;
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<HotelBooking.Application.Interfaces.IPropertyContentService>();
        var bytes = Png();
        await Assert.ThrowsAsync<InvalidOperationException>(() => service.UploadAsync(1, new(1),
            new(new MemoryStream(bytes), "second.png", "image/png", bytes.Length, null, true), default));
        var images = (await client.GetFromJsonAsync<List<ImageDto>>("/api/hotels/1/images"))!;
        Assert.Equal(first.ImageId, Assert.Single(images).ImageId);
        Assert.True(images[0].IsPrimary);
        Assert.Single(Directory.GetFiles(factory.ImageRoot));
    }
}
