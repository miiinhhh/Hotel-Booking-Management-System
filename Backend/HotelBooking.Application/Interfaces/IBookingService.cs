namespace HotelBooking.Application.Interfaces;

using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;

public interface IBookingService
{
    Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(long customerId, CreateBookingRequest request);
    Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(long bookingId, long actorId, bool canManageAll);
    Task<ApiResponse<BookingResponseDto>> GetBookingByCodeAsync(string bookingCode, long actorId, bool canManageAll);
    Task<ApiResponse<List<BookingListDto>>> GetBookingsAsync(BookingFilterRequest filter);
    Task<ApiResponse<bool>> CancelBookingAsync(long bookingId, long userId, bool canManageAll, CancelBookingRequest request);
    Task<ApiResponse<bool>> UpdateBookingStatusAsync(long bookingId, long staffUserId, UpdateBookingRequest request);
}
