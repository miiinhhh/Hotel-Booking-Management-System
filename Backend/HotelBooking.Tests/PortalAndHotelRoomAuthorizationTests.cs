using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using HotelBooking.Application.Hotels;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using HotelDbContext = HotelBooking.Infrastructure.Persistence.HotelDbContext;
using RoomDbContext = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Tests;

public sealed class PortalAndHotelRoomAuthorizationTests
{
    private static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();
    private static readonly object HotelPayload = new
    {
        hotelName = "StayLuxe Security Test",
        description = "Authorization integration test",
        address = "1 Test Street",
        city = "Da Nang",
        country = "Vietnam",
        phone = "0900000000",
        email = "security-test@stayluxe.test",
        website = "https://stayluxe.test",
        checkInTime = "14:00:00",
        checkOutTime = "12:00:00",
        isActive = true
    };

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    public async Task StaffAndCustomerCannotCreateUpdateOrDeleteHotels(long userId)
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        Authenticate(client, await factory.Token(userId));

        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/hotels", HotelPayload)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsJsonAsync("/api/hotels/1", HotelPayload)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync("/api/hotels/1")).StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.Empty(await scope.ServiceProvider.GetRequiredService<HotelDbContext>().Hotels.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task AdminCanCompleteHotelCrudAndPublicCanReadHotels()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/hotels")).StatusCode);
        Authenticate(client, await factory.Token(1));

        var createdResponse = await client.PostAsJsonAsync("/api/hotels", HotelPayload);
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<HotelResponse>();
        Assert.NotNull(created);

        var update = new
        {
            hotelName = "StayLuxe Security Test Updated",
            description = "Updated by authorized Admin",
            address = "2 Test Street",
            city = "Da Nang",
            country = "Vietnam",
            phone = "0900000001",
            email = "security-updated@stayluxe.test",
            website = "https://stayluxe.test/hotel",
            checkInTime = "15:00:00",
            checkOutTime = "11:00:00",
            isActive = true
        };
        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsJsonAsync($"/api/hotels/{created!.HotelId}", update)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/hotels/{created.HotelId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.GetAsync($"/api/hotels/{created.HotelId}")).StatusCode);
    }

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    public async Task StaffAndCustomerCannotCreateUpdateOrDeleteRooms(long userId)
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        var seed = await SeedRoomData(factory.Services, includeRoom: true);
        Authenticate(client, await factory.Token(userId));
        var payload = RoomPayload(seed.RoomTypeId, "A-102");

        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PostAsJsonAsync($"/api/hotels/1/areas/{seed.AreaId}/rooms", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.PutAsJsonAsync($"/api/hotels/1/rooms/{seed.RoomId}", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,
            (await client.DeleteAsync($"/api/hotels/1/rooms/{seed.RoomId}")).StatusCode);
        using var scope = factory.Services.CreateScope();
        var unchanged = await scope.ServiceProvider.GetRequiredService<RoomDbContext>().Rooms.AsNoTracking().SingleAsync();
        Assert.Equal("A-101", unchanged.RoomNumber);
        Assert.True(unchanged.IsActive);
        Assert.Equal(RoomStatus.Available, unchanged.Status);
    }

    [Fact]
    public async Task AdminCanCompleteRoomCrudAndPublicCanReadRooms()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        var seed = await SeedRoomData(factory.Services, includeRoom: false);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/hotels/1/rooms")).StatusCode);
        Authenticate(client, await factory.Token(1));

        var createdResponse = await client.PostAsJsonAsync($"/api/hotels/1/areas/{seed.AreaId}/rooms",
            RoomPayload(seed.RoomTypeId, "A-101"));
        Assert.Equal(HttpStatusCode.Created, createdResponse.StatusCode);
        var created = await createdResponse.Content.ReadFromJsonAsync<RoomDto>(JsonOptions);
        Assert.NotNull(created);

        Assert.Equal(HttpStatusCode.OK,
            (await client.PutAsJsonAsync($"/api/hotels/1/rooms/{created!.RoomId}",
                RoomPayload(seed.RoomTypeId, "A-101", floor: 2))).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.DeleteAsync($"/api/hotels/1/rooms/{created.RoomId}")).StatusCode);
        var deleted = await client.GetFromJsonAsync<RoomDto>($"/api/hotels/1/rooms/{created.RoomId}", JsonOptions);
        Assert.NotNull(deleted);
        Assert.False(deleted.IsActive);
        Assert.Equal(RoomStatus.Inactive, deleted.Status);
    }

    private static object RoomPayload(int roomTypeId, string roomNumber, int floor = 1) => new
    {
        roomTypeId,
        roomNumber,
        floor,
        status = "Available",
        description = "Authorization integration test"
    };

    private static async Task<(int AreaId, int RoomTypeId, long RoomId)> SeedRoomData(
        IServiceProvider services, bool includeRoom)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<RoomDbContext>();
        var hotel = new RoomHotel();
        db.Hotels.Add(hotel);
        db.Entry(hotel).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;
        var area = new HotelArea(1, "Zone A", "Zone", null, null, null, 3);
        db.HotelAreas.Add(area);
        await db.SaveChangesAsync();
        var roomType = new RoomType(1, area.AreaId, "Deluxe", null, 1_500_000m, 2, 1);
        db.RoomTypes.Add(roomType);
        await db.SaveChangesAsync();
        if (!includeRoom) return (area.AreaId, roomType.RoomTypeId, 0);
        var room = new Room(roomType.RoomTypeId, area.AreaId, "A-101", 1, RoomStatus.Available, null);
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        return (area.AreaId, roomType.RoomTypeId, room.RoomId);
    }

    private static void Authenticate(HttpClient client, string token) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter());
        return options;
    }
}
