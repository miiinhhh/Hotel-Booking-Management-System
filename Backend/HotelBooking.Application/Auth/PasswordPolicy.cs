using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Auth;

public interface IPasswordPolicy
{
    void Validate(string password, string? fullName = null, string? email = null);
}

public sealed class PasswordPolicy : IPasswordPolicy
{
    /// <summary>Tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 ký tự đặc biệt.</summary>
    public const int MinimumLength = 8;
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
            throw new DomainRuleException($"Mật khẩu phải có từ {MinimumLength} đến {MaximumLength} ký tự.");
        if (!password.Any(char.IsUpper))
            throw new DomainRuleException("Mật khẩu phải có ít nhất 1 chữ in hoa.");
        if (!password.Any(c => !char.IsLetterOrDigit(c) && !char.IsWhiteSpace(c)))
            throw new DomainRuleException("Mật khẩu phải có ít nhất 1 ký tự đặc biệt (VD ! @ # $ %).");

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
