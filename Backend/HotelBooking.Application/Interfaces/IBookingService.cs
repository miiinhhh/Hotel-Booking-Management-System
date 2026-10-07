namespace HotelBooking.Application.Interfaces;

using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;

public interface IBookingService
{
    Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(long customerId, CreateBookingRequest request);
    Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(long bookingId);
    Task<ApiResponse<BookingResponseDto>> GetBookingByCodeAsync(string bookingCode);
    Task<ApiResponse<List<BookingListDto>>> GetBookingsAsync(BookingFilterRequest filter);
    Task<ApiResponse<bool>> CancelBookingAsync(long bookingId, long userId, CancelBookingRequest request);
    Task<ApiResponse<bool>> UpdateBookingStatusAsync(long bookingId, long staffUserId, UpdateBookingRequest request);
}
