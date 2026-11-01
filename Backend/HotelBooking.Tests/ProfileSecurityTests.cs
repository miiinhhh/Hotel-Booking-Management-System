using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HotelBooking.Application.Auth;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SkiaSharp;
using Xunit;

namespace HotelBooking.Tests;

public sealed class ProfileSecurityTests
{
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
        client.PostAsJsonAsync("/api/auth/login", new { email = "user4@example.com", password, rememberMe = false });

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
