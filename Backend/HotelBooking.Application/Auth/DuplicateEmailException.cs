namespace HotelBooking.Application.Auth;

public sealed class DuplicateEmailException(string email)
    : InvalidOperationException($"An account with email '{email}' already exists.");
