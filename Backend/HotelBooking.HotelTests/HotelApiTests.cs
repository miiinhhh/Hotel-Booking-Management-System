using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using HotelBooking.Application.Hotels;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.HotelTests;

public sealed class HotelApiTests
{
    private static Dictionary<string, object?> ValidRequest() => new()
    {
        ["hotelName"] = "  Khách sạn Test  ", ["description"] = "CRUD Hotel",
        ["address"] = "123 Nguyễn Huệ", ["city"] = "Hồ Chí Minh", ["country"] = "Vietnam",
        ["phone"] = "0901234567", ["email"] = "hotel@example.com",
        ["website"] = "https://example.com", ["checkInTime"] = "14:00:00",
        ["checkOutTime"] = "12:00:00", ["isActive"] = true
    };

    [Fact]
    public async Task Crud_round_trip_persists_updates_and_deletes()
    {
        using var factory = new HotelApiFactory();
        using var client = factory.CreateClient();
        var created = await client.PostAsJsonAsync("/api/hotels", ValidRequest());
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var hotel = (await created.Content.ReadFromJsonAsync<HotelResponse>())!;
        Assert.True(hotel.HotelId > 0);
        Assert.Equal("Khách sạn Test", hotel.HotelName);
        Assert.NotNull(created.Headers.Location);
        var read = await client.GetFromJsonAsync<HotelResponse>(created.Headers.Location);
        Assert.Equal(hotel.HotelId, read!.HotelId);

        var update = ValidRequest();
        update["hotelName"] = "Hotel Updated";
        update["isActive"] = false;
        var updated = await client.PutAsJsonAsync($"/api/hotels/{hotel.HotelId}", update);
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        read = await client.GetFromJsonAsync<HotelResponse>($"/api/hotels/{hotel.HotelId}");
        Assert.Equal("Hotel Updated", read!.HotelName);
        Assert.False(read.IsActive);
        Assert.Equal(hotel.CreatedAt, read.CreatedAt);
        Assert.NotNull(read.UpdatedAt);
        var page = await client.GetFromJsonAsync<HotelPage>("/api/hotels?pageNumber=1&pageSize=1");
        Assert.Equal(1, page!.TotalCount);
        Assert.Single(page.Items);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/hotels/{hotel.HotelId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/hotels/{hotel.HotelId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.DeleteAsync($"/api/hotels/{hotel.HotelId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PutAsJsonAsync($"/api/hotels/{hotel.HotelId}", update)).StatusCode);
    }

    [Theory]
    [InlineData("hotelName", "")]
    [InlineData("hotelName", "   ")]
    [InlineData("email", "not-an-email")]
    [InlineData("website", "ftp://example.com")]
    [InlineData("checkInTime", "12:00:00")]
    [InlineData("checkInTime", null)]
    [InlineData("checkInTime", "25:00:00")]
    public async Task Invalid_requests_return_400_without_saving(string field, string? value)
    {
        using var factory = new HotelApiFactory();
        using var client = factory.CreateClient();
        var request = ValidRequest();
        request[field] = value;
        var response = await client.PostAsJsonAsync("/api/hotels", request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("problem+json", response.Content.Headers.ContentType!.MediaType!);
        var page = await client.GetFromJsonAsync<HotelPage>("/api/hotels");
        Assert.Equal(0, page!.TotalCount);
    }

    [Fact]
    public async Task Missing_check_in_and_oversized_name_return_400()
    {
        using var factory = new HotelApiFactory();
        using var client = factory.CreateClient();
        var request = ValidRequest();
        request.Remove("checkInTime");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/hotels", request)).StatusCode);
        request = ValidRequest();
        request["hotelName"] = new string('a', 201);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/hotels", request)).StatusCode);
    }

    [Theory]
    [InlineData("/api/hotels/0")]
    [InlineData("/api/hotels/-1")]
    [InlineData("/api/hotels?pageSize=101")]
    [InlineData("/api/hotels?pageNumber=0")]
    [InlineData("/api/hotels?pageNumber=2147483647&pageSize=100")]
    public async Task Invalid_identifiers_and_pagination_return_400(string url)
    {
        using var factory = new HotelApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(url)).StatusCode);
    }

    [Fact]
    public async Task Swagger_and_openapi_expose_Hotel_routes()
    {
        using var factory = new HotelApiFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/swagger/index.html")).StatusCode);
        var document = await client.GetFromJsonAsync<JsonElement>("/openapi/v1.json");
        var paths = document.GetProperty("paths");
        Assert.True(paths.GetProperty("/api/hotels").TryGetProperty("post", out _));
        Assert.True(paths.GetProperty("/api/hotels/{hotelId}").TryGetProperty("put", out _));
        Assert.True(paths.GetProperty("/api/hotels/{hotelId}").TryGetProperty("delete", out _));
    }

    [Fact]
    public void SqlServer_mapping_matches_existing_Hotels_table()
    {
        using var context = new HotelDbContext(new DbContextOptionsBuilder<HotelDbContext>()
            .UseSqlServer("Server=localhost;Database=MappingOnly;Trusted_Connection=True").Options);
        var sql = context.Database.GenerateCreateScript();
        Assert.Contains("[dbo].[Hotels]", sql);
        Assert.Contains("[HotelId] int NOT NULL IDENTITY", sql);
        Assert.Contains("[HotelName] nvarchar(200) NOT NULL", sql);
        Assert.Contains("[Phone] varchar(20) NOT NULL", sql);
        Assert.Contains("[CheckInTime] time NOT NULL", sql);
        Assert.Contains("CK_Hotels_CheckInOut", sql);
        Assert.DoesNotContain("CREATE TABLE [dbo].[Rooms]", sql);
    }
}
