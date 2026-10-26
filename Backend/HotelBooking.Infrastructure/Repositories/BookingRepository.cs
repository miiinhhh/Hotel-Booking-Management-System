using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

using RoomPersistenceDbContext = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Infrastructure.Repositories;

public class BookingRepository : IBookingRepository
{
    private readonly HotelBookingDBContext _context;
    private readonly RoomPersistenceDbContext? _roomContext;

    public BookingRepository(
        HotelBookingDBContext context,
        RoomPersistenceDbContext? roomContext = null)
    {
        _context = context;
        _roomContext = roomContext;
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

    public async Task<List<Booking>> GetListAsync(
        long? customerId,
        string? status,
        string? paymentStatus,
        DateOnly? fromDate,
        DateOnly? toDate,
        int pageIndex,
        int pageSize,
        long? staffUserId = null)
    {
        var query = _context.Bookings
            .Include(b => b.BookingDetails)
            .AsNoTracking()
            .AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(b => b.CustomerId == customerId.Value);
        }

        // Lọc theo phân khu của Nhân viên (nếu có staffUserId)
        if (staffUserId.HasValue && _roomContext != null)
        {
            var assignedAreaIds = await _roomContext.StaffAreaAssignments
                .Where(s => s.UserId == staffUserId.Value && s.IsActive)
                .Select(s => s.AreaId)
                .ToListAsync();

            if (assignedAreaIds.Count == 0)
            {
                return new List<Booking>();
            }

            var assignedRoomIds = await _roomContext.Rooms
                .Where(r => assignedAreaIds.Contains(r.AreaId))
                .Select(r => r.RoomId)
                .ToListAsync();

            if (assignedRoomIds.Count == 0)
            {
                return new List<Booking>();
            }

            query = query.Where(b => b.BookingDetails.Any(bd => assignedRoomIds.Contains(bd.RoomId)));
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

    public async Task<int> GetCountAsync(
        long? customerId,
        string? status,
        string? paymentStatus,
        DateOnly? fromDate,
        DateOnly? toDate,
        long? staffUserId = null)
    {
        var query = _context.Bookings.AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(b => b.CustomerId == customerId.Value);
        }

        if (staffUserId.HasValue && _roomContext != null)
        {
            var assignedAreaIds = await _roomContext.StaffAreaAssignments
                .Where(s => s.UserId == staffUserId.Value && s.IsActive)
                .Select(s => s.AreaId)
                .ToListAsync();

            if (assignedAreaIds.Count == 0) return 0;

            var assignedRoomIds = await _roomContext.Rooms
                .Where(r => assignedAreaIds.Contains(r.AreaId))
                .Select(r => r.RoomId)
                .ToListAsync();

            if (assignedRoomIds.Count == 0) return 0;

            query = query.Where(b => b.BookingDetails.Any(bd => assignedRoomIds.Contains(bd.RoomId)));
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

    public async Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId)
    {
        if (_roomContext == null) return true;

        var bookingRoomIds = await _context.BookingDetails
            .Where(bd => bd.BookingId == bookingId)
            .Select(bd => bd.RoomId)
            .ToListAsync();

        if (bookingRoomIds.Count == 0) return false;

        return await _roomContext.Rooms
            .Where(r => bookingRoomIds.Contains(r.RoomId))
            .AnyAsync(r => _roomContext.StaffAreaAssignments
                .Any(saa => saa.AreaId == r.AreaId && saa.UserId == staffUserId && saa.IsActive));
    }

    public async Task<List<int>> GetAssignedAreaIdsAsync(long staffUserId)
    {
        if (_roomContext == null) return new List<int>();

        return await _roomContext.StaffAreaAssignments
            .Where(saa => saa.UserId == staffUserId && saa.IsActive)
            .Select(saa => saa.AreaId)
            .ToListAsync();
    }

    public async Task<bool> IsRoomBookedAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeBookingId = null)
    {
        var query = _context.BookingDetails
            .Where(d => d.RoomId == roomId)
            .Where(d => d.Booking.BookingStatus == BookingStatus.Confirmed || d.Booking.BookingStatus == BookingStatus.CheckedIn ||
                (d.Booking.BookingStatus == BookingStatus.Pending && (d.Booking.HoldExpiresAt == null || d.Booking.HoldExpiresAt > DateTime.UtcNow)))
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

    public Task<bool> TryReserveAsync(Booking booking) => new RoomInventoryRepository(_context).Reserve(booking);
    public Task<bool> TrySaveReservedAsync(Booking booking) => new RoomInventoryRepository(_context).Reserve(booking, updating: true);

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
