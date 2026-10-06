namespace HotelBooking.Application.Interfaces;

using HotelBooking.Domain.Entities;

public interface IBookingRepository
{
    Task<Booking?> GetByIdAsync(long bookingId);
    Task<Booking?> GetByIdWithDetailsAsync(long bookingId);
    Task<Booking?> GetByCodeAsync(string bookingCode);
    Task<List<Booking>> GetListAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, int pageIndex, int pageSize);
    Task<int> GetCountAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate);
    Task<bool> IsRoomBookedAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeBookingId = null);
    Task AddAsync(Booking booking);
    Task UpdateAsync(Booking booking);
    Task AddStatusHistoryAsync(BookingStatusHistory history);
    Task SaveChangesAsync();
}
