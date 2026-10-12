using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly HotelBookingDBContext _context;

    public BookingRepository(HotelBookingDBContext context)
    {
        _context = context;
    }

    public async Task<Booking?> GetByIdAsync(long bookingId)
    {
        return await _context.Bookings.FindAsync(bookingId);
    }

    public async Task<Booking?> GetByIdWithDetailsAsync(long bookingId)
    {
        return await _context.Bookings
            .Include(b => b.BookingDetails)
            .Include(b => b.BookingGuests)
            .Include(b => b.StatusHistories.OrderByDescending(h => h.ChangedAt))
            .FirstOrDefaultAsync(b => b.BookingId == bookingId);
    }

    public async Task<Booking?> GetByCodeAsync(string bookingCode)
    {
        return await _context.Bookings
            .Include(b => b.BookingDetails)
            .Include(b => b.BookingGuests)
            .Include(b => b.StatusHistories.OrderByDescending(h => h.ChangedAt))
            .FirstOrDefaultAsync(b => b.BookingCode == bookingCode);
    }

    public async Task<List<Booking>> GetListAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, int pageIndex, int pageSize)
    {
        var query = _context.Bookings
            .Include(b => b.BookingDetails)
            .AsNoTracking()
            .AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(b => b.CustomerId == customerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BookingStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(b => b.BookingStatus == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus))
        {
            query = query.Where(b => b.PaymentStatus == paymentStatus);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(b => b.CheckInDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(b => b.CheckOutDate <= toDate.Value);
        }

        return await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip((pageIndex - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();
    }

    public async Task<int> GetCountAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate)
    {
        var query = _context.Bookings.AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(b => b.CustomerId == customerId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BookingStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(b => b.BookingStatus == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(paymentStatus))
        {
            query = query.Where(b => b.PaymentStatus == paymentStatus);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(b => b.CheckInDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(b => b.CheckOutDate <= toDate.Value);
        }

        return await query.CountAsync();
    }

    public async Task<bool> IsRoomBookedAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeBookingId = null)
    {
        var query = _context.BookingDetails
            .Where(d => d.RoomId == roomId)
            .Where(d => d.Booking.BookingStatus != BookingStatus.Cancelled && d.Booking.BookingStatus != BookingStatus.Expired)
            .Where(d => d.Booking.CheckInDate < checkOut && d.Booking.CheckOutDate > checkIn);

        if (excludeBookingId.HasValue)
        {
            query = query.Where(d => d.BookingId != excludeBookingId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task AddAsync(Booking booking)
    {
        await _context.Bookings.AddAsync(booking);
    }

    public Task UpdateAsync(Booking booking)
    {
        _context.Bookings.Update(booking);
        return Task.CompletedTask;
    }

    public async Task AddStatusHistoryAsync(BookingStatusHistory history)
    {
        await _context.BookingStatusHistory.AddAsync(history);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }
}
