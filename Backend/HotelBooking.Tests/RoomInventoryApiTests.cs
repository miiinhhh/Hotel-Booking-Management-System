using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using HotelBooking.Application.Rooms;
using HotelBooking.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace HotelBooking.Tests;

public sealed class InventoryFactory : StaffFactory
{
    private readonly string database = Guid.NewGuid().ToString();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<HotelBookingDBContext>();
            services.RemoveAll<DbContextOptions<HotelBookingDBContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<HotelBookingDBContext>>();
            services.AddDbContext<HotelBookingDBContext>(o => o.UseInMemoryDatabase(database));
        });
    }
}
public sealed class RoomInventoryApiTests
{
    [Fact]
    public async Task AuthenticatedLockAndReleaseImmediatelyChangePublicAvailability()
    {
        using var factory = new InventoryFactory(); using var client = factory.CreateClient(); await factory.Seed();
        using (var scope = factory.Services.CreateScope()) RoomInventoryTests.Seed(scope.ServiceProvider.GetRequiredService<HotelBookingDBContext>());
        var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(10);
        var path = $"/api/hotels/1/rooms/availability?checkIn={day:yyyy-MM-dd}&checkOut={day.AddDays(1):yyyy-MM-dd}";
        Assert.Equal(2, (await client.GetFromJsonAsync<AvailabilityResult>(path))!.Rooms.Count);
        var input = new { roomIds = new[] { 1 }, startsAt = day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), endsAt = day.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc), reason = "Maintenance" };
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/hotels/1/rooms/emergency-locks", input)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(4));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/hotels/1/rooms/emergency-locks", input)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(2));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/hotels/1/rooms/emergency-locks", input)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(1));
        var response = await client.PostAsJsonAsync("/api/hotels/1/rooms/emergency-locks", input);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var item = Assert.Single((await response.Content.ReadFromJsonAsync<RoomLockDto[]>())!);
        Assert.Single((await client.GetFromJsonAsync<AvailabilityResult>(path))!.Rooms);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/hotels/1/rooms/emergency-locks", input)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PatchAsync($"/api/hotels/2/rooms/emergency-locks/{item.LockId}/release", null)).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsync($"/api/hotels/1/rooms/emergency-locks/{item.LockId}/release", null)).StatusCode);
        Assert.Equal(2, (await client.GetFromJsonAsync<AvailabilityResult>(path))!.Rooms.Count);
    }
}
