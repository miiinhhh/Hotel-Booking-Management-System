using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text.Json;
using HotelBooking.Application.Auth;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HotelBooking.Infrastructure.Security;

public sealed class AuthDeliveryOptions
{
    public const string SectionName = "AuthDelivery";
    public SmtpOptions Smtp { get; set; } = new();
    public TwilioOptions Twilio { get; set; } = new();
}

public sealed class SmtpOptions
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public bool EnableSsl { get; set; } = true;
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromName { get; set; } = "StayLuxe";
}

public sealed class TwilioOptions
{
    public string AccountSid { get; set; } = string.Empty;
    public string AuthToken { get; set; } = string.Empty;
    public string FromNumber { get; set; } = string.Empty;
}

public sealed class GoogleAuthOptions
{
    public const string SectionName = "GoogleAuth";
    public string ClientId { get; set; } = string.Empty;
}

public sealed class OtpSender(
    IOptions<AuthDeliveryOptions> options,
    IHttpClientFactory httpClients,
    IHostEnvironment environment,
    ILogger<OtpSender> logger) : IOtpSender
{
    public async Task SendAsync(OtpChannel channel, string destination, string code, OtpPurpose purpose, CancellationToken ct)
    {
        if (channel == OtpChannel.Email && IsSmtpConfigured(options.Value.Smtp))
        {
            await SendEmail(destination, code, purpose, ct);
            return;
        }
        if (channel == OtpChannel.Phone && IsTwilioConfigured(options.Value.Twilio))
        {
            await SendSms(destination, code, purpose, ct);
            return;
        }
        if (environment.IsDevelopment() || environment.IsEnvironment("Testing"))
        {
            logger.LogWarning("Development OTP for {Channel} {Destination}: {Code} ({Purpose})", channel, destination, code, purpose);
            return;
        }
        throw new InvalidOperationException($"OTP delivery for {channel} has not been configured.");
    }

    private async Task SendEmail(string destination, string code, OtpPurpose purpose, CancellationToken ct)
    {
        var config = options.Value.Smtp;
        using var message = new MailMessage
        {
            From = new MailAddress(config.FromAddress, config.FromName),
            Subject = purpose == OtpPurpose.PasswordReset ? "StayLuxe - Reset password code" : "StayLuxe - Sign-in code",
            Body = $"Your StayLuxe verification code is {code}. This code expires shortly.",
            IsBodyHtml = false
        };
        message.To.Add(destination);
        using var client = new SmtpClient(config.Host, config.Port)
        {
            EnableSsl = config.EnableSsl,
            Credentials = new NetworkCredential(config.Username, config.Password)
        };
        await client.SendMailAsync(message, ct);
    }

    private async Task SendSms(string destination, string code, OtpPurpose purpose, CancellationToken ct)
    {
        var config = options.Value.Twilio;
        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://api.twilio.com/2010-04-01/Accounts/{Uri.EscapeDataString(config.AccountSid)}/Messages.json");
        var auth = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{config.AccountSid}:{config.AuthToken}"));
        request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);
        request.Content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["To"] = destination,
            ["From"] = config.FromNumber,
            ["Body"] = $"StayLuxe code: {code}. Purpose: {purpose}."
        });
        using var response = await httpClients.CreateClient(nameof(OtpSender)).SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }

    private static bool IsSmtpConfigured(SmtpOptions x) =>
        !string.IsNullOrWhiteSpace(x.Host) && !string.IsNullOrWhiteSpace(x.FromAddress);
    private static bool IsTwilioConfigured(TwilioOptions x) =>
        !string.IsNullOrWhiteSpace(x.AccountSid) && !string.IsNullOrWhiteSpace(x.AuthToken) && !string.IsNullOrWhiteSpace(x.FromNumber);
}

public sealed class GoogleTokenValidator(HttpClient client, IOptions<GoogleAuthOptions> options) : IGoogleTokenValidator
{
    public async Task<GoogleIdentity?> ValidateAsync(string idToken, CancellationToken ct)
    {
        var clientId = options.Value.ClientId;
        if (string.IsNullOrWhiteSpace(clientId)) return null;
        using var response = await client.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(idToken)}", ct);
        if (!response.IsSuccessStatusCode) return null;
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var root = document.RootElement;
        var audience = Text(root, "aud");
        var subject = Text(root, "sub");
        var email = Text(root, "email");
        var name = Text(root, "name") ?? email;
        var verified = string.Equals(Text(root, "email_verified"), "true", StringComparison.OrdinalIgnoreCase);
        var validExpiry = long.TryParse(Text(root, "exp"), out var exp) && DateTimeOffset.FromUnixTimeSeconds(exp) > DateTimeOffset.UtcNow;
        if (audience != clientId || string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email) || !verified || !validExpiry)
            return null;
        return new GoogleIdentity(subject, email, name ?? email, true);
    }

    private static string? Text(JsonElement root, string property) =>
        root.TryGetProperty(property, out var value) ? value.ToString() : null;
}
