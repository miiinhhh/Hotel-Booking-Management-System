namespace HotelBooking.Application.Hotels;

public sealed class HotelNotFoundException(int hotelId) : Exception($"Không tìm thấy Hotel {hotelId}.");
public sealed class HotelConflictException(string message, Exception? innerException = null) : Exception(message, innerException);
