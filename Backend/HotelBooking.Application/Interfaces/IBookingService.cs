namespace HotelBooking.Application.Interfaces;

using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;

public interface IBookingService
{
    Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(long customerId, CreateBookingRequest request);
    Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(long bookingId, long currentUserId, bool isAdmin, bool isStaff);
    Task<ApiResponse<BookingResponseDto>> GetBookingByCodeAsync(string bookingCode, long currentUserId, bool isAdmin, bool isStaff);
    Task<ApiResponse<List<BookingListDto>>> GetBookingsAsync(BookingFilterRequest filter, long currentUserId, bool isAdmin, bool isStaff);
    Task<ApiResponse<bool>> CancelBookingAsync(long bookingId, long currentUserId, bool isAdmin, CancelBookingRequest request);
    Task<ApiResponse<bool>> UpdateBookingStatusAsync(long bookingId, long staffUserId, bool isAdmin, UpdateBookingRequest request);
}
