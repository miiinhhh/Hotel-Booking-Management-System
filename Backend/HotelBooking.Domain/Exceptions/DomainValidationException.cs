namespace HotelBooking.Domain.Exceptions;

public sealed class DomainValidationException(string message) : Exception(message);
