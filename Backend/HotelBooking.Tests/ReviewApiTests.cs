using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using HotelBooking.Application.Reviews;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Xunit;

namespace HotelBooking.Tests;

public sealed class ReviewApiTests
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    [Fact]
    public async Task CustomerSubmissionAdminModerationAndPublicRatingFlow()
    {
        using var factory = new InventoryFactory(); using var client = factory.CreateClient(); await factory.Seed();
        using (var scope = factory.Services.CreateScope()) ReviewTests.Seed(scope.ServiceProvider.GetRequiredService<HotelBookingDBContext>());
        var input = new { rating = 5, comment = "Good stay" };
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/bookings/10/review", input)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(2));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/bookings/10/review", input)).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(4));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/bookings/10/review", new { rating = 6 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/bookings/10/review", new { rating = 5, status = "Visible", customerId = 1, hotelId = 2 })).StatusCode);
        var created = await client.PostAsJsonAsync("/api/bookings/10/review", input); Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var review = await created.Content.ReadFromJsonAsync<ReviewDto>(JsonOptions); Assert.NotNull(review); Assert.Equal(ReviewStatus.Hidden, review.Status);
        Assert.NotNull(created.Headers.Location); Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(created.Headers.Location)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/bookings/10/review", input)).StatusCode);
        var moderate = $"/api/admin/hotels/1/reviews/{review.ReviewId}/moderation";
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchAsJsonAsync(moderate, new { status = "Visible" })).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(2));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchAsJsonAsync(moderate, new { status = "Visible" })).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(1));
        var queue = await client.GetFromJsonAsync<ReviewPage<ReviewDto>>("/api/admin/hotels/1/reviews?status=Hidden", JsonOptions); Assert.Single(queue!.Items);
        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync(moderate, new { status = "Visible" })).StatusCode);
        client.DefaultRequestHeaders.Authorization = null;
        var response = await client.GetAsync("/api/hotels/1/reviews"); Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(); Assert.DoesNotContain("customerId", json); Assert.DoesNotContain("bookingId", json);
        Assert.Equal(5m, (await client.GetFromJsonAsync<HotelRatingDto>("/api/hotels/1/rating"))!.AverageRating);
        Assert.Null((await client.GetFromJsonAsync<HotelRatingDto>("/api/hotels/2/rating"))!.AverageRating);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/hotels/999/rating")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/hotels/1/reviews?pageSize=101")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(4));
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/bookings/10/review", new { rating = 3, comment = "Edited" })).StatusCode);
        Assert.Equal(0, (await client.GetFromJsonAsync<HotelRatingDto>("/api/hotels/1/rating"))!.TotalReviews);
    }
    [Fact]
    public async Task CustomerCannotReviewOrReadAnotherCustomersBooking()
    {
        using var factory = new InventoryFactory(); using var client = factory.CreateClient(); await factory.Seed();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HotelBookingDBContext>(); ReviewTests.Seed(db);
            db.Bookings.Add(ReviewTests.Stay(20, customerId: 99)); await db.SaveChangesAsync();
        }
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(4));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync("/api/bookings/20/review", new { rating = 4 })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/bookings/20/review")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync("/api/bookings/20/review")).StatusCode);
    }
}
