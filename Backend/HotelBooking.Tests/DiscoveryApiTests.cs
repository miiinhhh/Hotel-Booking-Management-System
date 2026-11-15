using System.Net;
using System.Net.Http.Json;
using HotelBooking.Application.DTOs;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using BookingDb = HotelBooking.Infrastructure.Data.HotelBookingDBContext;
using AuthDb = HotelBooking.Infrastructure.Data.HotelBookingDbContext;
using ContentDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using Xunit;

namespace HotelBooking.Tests;

public sealed class DiscoveryApiTests
{
    private sealed class DiscoveryFactory : PropertyContentFactory
    {
        private readonly string database = Guid.NewGuid().ToString();
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<BookingDb>(); services.RemoveAll<DbContextOptions<BookingDb>>();
                services.RemoveAll<IDbContextOptionsConfiguration<BookingDb>>();
                services.AddDbContext<BookingDb>(options => options.UseInMemoryDatabase(database));
            });
        }
    }
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
        using (var scope = factory.Services.CreateScope())
        {
            var auth = scope.ServiceProvider.GetRequiredService<AuthDb>();
            var customer = new User { UserId = 4, FullName = "Other customer", Email = "other@example.com", PasswordHash = "unused", IsActive = true };
            customer.UserRoles.Add(new UserRole { User = customer, Role = await auth.Roles.SingleAsync(x => x.RoleName == SystemRoles.Customer) });
            auth.Users.Add(customer); await auth.SaveChangesAsync();
            var content = scope.ServiceProvider.GetRequiredService<ContentDb>();
            content.Users.Add(new User { UserId = 4, FullName = "Other customer", Email = "other@example.com", PasswordHash = "unused" });
            await content.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me/wishlist")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(3));
        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsync("/api/me/wishlist/1?userId=2", null)).StatusCode);
        Assert.Single((await client.GetFromJsonAsync<List<HotelCardDto>>("/api/me/wishlist"))!);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(4));
        Assert.Empty((await client.GetFromJsonAsync<List<HotelCardDto>>("/api/me/wishlist?userId=3"))!);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/me/wishlist/1?userId=3")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(3));
        Assert.Single((await client.GetFromJsonAsync<List<HotelCardDto>>("/api/me/wishlist"))!);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(2));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/me/wishlist")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PutAsync("/api/me/wishlist/1", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync("/api/me/wishlist/1")).StatusCode);
    }
    [Fact]
    public async Task Invalid_public_search_returns_problem_details_before_querying_database()
    {
        using var factory = new PropertyContentFactory(); using var client = factory.CreateClient(); await factory.Seed();
        var response = await client.GetAsync("/api/discovery/hotels?checkIn=2026-01-01&checkOut=2026-01-02&adults=0");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
    }

    [Fact]
    public async Task Public_search_detail_admin_report_and_csv_share_real_read_contracts()
    {
        using var factory = new DiscoveryFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(7);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BookingDb>();
            RoomInventoryTests.Seed(db);
            db.Bookings.Add(new Booking { BookingId = 800, BookingCode = "REPORT-800", CustomerId = 3,
                CheckInDate = day, CheckOutDate = day.AddDays(1), CreatedAt = day.ToDateTime(TimeOnly.MinValue),
                BookingStatus = HotelBooking.Domain.Enums.BookingStatus.Confirmed, NumberOfGuests = 2,
                BookingDetails = [new BookingDetail { RoomId = 1, UnitPrice = 100, NumberOfNights = 1, SubTotal = 100 }] });
            db.AddRange(new ReportPayment { PaymentId = 1, BookingId = 800, Amount = 100, PaymentType = "Payment", Status = "Paid", PaidAt = day.ToDateTime(new(10, 0)) },
                new ReportPayment { PaymentId = 2, BookingId = 800, Amount = 25, PaymentType = "Refund", Status = "Refunded", PaidAt = day.ToDateTime(new(11, 0)) });
            await db.SaveChangesAsync();
        }
        var stay = $"checkIn={day:yyyy-MM-dd}&checkOut={day.AddDays(1):yyyy-MM-dd}&adults=2&rooms=1";
        var search = await client.GetFromJsonAsync<DiscoveryPage>("/api/discovery/hotels?location=City&" + stay);
        Assert.NotNull(search); Assert.Single(search.Items); Assert.Equal(1, search.Items[0].AvailableRooms);
        var detail = await client.GetFromJsonAsync<HotelDiscoveryDetail>("/api/discovery/hotels/1?" + stay);
        Assert.NotNull(detail); Assert.Single(detail.Rooms); Assert.Equal(day, detail.CheckIn);
        client.DefaultRequestHeaders.Authorization = new("Bearer", await factory.Token(1));
        var interval = $"from={day:yyyy-MM-dd}&to={day.AddDays(1):yyyy-MM-dd}&hotelId=1";
        var report = await client.GetFromJsonAsync<BusinessReport>("/api/admin/reports/overview?" + interval);
        Assert.NotNull(report); Assert.Equal(75, report.Revenue); Assert.Equal(1, report.BookingCount);
        var csv = await client.GetAsync("/api/admin/reports/export?" + interval);
        Assert.Equal(HttpStatusCode.OK, csv.StatusCode); Assert.Equal("text/csv", csv.Content.Headers.ContentType!.MediaType);
        Assert.Contains($"{day:yyyy-MM-dd},75,1,1,2", await csv.Content.ReadAsStringAsync());
        Assert.NotNull(csv.Content.Headers.ContentDisposition?.FileNameStar);
    }
}
