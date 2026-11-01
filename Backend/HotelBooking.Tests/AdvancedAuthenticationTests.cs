using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HotelBooking.API.Authentication;
using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace HotelBooking.Tests;

public sealed class AdvancedAuthenticationTests
{
    [Fact]
    public async Task Registration_availability_reports_existing_and_unused_identity_values()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        var existing = await client.GetFromJsonAsync<AccountAvailabilityResponse>(
            "/api/auth/availability?email=user4%40example.com");
        var unused = await client.GetFromJsonAsync<AccountAvailabilityResponse>(
            "/api/auth/availability?email=new-customer%40example.com&phone=%2B84909999999");

        Assert.NotNull(existing);
        Assert.False(existing.EmailAvailable);
        Assert.NotNull(unused);
        Assert.True(unused.EmailAvailable);
        Assert.True(unused.PhoneAvailable);
    }

    [Fact]
    public async Task Email_otp_can_sign_in_and_reset_password()
    {
        using var baseFactory = new StaffFactory();
        var sender = new CapturingOtpSender();
        using var factory = baseFactory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOtpSender>();
            services.AddSingleton<IOtpSender>(sender);
        }));
        using var client = factory.CreateClient();
        await SeedCustomer(factory);

        var loginChallenge = await RequestOtp(client, "Login");
        var otpLogin = await client.PostAsJsonAsync("/api/auth/otp/verify", new
        {
            challengeId = loginChallenge, code = sender.LastCode, rememberMe = false
        });
        Assert.Equal(HttpStatusCode.OK, otpLogin.StatusCode);

        var resetChallenge = await RequestOtp(client, "PasswordReset");
        var reset = await client.PostAsJsonAsync("/api/auth/reset-password", new
        {
            challengeId = resetChallenge, code = sender.LastCode, newPassword = "NewValidPassword123!"
        });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        var oldPassword = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "otp@example.com", password = "ValidPassword123!", rememberMe = false
        });
        Assert.Equal(HttpStatusCode.Unauthorized, oldPassword.StatusCode);
        var newPassword = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "otp@example.com", password = "NewValidPassword123!", rememberMe = false
        });
        Assert.Equal(HttpStatusCode.OK, newPassword.StatusCode);
    }

    [Fact]
    public async Task Google_verified_identity_creates_and_reuses_customer_account()
    {
        using var baseFactory = new StaffFactory();
        var google = new FakeGoogleTokenValidator();
        using var factory = baseFactory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IGoogleTokenValidator>();
            services.AddSingleton<IGoogleTokenValidator>(google);
        }));
        using var client = factory.CreateClient();

        var first = await client.PostAsJsonAsync("/api/auth/google", new { idToken = "valid", rememberMe = true });
        Assert.True(first.StatusCode == HttpStatusCode.OK, await first.Content.ReadAsStringAsync());
        var firstSession = await ReadSession(first);
        var second = await client.PostAsJsonAsync("/api/auth/google", new { idToken = "valid", rememberMe = false });
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondSession = await ReadSession(second);
        Assert.Equal(firstSession.UserId, secondSession.UserId);
        Assert.Contains("Customer", firstSession.Roles);
    }

    [Fact]
    public async Task Refresh_rotates_token_and_logout_revokes_session()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        var login = await Login(client, rememberMe: false);
        var refreshedResponse = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.OK, refreshedResponse.StatusCode);
        var refreshed = await ReadSession(refreshedResponse);
        Assert.NotEqual(login.RefreshToken, refreshed.RefreshToken);

        var replay = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = login.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);
        await AssertProblemCode(replay, AuthenticationErrorCodes.RefreshTokenInvalid);

        var logout = await client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = refreshed.RefreshToken });
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);
        var afterLogout = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refreshed.RefreshToken });
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
    }

    [Fact]
    public async Task Logout_invalidates_existing_access_token()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        var login = await Login(client, rememberMe: false);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login.AccessToken);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent,
            (await client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = login.RefreshToken })).StatusCode);
        var revoked = await client.GetAsync("/api/me");
        Assert.Equal(HttpStatusCode.Unauthorized, revoked.StatusCode);
        await AssertProblemCode(revoked, AuthenticationErrorCodes.TokenInvalid);
    }

    [Fact]
    public async Task Remember_me_extends_refresh_token_lifetime()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        var shortSession = await Login(client, rememberMe: false);
        var remembered = await Login(client, rememberMe: true);

        Assert.InRange(shortSession.RefreshExpiresAt - DateTimeOffset.UtcNow, TimeSpan.FromHours(23), TimeSpan.FromHours(25));
        Assert.InRange(remembered.RefreshExpiresAt - DateTimeOffset.UtcNow, TimeSpan.FromDays(29), TimeSpan.FromDays(31));
    }

    [Fact]
    public async Task Repeated_invalid_password_locks_account()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        for (var attempt = 1; attempt <= 4; attempt++)
        {
            var response = await client.PostAsJsonAsync("/api/auth/login", new
            {
                email = "user4@example.com", password = "wrong-password", rememberMe = false
            });
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
        var locked = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user4@example.com", password = "wrong-password", rememberMe = false
        });
        Assert.Equal(423, (int)locked.StatusCode);
        await AssertProblemCode(locked, AuthenticationErrorCodes.AccountLocked);

        var correctPassword = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user4@example.com", password = "ValidPassword123!", rememberMe = false
        });
        Assert.Equal(423, (int)correctPassword.StatusCode);
    }

    private static async Task<SessionPayload> Login(HttpClient client, bool rememberMe)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user4@example.com", password = "ValidPassword123!", rememberMe
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await ReadSession(response);
    }

    private static async Task<SessionPayload> ReadSession(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<SessionPayload>(new JsonSerializerOptions(JsonSerializerDefaults.Web)))!;

    private static async Task AssertProblemCode(HttpResponseMessage response, string expectedCode)
    {
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(expectedCode, document.RootElement.GetProperty("code").GetString());
    }

    private static async Task<Guid> RequestOtp(HttpClient client, string purpose)
    {
        var response = await client.PostAsJsonAsync("/api/auth/otp/request", new
        {
            destination = "otp@example.com", channel = "Email", purpose
        });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("challengeId").GetGuid();
    }

    private static async Task SeedCustomer(WebApplicationFactory<Program> factory)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<HotelBookingDbContext>();
        if (await db.Users.AnyAsync(x => x.Email == "otp@example.com")) return;
        var role = await db.Roles.SingleAsync(x => x.RoleName == SystemRoles.Customer);
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var user = new User
        {
            FullName = "OTP Customer", Email = "otp@example.com", Phone = "+84900000001",
            PasswordHash = hasher.Hash("ValidPassword123!"), IsActive = true, CreatedAt = DateTime.UtcNow
        };
        user.UserRoles.Add(new UserRole { User = user, Role = role, AssignedAt = DateTime.UtcNow });
        db.Users.Add(user);
        await db.SaveChangesAsync();
    }

    private sealed record SessionPayload(
        long UserId,
        string[] Roles,
        string AccessToken,
        DateTimeOffset ExpiresAt,
        string RefreshToken,
        DateTimeOffset RefreshExpiresAt);

    private sealed class CapturingOtpSender : IOtpSender
    {
        public string LastCode { get; private set; } = string.Empty;
        public Task SendAsync(OtpChannel channel, string destination, string code, OtpPurpose purpose, CancellationToken cancellationToken)
        {
            LastCode = code;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeGoogleTokenValidator : IGoogleTokenValidator
    {
        public Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken cancellationToken) =>
            Task.FromResult<GoogleIdentity?>(idToken == "valid"
                ? new("google-subject-1", "google@example.com", "Google Customer", true)
                : null);
    }
}
