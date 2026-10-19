using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using HotelBooking.Application.Auth;
using HotelBooking.Application.Staff;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Xunit;

namespace HotelBooking.Tests;

public sealed class StaffFactory : WebApplicationFactory<Program>
{
    private readonly string database = Guid.NewGuid().ToString();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.ClearProviders().AddConsole());
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "Tests", ["Jwt:Audience"] = "Tests",
            ["Jwt:SecretKey"] = "staff-tests-only-secret-key-at-least-32-characters",
            ["Jwt:ExpirationMinutes"] = "60"
        }));
        builder.ConfigureServices(services =>
        {
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters.ValidIssuer = "Tests";
                options.TokenValidationParameters.ValidAudience = "Tests";
                options.TokenValidationParameters.IssuerSigningKey = new SymmetricSecurityKey(
                    Encoding.UTF8.GetBytes("staff-tests-only-secret-key-at-least-32-characters"));
            });
            services.RemoveAll<HotelBookingDbContext>();
            services.RemoveAll<DbContextOptions<HotelBookingDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<HotelBookingDbContext>>();
            services.AddDbContext<HotelBookingDbContext>(o => o.UseInMemoryDatabase(database));
        });
    }
    public async Task Seed()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelBookingDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        foreach (var entry in new[] { (1L, SystemRoles.Admin), (2L, SystemRoles.HotelStaff), (3L, SystemRoles.HotelStaff), (4L, SystemRoles.Customer) })
        {
            var role = await db.Roles.SingleAsync(x => x.RoleName == entry.Item2);
            var user = new User { UserId = entry.Item1, FullName = "Account " + entry.Item1, Email = $"user{entry.Item1}@example.com", PasswordHash = hasher.Hash("ValidPassword123!"), CreatedAt = DateTime.UtcNow };
            user.UserRoles.Add(new UserRole { User = user, Role = role, AssignedAt = DateTime.UtcNow });
            db.Users.Add(user);
        }
        await db.SaveChangesAsync();
    }
    public async Task<string> Token(long id)
    {
        using var scope = Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IUserRepository>().FindByIdAsync(id, default);
        return scope.ServiceProvider.GetRequiredService<ITokenService>().CreateToken(user!, user!.UserRoles.Select(x => x.Role.RoleName).ToArray()).Token;
    }
}

public sealed class StaffApiTests
{
    private static void Authenticate(HttpClient client, string token) => client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    private static object Profile => new { fullName = "Updated staff", phone = "+84901234567", dateOfBirth = "2000-01-01" };

    [Theory]
    [InlineData(1, 200, 2)]
    [InlineData(2, 200, 1)]
    [InlineData(4, 403, 0)]
    [InlineData(0, 401, 0)]
    public async Task ListRespectsRoleAndScope(long actor, int expected, int count)
    {
        using var factory = new StaffFactory(); using var client = factory.CreateClient(); await factory.Seed();
        if (actor > 0) Authenticate(client, await factory.Token(actor));
        var response = await client.GetAsync("/api/staff");
        Assert.Equal(expected, (int)response.StatusCode);
        if (expected == 200)
        {
            var page = await response.Content.ReadFromJsonAsync<StaffPage>();
            Assert.Equal(count, page!.Total); Assert.Equal(count, page.Items.Count);
            Assert.DoesNotContain("passwordHash", await response.Content.ReadAsStringAsync());
        }
    }
    [Theory]
    [InlineData(1, 2, 200)]
    [InlineData(2, 2, 200)]
    [InlineData(2, 3, 403)]
    [InlineData(4, 2, 403)]
    [InlineData(1, 4, 404)]
    public async Task ReadAndUpdateEnforceTargetScope(long actor, long target, int expected)
    {
        using var factory = new StaffFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(actor));
        Assert.Equal(expected, (int)(await client.GetAsync($"/api/staff/{target}")).StatusCode);
        Assert.Equal(expected, (int)(await client.PutAsJsonAsync($"/api/staff/{target}", Profile)).StatusCode);
        using var scope = factory.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IUserRepository>().FindByIdAsync(target, default);
        Assert.Equal(expected == 200 ? "Updated staff" : $"Account {target}", user!.FullName);
    }
    [Fact]
    public async Task LockInvalidatesExistingTokenAndLoginAndUnlockRestoresAccess()
    {
        using var factory = new StaffFactory(); using var admin = factory.CreateClient(); using var staff = factory.CreateClient(); await factory.Seed();
        Authenticate(admin, await factory.Token(1)); Authenticate(staff, await factory.Token(2));
        Assert.Equal(HttpStatusCode.OK, (await staff.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PatchAsJsonAsync("/api/staff/2/status", new { isActive = false })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await staff.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await staff.GetAsync("/api/staff")).StatusCode);
        var login = await staff.PostAsJsonAsync("/api/auth/login", new { email = "user2@example.com", password = "ValidPassword123!" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PatchAsJsonAsync("/api/staff/2/status", new { isActive = true })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await staff.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await staff.PostAsJsonAsync("/api/auth/login", new { email = "user2@example.com", password = "ValidPassword123!" })).StatusCode);
    }
    [Fact]
    public async Task StaffCannotLockAccountsOrInjectPermissionFields()
    {
        using var factory = new StaffFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(2));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchAsJsonAsync("/api/staff/2/status", new { isActive = false })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PatchAsJsonAsync("/api/staff/3/status", new { isActive = false })).StatusCode);
        foreach (var endpoint in new[] { "/api/staff/2", "/api/me" })
        {
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(endpoint,
                new { fullName = "Attacker", roles = new[] { "Admin" }, isActive = true })).StatusCode);
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/admin")).StatusCode);
        using var scope = factory.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<IUserRepository>().FindByIdAsync(2, default);
        Assert.Equal("Account 2", user!.FullName);
        Assert.DoesNotContain(user.UserRoles, x => x.Role.RoleName == SystemRoles.Admin);
    }
    [Fact]
    public async Task RemovedRoleCannotUseStaleToken()
    {
        using var factory = new StaffFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(2));
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HotelBookingDbContext>();
            db.UserRoles.RemoveRange(db.UserRoles.Where(x => x.UserId == 2)); await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/staff")).StatusCode);
    }
    [Fact]
    public async Task ValidationAndPaginationAreEnforced()
    {
        using var factory = new StaffFactory(); using var client = factory.CreateClient(); await factory.Seed();
        Authenticate(client, await factory.Token(1));
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/staff?page=0")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PatchAsJsonAsync("/api/staff/2/status", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/staff/2", new { fullName = "  ", phone = (string?)null })).StatusCode);
        var page = await client.GetFromJsonAsync<StaffPage>("/api/staff?page=2&pageSize=1");
        Assert.Equal(2, page!.Total); Assert.Single(page.Items); Assert.Equal(3, page.Items[0].UserId);
    }
}
