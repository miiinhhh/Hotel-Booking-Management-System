namespace HotelBooking.Application.Auth;

public sealed class DuplicatePhoneException(string phone)
    : Exception($"The phone number '{phone}' is already registered.");
