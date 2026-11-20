namespace HotelBooking.Application.Interfaces;

using HotelBooking.Domain.Entities;

/// <summary>Kết quả giữ phòng kèm các bước phụ (vd. trừ lượt voucher) trong cùng giao dịch.</summary>
public enum ReservationOutcome { Reserved, RoomUnavailable, Rejected }

public interface IBookingRepository
{
    Task<Booking?> GetByIdAsync(long bookingId);
    Task<Booking?> GetByIdWithDetailsAsync(long bookingId);
    Task<Booking?> GetByCodeAsync(string bookingCode);
    Task<List<Booking>> GetListAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, int pageIndex, int pageSize, long? staffUserId = null);
    Task<int> GetCountAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, long? staffUserId = null);
    Task<bool> IsRoomBookedAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeBookingId = null);
    Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId);
    Task<List<int>> GetAssignedAreaIdsAsync(long staffUserId);
    Task AddAsync(Booking booking);
    Task<bool> TryReserveAsync(Booking booking);
    /// <summary>
    /// Giữ phòng rồi chạy <paramref name="withinTransaction"/> trong CÙNG giao dịch/khóa phòng.
    /// Nếu bước phụ trả false (vd. voucher vừa hết lượt) thì booking cũng bị hủy (rollback).
    /// Mặc định (cho các bản giả lập trong test) chạy tuần tự không có giao dịch.
    /// </summary>
    async Task<ReservationOutcome> TryReserveAsync(Booking booking, Func<Task<bool>> withinTransaction)
    {
        if (!await TryReserveAsync(booking)) return ReservationOutcome.RoomUnavailable;
        return await withinTransaction() ? ReservationOutcome.Reserved : ReservationOutcome.Rejected;
    }
    Task<bool> TrySaveReservedAsync(Booking booking);
    Task UpdateAsync(Booking booking);
    Task AddStatusHistoryAsync(BookingStatusHistory history);
    Task SaveChangesAsync();
}
