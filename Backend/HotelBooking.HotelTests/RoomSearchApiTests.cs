using System.Net;
using System.Net.Http.Json;
using HotelBooking.Application.Rooms;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace HotelBooking.HotelTests;

public sealed class RoomSearchApiTests
{
    [Theory]
    [InlineData("minPrice=-1")]
    [InlineData("maxPrice=-1")]
    [InlineData("minPrice=700000&maxPrice=500000")]
    [InlineData("pageNumber=0")]
    [InlineData("pageSize=101")]
    [InlineData("pageNumber=2147483647&pageSize=100")]
    [InlineData("minPrice=abc")]
    public async Task Invalid_queries_return_400_problem_details(string query)
    {
        using var factory = new HotelApiFactory();
        using var client = factory.CreateClient();
        var response = await client.GetAsync($"/api/hotels/1/rooms/search?{query}");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Public_search_binds_query_and_returns_empty_page_with_message()
    {
        using var factory = new HotelApiFactory();
        var repository = new EmptySearchRepository();
        using var configuredFactory = factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IRoomSearchRepository>();
            services.AddSingleton<IRoomSearchRepository>(repository);
        }));
        using var client = configuredFactory.CreateClient();
        var response = await client.GetAsync("/api/hotels/1/rooms/search?roomTypeName=%20deluxe%20&minPrice=500000&maxPrice=900000&pageNumber=2&pageSize=5");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = (await response.Content.ReadFromJsonAsync<RoomSearchResult>())!;
        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
        Assert.Equal(0, result.TotalPages);
        Assert.Equal(2, result.PageNumber);
        Assert.Equal(5, result.PageSize);
        Assert.NotNull(result.Message);
        Assert.Equal(new RoomSearchCriteria(1, "deluxe", 500000, 900000, 5, 5), repository.Criteria);
    }

    private sealed class EmptySearchRepository : IRoomSearchRepository
    {
        public RoomSearchCriteria? Criteria { get; private set; }
        public Task<(IReadOnlyList<RoomSearchItem> Items, int TotalCount)> SearchAsync(
            RoomSearchCriteria criteria, CancellationToken ct)
        {
            Criteria = criteria;
            return Task.FromResult<(IReadOnlyList<RoomSearchItem>, int)>((Array.Empty<RoomSearchItem>(), 0));
        }
    }
}
