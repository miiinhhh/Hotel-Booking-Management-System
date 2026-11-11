using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public interface IPasswordPolicy
{
    void Validate(string password, string? fullName = null, string? email = null);
}

public sealed class PasswordPolicy : IPasswordPolicy
{
    public const int MinimumLength = 15;
    public const int MaximumLength = 128;

    private static readonly HashSet<string> Blocked = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password123", "password123!", "12345678", "123456789",
        "qwerty", "qwerty123", "admin", "admin123", "administrator",
        "letmein", "welcome", "stayluxe", "hotelbooking", "password123456"
    };

    public void Validate(string password, string? fullName = null, string? email = null)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Length < MinimumLength || password.Length > MaximumLength)
            throw new DomainRuleException($"Password must contain {MinimumLength} to {MaximumLength} characters.");

        var candidate = password.Trim();
        if (Blocked.Contains(candidate))
            throw new DomainRuleException("Choose a password that is not commonly used.");

        var emailValue = email?.Trim();
        var nameValue = fullName?.Trim();
        if ((!string.IsNullOrEmpty(emailValue) && candidate.Equals(emailValue, StringComparison.OrdinalIgnoreCase)) ||
            (!string.IsNullOrEmpty(nameValue) && candidate.Equals(nameValue, StringComparison.OrdinalIgnoreCase)))
            throw new DomainRuleException("Password must not be the same as your name or email address.");
    }
}
