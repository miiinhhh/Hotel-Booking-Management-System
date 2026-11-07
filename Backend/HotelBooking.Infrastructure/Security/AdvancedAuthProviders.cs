using System.Net;
using System.Net.Mail;
using System.Text;
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

public sealed class GoogleAuthOptions
{
    public const string SectionName = "GoogleAuth";
    public string ClientId { get; set; } = string.Empty;
}

public sealed class OtpSender(
    IOptions<AuthDeliveryOptions> options,
    IOptions<AdvancedAuthOptions> authOptions,
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
        var isGmail = string.Equals(config.Host, "smtp.gmail.com", StringComparison.OrdinalIgnoreCase);
        var fromAddress = isGmail || string.IsNullOrWhiteSpace(config.FromAddress)
            ? config.Username
            : config.FromAddress;
        var password = isGmail
            ? config.Password.Replace(" ", string.Empty, StringComparison.Ordinal)
            : config.Password;
        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, config.FromName),
            Subject = purpose == OtpPurpose.PasswordReset
                ? "Mã xác thực đặt lại mật khẩu StayLuxe"
                : "Mã xác thực đăng nhập StayLuxe",
            Body = BuildOtpEmail(code, purpose, authOptions.Value.OtpLifetimeMinutes),
            IsBodyHtml = true,
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8
        };
        message.To.Add(destination);
        using var client = new SmtpClient(config.Host, config.Port)
        {
            EnableSsl = config.EnableSsl,
            Credentials = new NetworkCredential(config.Username, password)
        };
        await client.SendMailAsync(message, ct);
    }

    private static string BuildOtpEmail(string code, OtpPurpose purpose, int lifetimeMinutes)
    {
        var heading = purpose == OtpPurpose.PasswordReset
            ? "Đặt lại mật khẩu"
            : "Xác thực đăng nhập";
        var description = purpose == OtpPurpose.PasswordReset
            ? "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản StayLuxe của bạn."
            : "Sử dụng mã dưới đây để hoàn tất đăng nhập vào tài khoản StayLuxe của bạn.";

        return $$"""
        <!doctype html>
        <html lang="vi">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>{{heading}} - StayLuxe</title>
        </head>
        <body style="margin:0;padding:0;background:#fbf9f6;color:#1b1c1a;font-family:'Segoe UI',Arial,sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Mã xác thực StayLuxe của bạn là {{code}}.</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fbf9f6;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 32px rgba(57,12,0,.08);">
                  <tr>
                    <td style="background:#9b2f00;padding:26px 32px;color:#ffffff;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td style="width:42px;height:42px;border-radius:12px;background:#ffffff;color:#9b2f00;text-align:center;font-size:21px;font-weight:800;">S</td>
                          <td style="padding-left:13px;font-size:22px;font-weight:700;letter-spacing:-.3px;">StayLuxe</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:36px 32px 12px;">
                      <p style="margin:0 0 10px;color:#9b2f00;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">Bảo mật tài khoản</p>
                      <h1 style="margin:0 0 14px;color:#1b1c1a;font-size:28px;line-height:36px;">{{heading}}</h1>
                      <p style="margin:0;color:#59413a;font-size:15px;line-height:24px;">{{description}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:24px 32px;">
                      <div style="background:#ffdbd0;border:1px solid #ffb59d;border-radius:20px;padding:22px 16px;">
                        <p style="margin:0 0 8px;color:#832600;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Mã xác thực của bạn</p>
                        <p style="margin:0;color:#390c00;font-family:Consolas,'Courier New',monospace;font-size:38px;font-weight:800;letter-spacing:10px;line-height:48px;">{{code}}</p>
                      </div>
                      <p style="margin:14px 0 0;color:#8d7168;font-size:13px;line-height:20px;">Mã có hiệu lực trong <strong>{{lifetimeMinutes}} phút</strong> và chỉ sử dụng được một lần.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:4px 32px 32px;">
                      <div style="border-left:4px solid #c2410c;background:#f5f3f0;border-radius:10px;padding:14px 16px;color:#59413a;font-size:13px;line-height:20px;">
                        <strong style="color:#1b1c1a;">Không chia sẻ mã này.</strong><br>
                        Nhân viên StayLuxe sẽ không bao giờ yêu cầu bạn cung cấp mã OTP. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #e4e2df;padding:22px 32px;text-align:center;color:#8d7168;font-size:12px;line-height:18px;">
                      Email được gửi tự động từ StayLuxe. Vui lòng không trả lời email này.<br>
                      © {{DateTime.UtcNow.Year}} StayLuxe Hospitality Group
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        """;
    }

    private static bool IsSmtpConfigured(SmtpOptions x) =>
        !string.IsNullOrWhiteSpace(x.Host) &&
        !string.IsNullOrWhiteSpace(x.Username) &&
        !string.IsNullOrWhiteSpace(x.Password) &&
        (!string.IsNullOrWhiteSpace(x.FromAddress) || !string.IsNullOrWhiteSpace(x.Username));
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
