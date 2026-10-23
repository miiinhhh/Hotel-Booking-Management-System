using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using HotelBooking.API.Authentication;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace HotelBooking.Tests;

public sealed class AuthenticationAuthorizationTests
{
    [Fact]
    public async Task MissingTokenReturnsStandardProblemDetails()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        var response = await client.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        await AssertProblemCode(response, AuthenticationErrorCodes.TokenMissing);
    }

    [Fact]
    public async Task InvalidTokenReturnsStandardProblemDetails()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "not-a-valid-jwt");

        var response = await client.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertProblemCode(response, AuthenticationErrorCodes.TokenInvalid);
    }

    [Fact]
    public async Task InvalidCredentialsReturnStandardProblemDetails()
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();

        var response = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "user4@example.com",
            password = "wrong-password"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertProblemCode(response, AuthenticationErrorCodes.InvalidCredentials);
    }

    [Theory]
    [InlineData(1, "/api/admin", 200)]
    [InlineData(1, "/api/staff/resource", 200)]
    [InlineData(2, "/api/admin", 403)]
    [InlineData(2, "/api/staff/resource", 200)]
    [InlineData(4, "/api/admin", 403)]
    [InlineData(4, "/api/staff/resource", 403)]
    public async Task RolePoliciesEnforceAdminStaffAndCustomer(long userId, string endpoint, int expectedStatus)
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(userId));

        var response = await client.GetAsync(endpoint);

        Assert.Equal(expectedStatus, (int)response.StatusCode);
        if (expectedStatus == StatusCodes.Status403Forbidden)
            await AssertProblemCode(response, AuthenticationErrorCodes.AccessDenied);
    }

    [Theory]
    [InlineData(1, 403)]
    [InlineData(2, 403)]
    [InlineData(4, 400)]
    public async Task OnlyCustomerCanReachCreateBookingAction(long userId, int expectedStatus)
    {
        using var factory = new StaffFactory();
        using var client = factory.CreateClient();
        await factory.Seed();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(userId));

        var response = await client.PostAsJsonAsync("/api/bookings", new { });

        Assert.Equal(expectedStatus, (int)response.StatusCode);
        if (expectedStatus == StatusCodes.Status403Forbidden)
            await AssertProblemCode(response, AuthenticationErrorCodes.AccessDenied);
    }

    [Fact]
    public async Task InactiveAccountInvalidatesAnExistingTokenWithStandardError()
    {
        using var factory = new StaffFactory();
        using var admin = factory.CreateClient();
        using var staff = factory.CreateClient();
        await factory.Seed();
        admin.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(1));
        staff.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", await factory.Token(2));

        var locked = await admin.PatchAsJsonAsync("/api/staff/2/status", new { isActive = false });
        Assert.Equal(HttpStatusCode.OK, locked.StatusCode);
        var response = await staff.GetAsync("/api/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        await AssertProblemCode(response, AuthenticationErrorCodes.AccountUnavailable);
    }

    private static async Task AssertProblemCode(HttpResponseMessage response, string expectedCode)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;
        Assert.Equal(expectedCode, root.GetProperty("code").GetString());
        Assert.Equal((int)response.StatusCode, root.GetProperty("status").GetInt32());
        Assert.True(root.TryGetProperty("traceId", out _));
        Assert.True(root.TryGetProperty("instance", out _));
    }
}
