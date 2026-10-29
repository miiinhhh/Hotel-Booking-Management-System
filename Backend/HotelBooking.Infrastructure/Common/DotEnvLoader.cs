using System;
using System.IO;

namespace HotelBooking.Infrastructure.Common;

public static class DotEnvLoader
{
    private static bool _loaded = false;

    public static void Load(string? searchDirectory = null)
    {
        if (_loaded) return;

        var startDir = searchDirectory ?? Directory.GetCurrentDirectory();
        var envFile = FindEnvFile(startDir);

        if (envFile != null && File.Exists(envFile))
        {
            foreach (var rawLine in File.ReadAllLines(envFile))
            {
                var line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
                    continue;

                var parts = line.Split('=', 2);
                if (parts.Length != 2)
                    continue;

                var key = parts[0].Trim();
                var val = parts[1].Trim().Trim('"', '\'');

                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                {
                    Environment.SetEnvironmentVariable(key, val);
                }

                // Map standard VNPAY env variables to ASP.NET Core configuration keys
                switch (key.ToUpperInvariant())
                {
                    case "VNPAY_TMN_CODE":
                        Environment.SetEnvironmentVariable("VnPay__TmnCode", val);
                        break;
                    case "VNPAY_SECURE_SECRET":
                        Environment.SetEnvironmentVariable("VnPay__HashSecret", val);
                        break;
                    case "VNPAY_HOST":
                        var baseUrl = val.EndsWith("/paymentv2/vpcpay.html", StringComparison.OrdinalIgnoreCase)
                            ? val
                            : $"{val.TrimEnd('/')}/paymentv2/vpcpay.html";
                        Environment.SetEnvironmentVariable("VnPay__BaseUrl", baseUrl);
                        break;
                    case "VNPAY_RETURN_URL":
                        Environment.SetEnvironmentVariable("VnPay__ReturnUrl", val);
                        break;
                    case "VNPAY_TEST_MODE":
                        Environment.SetEnvironmentVariable("VnPay__TestMode", val);
                        break;
                }
            }
        }

        _loaded = true;
    }

    private static string? FindEnvFile(string startDir)
    {
        var current = new DirectoryInfo(startDir);
        while (current != null)
        {
            var direct = Path.Combine(current.FullName, ".env");
            if (File.Exists(direct)) return direct;

            var backendEnv = Path.Combine(current.FullName, "Backend", ".env");
            if (File.Exists(backendEnv)) return backendEnv;

            current = current.Parent;
        }

        return null;
    }
}
