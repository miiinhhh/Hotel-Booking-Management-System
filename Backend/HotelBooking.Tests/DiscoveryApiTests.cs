using System.Net;
using System.Net.Http.Json;
using HotelBooking.Application.DTOs;
using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace HotelBooking.Tests;

public sealed class DiscoveryApiTests
{
    [Theory]
    [InlineData(0, 401)]
    [InlineData(2, 403)]
    [InlineData(3, 403)]
    public async Task Report_export_and_policy_require_admin(long actor, int status)
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        if (actor > 0) client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(actor));
        Assert.Equal(status, (int)(await client.GetAsync("/api/admin/reports/overview?from=2026-11-01&to=2026-12-01")).StatusCode);
        Assert.Equal(status, (int)(await client.GetAsync("/api/admin/reports/export?from=2026-11-01&to=2026-12-01")).StatusCode);
        Assert.Equal(status, (int)(await client.PutAsJsonAsync("/api/hotels/1/policy", new { cancellationPolicy = "Policy" })).StatusCode);
    }
    [Fact]
    public async Task Wishlist_uses_authenticated_user_not_a_userId_query_parameter()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        // A second customer tests data isolation; Staff no longer has customer-only wishlist permission.
        using (var scope = factory.Services.CreateScope())
        {
            var auth = scope.ServiceProvider.GetRequiredService<HotelBooking.Infrastructure.Data.HotelBookingDbContext>();
            var user = new User { UserId = 4, FullName = "Second customer", Email = "second@example.invalid", PasswordHash = "unused", IsActive = true };
            user.UserRoles.Add(new UserRole { User = user, Role = await auth.Roles.SingleAsync(r => r.RoleName == SystemRoles.Customer) });
            auth.Users.Add(user); await auth.SaveChangesAsync();
            var content = scope.ServiceProvider.GetRequiredService<HotelBooking.Infrastructure.Persistence.HotelBookingDbContext>();
            content.Users.Add(new User { UserId = 4, FullName = "Second customer", Email = "second@example.invalid", PasswordHash = "unused" });
            await content.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me/wishlist")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(3));
        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsync("/api/me/wishlist/1?userId=2", null)).StatusCode);
        Assert.Single((await client.GetFromJsonAsync<List<HotelCardDto>>("/api/me/wishlist"))!);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(2));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/me/wishlist?userId=3")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(4));
        Assert.Empty((await client.GetFromJsonAsync<List<HotelCardDto>>("/api/me/wishlist?userId=3"))!);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/me/wishlist/1?userId=3")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(3));
        Assert.Single((await client.GetFromJsonAsync<List<HotelCardDto>>("/api/me/wishlist"))!);
    }
    [Fact]
    public async Task Invalid_public_search_returns_problem_details_before_querying_database()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        var response = await client.GetAsync("/api/discovery/hotels?checkIn=2026-01-01&checkOut=2026-01-02&adults=0");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }
}
