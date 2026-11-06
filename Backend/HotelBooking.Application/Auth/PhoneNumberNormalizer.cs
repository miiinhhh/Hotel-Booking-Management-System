namespace HotelBooking.Application.Auth;

/// <summary>
/// Normalizes Vietnamese phone numbers to E.164 while retaining lookup aliases for legacy data.
/// </summary>
public static class PhoneNumberNormalizer
{
    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var trimmed = value.Trim();
        var hasInternationalPrefix = trimmed.StartsWith('+');
        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length == 0) return null;

        if (trimmed.StartsWith("00", StringComparison.Ordinal) && digits.Length > 2)
            return $"+{digits[2..]}";
        if (hasInternationalPrefix)
            return $"+{digits}";
        if (digits.Length == 10 && digits[0] == '0')
            return $"+84{digits[1..]}";
        if (digits.Length == 11 && digits.StartsWith("84", StringComparison.Ordinal))
            return $"+{digits}";
        return digits;
    }

    public static string[] LookupCandidates(string value)
    {
        var normalized = Normalize(value);
        if (normalized is null) return [];
        var candidates = new HashSet<string>(StringComparer.Ordinal) { normalized, value.Trim() };
        if (normalized.StartsWith("+84", StringComparison.Ordinal) && normalized.Length > 3)
        {
            candidates.Add($"0{normalized[3..]}");
            candidates.Add(normalized[1..]);
        }
        return candidates.ToArray();
    }
}
