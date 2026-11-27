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
    /// <summary>Tên khách sạn, hạng phòng và ảnh đại diện theo RoomId (hiển thị danh sách đơn).</summary>
    Task<Dictionary<long, BookingRoomDisplay>> GetRoomDisplayInfoAsync(IReadOnlyCollection<long> roomIds);
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
    Task<bool> AreRoomsAvailableForRescheduleAsync(long bookingId, IReadOnlyCollection<long> roomIds, DateOnly checkIn, DateOnly checkOut);
    /// <summary>
    /// Một phòng khác CÙNG HẠNG, còn trống trong khoảng ngày (bỏ qua các phòng trong <paramref name="exclude"/>).
    /// Dùng khi phòng hệ thống xếp tạm vừa bị người khác giữ: khách đặt theo hạng phòng, không theo số phòng.
    /// </summary>
    Task<long?> FindAlternativeRoomAsync(long roomId, DateOnly checkIn, DateOnly checkOut, IReadOnlyCollection<long> exclude)
        => Task.FromResult<long?>(null);
    /// <summary>Các phòng cùng hạng còn trống cho đơn (bỏ qua chính đơn), lọc theo phân khu nếu có.</summary>
    Task<List<RoomChangeOption>> RoomChangeOptionsAsync(long bookingId, long currentRoomId, DateOnly checkIn, DateOnly checkOut, IReadOnlyCollection<int>? areaIds)
        => Task.FromResult(new List<RoomChangeOption>());
    /// <summary>Số đơn giữ phòng chưa trả tiền và số lần không đến của khách (áp dụng BookingLimits).</summary>
    Task<HotelBooking.Application.Common.CustomerBookingStats> GetCustomerBookingStatsAsync(long customerId)
        => Task.FromResult(new HotelBooking.Application.Common.CustomerBookingStats(0, 0, 0));
    Task UpdateAsync(Booking booking);
    Task AddStatusHistoryAsync(BookingStatusHistory history);
    Task SaveChangesAsync();
}

public sealed record BookingRoomDisplay(string HotelName, string RoomTypeName, string? ImageUrl, string RoomNumber = "");

/// <summary>Phòng có thể chuyển sang (cùng hạng, còn trống).</summary>
public sealed record RoomChangeOption(long RoomId, string RoomNumber, int Floor, string RoomTypeName);
