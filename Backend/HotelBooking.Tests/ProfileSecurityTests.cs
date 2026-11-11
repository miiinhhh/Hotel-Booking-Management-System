using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HotelBooking.Application.Auth;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SkiaSharp;
using Xunit;

namespace HotelBooking.Tests;

public sealed class ProfileSecurityTests
{
    [Fact]
    public async Task Profile_identity_comes_only_from_the_access_token()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        Authenticate(client, await factory.Token(4));

        var profile = await client.GetFromJsonAsync<AccountProfileResponse>("/api/me?userId=2");

        Assert.NotNull(profile);
        Assert.Equal(4, profile.UserId);
        Assert.Equal("user4@example.com", profile.Email);
    }

    [Fact]
    public async Task Price_preview_rejects_a_client_supplied_customer_identity()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        var response = await client.PostAsJsonAsync("/api/bookings/calculate-price", new
        {
            checkInDate = "2030-01-01",
            checkOutDate = "2030-01-02",
            roomIds = new[] { 1 },
            customerId = 2
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("short-password")]
    [InlineData("password123456")]
    public void Password_policy_rejects_short_or_common_passwords(string password)
    {
        var policy = new PasswordPolicy();
        Assert.Throws<DomainRuleException>(() => policy.Validate(password, "Customer Four", "user4@example.com"));
    }

    [Fact]
    public void Password_hasher_accepts_legacy_hashes_and_marks_them_for_upgrade()
    {
        const string password = "ValidPassword123!";
        var hasher = new Pbkdf2PasswordHasher();
        var salt = RandomNumberGenerator.GetBytes(16);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, 100_000, HashAlgorithmName.SHA256, 32);
        var legacyHash = $"PBKDF2-SHA256$100000${Convert.ToBase64String(salt)}${Convert.ToBase64String(key)}";

        Assert.True(hasher.Verify(password, legacyHash));
        Assert.True(hasher.NeedsRehash(legacyHash));
        Assert.False(hasher.NeedsRehash(hasher.Hash(password)));
    }

    [Fact]
    public async Task Availability_and_profile_update_enforce_unique_email_and_phone()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<HotelBookingDbContext>();
            var other = await db.Users.SingleAsync(x => x.UserId == 2);
            other.Phone = "+84901111111";
            await db.SaveChangesAsync();
        }
        Authenticate(client, await factory.Token(4));

        var profileOnlyWithoutReauthentication = await client.PutAsJsonAsync("/api/me", new
        {
            fullName = "Changed without verification", email = "user4@example.com", phone = (string?)null, dateOfBirth = (string?)null
        });
        Assert.Equal(HttpStatusCode.Unauthorized, profileOnlyWithoutReauthentication.StatusCode);

        var unavailable = await client.GetFromJsonAsync<AccountAvailabilityResponse>(
            "/api/me/availability?email=user2%40example.com&phone=%2B84901111111");
        Assert.False(unavailable!.EmailAvailable);
        Assert.False(unavailable.PhoneAvailable);

        var withoutReauthentication = await client.PutAsJsonAsync("/api/me", new
        {
            fullName = "Customer Four", email = "customer4@example.com", phone = "+84902222222", dateOfBirth = "2000-01-01T00:00:00Z"
        });
        Assert.Equal(HttpStatusCode.Unauthorized, withoutReauthentication.StatusCode);

        Assert.Equal(HttpStatusCode.OK,
            (await client.PostAsJsonAsync("/api/me/reauthenticate", new { password = "ValidPassword123!" })).StatusCode);

        var duplicate = await client.PutAsJsonAsync("/api/me", new
        {
            fullName = "Customer Four", email = "user2@example.com", phone = "+84902222222", dateOfBirth = "2000-01-01T00:00:00Z"
        });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var updated = await client.PutAsJsonAsync("/api/me", new
        {
            fullName = "Customer Four", email = "customer4@example.com", phone = "+84902222222", dateOfBirth = "2000-01-01T00:00:00Z"
        });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        var profile = await updated.Content.ReadFromJsonAsync<AccountProfileResponse>();
        Assert.Equal("customer4@example.com", profile!.Email);
        Assert.Equal("+84902222222", profile.Phone);
    }

    [Fact]
    public async Task Reauthentication_and_password_change_revoke_old_session()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        var login = await Login(client, "ValidPassword123!");
        Authenticate(client, login.AccessToken);

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.PostAsJsonAsync("/api/me/reauthenticate", new { password = "wrong-password" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await client.PostAsJsonAsync("/api/me/reauthenticate", new { password = "ValidPassword123!" })).StatusCode);

        var changed = await client.PostAsJsonAsync("/api/me/change-password", new
        {
            currentPassword = "ValidPassword123!", newPassword = "ChangedPassword123!"
        });
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/me")).StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.Unauthorized, (await LoginResponse(client, "ValidPassword123!")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await LoginResponse(client, "ChangedPassword123!")).StatusCode);
    }

    [Fact]
    public async Task Avatar_can_be_uploaded_read_and_removed()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        Authenticate(client, await factory.Token(4));

        using var upload = AvatarUpload();
        var response = await client.PutAsync("/api/me/avatar", upload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<AccountProfileResponse>();
        Assert.Equal("/api/users/4/avatar", profile!.AvatarUrl);
        Assert.NotNull(profile.AvatarUpdatedAt);

        var content = await client.GetAsync("/api/me/avatar/content");
        Assert.Equal(HttpStatusCode.OK, content.StatusCode);
        Assert.Equal("image/png", content.Content.Headers.ContentType?.MediaType);
        Assert.NotEmpty(await content.Content.ReadAsByteArrayAsync());
        client.DefaultRequestHeaders.Authorization = null;
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/users/4/avatar")).StatusCode);
        Authenticate(client, await factory.Token(4));

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync("/api/me/avatar")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/me/avatar/content")).StatusCode);
    }

    private static void Authenticate(HttpClient client, string token) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    private static async Task<LoginPayload> Login(HttpClient client, string password)
    {
        var response = await LoginResponse(client, password);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<LoginPayload>(new JsonSerializerOptions(JsonSerializerDefaults.Web)))!;
    }

    private static Task<HttpResponseMessage> LoginResponse(HttpClient client, string password) =>
        client.PostAsJsonAsync("/api/auth/customer/login", new { email = "user4@example.com", password, rememberMe = false });

    private static MultipartFormDataContent AvatarUpload()
    {
        using var bitmap = new SKBitmap(4, 4);
        bitmap.Erase(SKColors.DarkBlue);
        using var encoded = bitmap.Encode(SKEncodedImageFormat.Png, 90);
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(encoded.ToArray());
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "avatar.png");
        return form;
    }

    private sealed record LoginPayload(string AccessToken);
}
