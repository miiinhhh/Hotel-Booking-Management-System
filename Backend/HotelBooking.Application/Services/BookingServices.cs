namespace HotelBooking.Application.Services;

using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;

public class BookingServices : IBookingService
{
    private readonly IBookingRepository _bookingRepository;

    public BookingServices(IBookingRepository bookingRepository)
    {
        _bookingRepository = bookingRepository;
    }

    public async Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(long customerId, CreateBookingRequest request)
    {
        // 1. Kiểm tra ngày đặt
        if (request.CheckOutDate <= request.CheckInDate)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Ngày trả phòng (CheckOut) phải sau ngày nhận phòng (CheckIn).");
        }

        if (request.Rooms == null || request.Rooms.Count == 0)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Vui lòng chọn ít nhất 1 phòng để đặt.");
        }

        // 2. Kiểm tra xung đột lịch đặt từng phòng (Double booking check)
        foreach (var room in request.Rooms)
        {
            var isBooked = await _bookingRepository.IsRoomBookedAsync(room.RoomId, request.CheckInDate, request.CheckOutDate);
            if (isBooked)
            {
                return ApiResponse<BookingResponseDto>.FailureResult($"Phòng (ID: {room.RoomId}) đã được đặt trong khoảng thời gian này.");
            }
        }

        // 3. Tính toán số đêm và số tiền
        int numberOfNights = request.CheckOutDate.DayNumber - request.CheckInDate.DayNumber;
        decimal subTotal = 0;
        var bookingDetails = new List<BookingDetail>();

        foreach (var room in request.Rooms)
        {
            decimal roomSubTotal = room.UnitPrice * numberOfNights;
            subTotal += roomSubTotal;

            bookingDetails.Add(new BookingDetail
            {
                RoomId = room.RoomId,
                UnitPrice = room.UnitPrice,
                NumberOfNights = numberOfNights,
                SubTotal = roomSubTotal
            });
        }

        decimal taxAmount = Math.Round(subTotal * 0.10m, 2); // 10% VAT
        decimal feeAmount = 0m;
        decimal discountAmount = 0m;
        decimal totalAmount = subTotal + taxAmount + feeAmount - discountAmount;

        // Tính tiền cọc (Nếu là Deposit thì tạm tính cọc 30%, Cash thì thanh toán khi check-in)
        decimal depositAmount = 0m;
        if (string.Equals(request.PaymentMethod, "Deposit", StringComparison.OrdinalIgnoreCase))
        {
            depositAmount = Math.Round(totalAmount * 0.30m, 2);
        }
        decimal remainingAmount = totalAmount - depositAmount;

        // 4. Sinh mã đặt phòng duy nhất: BK + yyyyMMddHHmmss + 3 số ngẫu nhiên
        string bookingCode = $"BK{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";

        // 5. Khởi tạo Entity Booking
        var booking = new Booking
        {
            BookingCode = bookingCode,
            CustomerId = customerId,
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            NumberOfGuests = request.NumberOfGuests,
            BookingStatus = BookingStatus.Pending,
            PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Deposit" : request.PaymentMethod,
            PaymentStatus = "Unpaid",
            SubTotal = subTotal,
            TaxAmount = taxAmount,
            FeeAmount = feeAmount,
            DiscountAmount = discountAmount,
            TotalAmount = totalAmount,
            DepositAmount = depositAmount,
            RemainingAmount = remainingAmount,
            SpecialRequests = request.SpecialRequests,
            HoldExpiresAt = DateTime.UtcNow.AddMinutes(15), // Giữ phòng 15 phút
            CreatedAt = DateTime.UtcNow,
            BookingDetails = bookingDetails
        };

        // Thêm danh sách khách đi kèm
        if (request.Guests != null && request.Guests.Count > 0)
        {
            foreach (var guest in request.Guests)
            {
                booking.BookingGuests.Add(new BookingGuest
                {
                    FullName = guest.FullName,
                    Phone = guest.Phone,
                    Email = guest.Email,
                    IsPrimaryGuest = guest.IsPrimaryGuest
                });
            }
        }

        // Ghi nhận lịch sử trạng thái ban đầu
        booking.StatusHistories.Add(new BookingStatusHistory
        {
            OldStatus = null,
            NewStatus = BookingStatus.Pending.ToString(),
            ChangedByUserId = customerId,
            ChangedAt = DateTime.UtcNow,
            Note = "Đơn đặt phòng mới được tạo (chờ thanh toán cọc/xác nhận)."
        });

        // 6. Lưu vào CSDL
        await _bookingRepository.AddAsync(booking);
        await _bookingRepository.SaveChangesAsync();

        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking), "Đặt phòng thành công. Vui lòng thanh toán cọc trong 15 phút để giữ phòng.");
    }

    public async Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(long bookingId)
    {
        var booking = await _bookingRepository.GetByIdWithDetailsAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Không tìm thấy thông tin đơn đặt phòng.");
        }

        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
    }

    public async Task<ApiResponse<BookingResponseDto>> GetBookingByCodeAsync(string bookingCode)
    {
        var booking = await _bookingRepository.GetByCodeAsync(bookingCode);
        if (booking == null)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Không tìm thấy thông tin đơn đặt phòng theo mã này.");
        }

        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
    }

    public async Task<ApiResponse<List<BookingListDto>>> GetBookingsAsync(BookingFilterRequest filter)
    {
        var bookings = await _bookingRepository.GetListAsync(
            filter.CustomerId,
            filter.Status,
            filter.PaymentStatus,
            filter.FromDate,
            filter.ToDate,
            filter.PageIndex,
            filter.PageSize
        );

        var listDto = bookings.Select(b => new BookingListDto
        {
            BookingId = b.BookingId,
            BookingCode = b.BookingCode,
            CustomerId = b.CustomerId,
            CheckInDate = b.CheckInDate,
            CheckOutDate = b.CheckOutDate,
            NumberOfGuests = b.NumberOfGuests,
            BookingStatus = b.BookingStatus.ToString(),
            PaymentStatus = b.PaymentStatus,
            TotalAmount = b.TotalAmount,
            DepositAmount = b.DepositAmount,
            RoomCount = b.BookingDetails?.Count ?? 0,
            CreatedAt = b.CreatedAt
        }).ToList();

        return ApiResponse<List<BookingListDto>>.SuccessResult(listDto);
    }

    public async Task<ApiResponse<bool>> CancelBookingAsync(long bookingId, long userId, CancelBookingRequest request)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        if (booking.BookingStatus is BookingStatus.CheckedIn or BookingStatus.CheckedOut or BookingStatus.Completed or BookingStatus.Cancelled or BookingStatus.Expired)
        {
            return ApiResponse<bool>.FailureResult($"Không thể hủy đơn đặt phòng đang ở trạng thái: {booking.BookingStatus}.");
        }

        var oldStatus = booking.BookingStatus.ToString();
        booking.BookingStatus = BookingStatus.Cancelled;
        booking.CancellationReason = request.Reason;
        booking.CancelledAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;

        await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
        {
            BookingId = booking.BookingId,
            OldStatus = oldStatus,
            NewStatus = BookingStatus.Cancelled.ToString(),
            ChangedByUserId = userId,
            ChangedAt = DateTime.UtcNow,
            Note = $"Khách/Admin hủy đơn. Lý do: {request.Reason}"
        });

        await _bookingRepository.UpdateAsync(booking);
        await _bookingRepository.SaveChangesAsync();

        return ApiResponse<bool>.SuccessResult(true, "Hủy đơn đặt phòng thành công.");
    }

    public async Task<ApiResponse<bool>> UpdateBookingStatusAsync(long bookingId, long staffUserId, UpdateBookingRequest request)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        if (!Enum.TryParse<BookingStatus>(request.NewStatus, true, out var newStatus))
        {
            return ApiResponse<bool>.FailureResult($"Trạng thái '{request.NewStatus}' không hợp lệ.");
        }

        var oldStatus = booking.BookingStatus.ToString();
        booking.BookingStatus = newStatus;
        if (!string.IsNullOrWhiteSpace(request.SpecialRequests))
        {
            booking.SpecialRequests = request.SpecialRequests;
        }
        booking.UpdatedAt = DateTime.UtcNow;

        await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
        {
            BookingId = booking.BookingId,
            OldStatus = oldStatus,
            NewStatus = newStatus.ToString(),
            ChangedByUserId = staffUserId,
            ChangedAt = DateTime.UtcNow,
            Note = request.Note ?? $"Chuyển trạng thái từ {oldStatus} sang {newStatus}"
        });

        await _bookingRepository.UpdateAsync(booking);
        await _bookingRepository.SaveChangesAsync();

        return ApiResponse<bool>.SuccessResult(true, "Cập nhật trạng thái đơn đặt phòng thành công.");
    }

    private static BookingResponseDto MapToResponseDto(Booking booking)
    {
        return new BookingResponseDto
        {
            BookingId = booking.BookingId,
            BookingCode = booking.BookingCode,
            CustomerId = booking.CustomerId,
            CheckInDate = booking.CheckInDate,
            CheckOutDate = booking.CheckOutDate,
            NumberOfGuests = booking.NumberOfGuests,
            BookingStatus = booking.BookingStatus.ToString(),
            PaymentMethod = booking.PaymentMethod,
            PaymentStatus = booking.PaymentStatus,
            SubTotal = booking.SubTotal,
            TaxAmount = booking.TaxAmount,
            FeeAmount = booking.FeeAmount,
            DiscountAmount = booking.DiscountAmount,
            TotalAmount = booking.TotalAmount,
            DepositAmount = booking.DepositAmount,
            RemainingAmount = booking.RemainingAmount,
            VoucherId = booking.VoucherId,
            SpecialRequests = booking.SpecialRequests,
            HoldExpiresAt = booking.HoldExpiresAt,
            CancellationReason = booking.CancellationReason,
            CancelledAt = booking.CancelledAt,
            CreatedAt = booking.CreatedAt,
            Details = booking.BookingDetails?.Select(d => new BookingDetailResponseDto
            {
                BookingDetailId = d.BookingDetailId,
                RoomId = d.RoomId,
                UnitPrice = d.UnitPrice,
                NumberOfNights = d.NumberOfNights,
                SubTotal = d.SubTotal
            }).ToList() ?? new(),
            Guests = booking.BookingGuests?.Select(g => new BookingGuestResponseDto
            {
                BookingGuestId = g.BookingGuestId,
                FullName = g.FullName,
                Phone = g.Phone,
                Email = g.Email,
                IsPrimaryGuest = g.IsPrimaryGuest
            }).ToList() ?? new(),
            StatusHistories = booking.StatusHistories?.Select(h => new BookingStatusHistoryResponseDto
            {
                BookingStatusHistoryId = h.BookingStatusHistoryId,
                OldStatus = h.OldStatus,
                NewStatus = h.NewStatus,
                ChangedByUserId = h.ChangedByUserId,
                ChangedAt = h.ChangedAt,
                Note = h.Note
            }).ToList() ?? new()
        };
    }
}
