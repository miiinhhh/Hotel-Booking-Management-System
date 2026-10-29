namespace HotelBooking.Application.Services;

using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.DTOs.Cancellation;
using HotelBooking.Application.DTOs.Voucher;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using Microsoft.Extensions.DependencyInjection;
using BookingPriceCalculationResultDto = HotelBooking.Application.DTOs.Booking.PriceCalculationResultDto;

public class BookingServices : IBookingService
{
    private readonly IBookingRepository _bookingRepository;
    private readonly IBookingPricingService _pricingService;
    private readonly IVoucherRepository _voucherRepository;
    private readonly ICancellationPolicyService? _cancellationPolicyService;
    private readonly IPaymentRepository? _paymentRepository;
    private readonly IRoomRepository? _roomRepository;

    public BookingServices(
        IBookingRepository bookingRepository,
        IBookingPricingService pricingService,
        IVoucherRepository voucherRepository)
        : this(bookingRepository, pricingService, voucherRepository, null, null, null)
    {
    }

    [ActivatorUtilitiesConstructor]
    public BookingServices(
        IBookingRepository bookingRepository,
        IBookingPricingService pricingService,
        IVoucherRepository voucherRepository,
        ICancellationPolicyService? cancellationPolicyService,
        IPaymentRepository? paymentRepository,
        IRoomRepository? roomRepository)
    {
        _bookingRepository = bookingRepository;
        _pricingService = pricingService;
        _voucherRepository = voucherRepository;
        _cancellationPolicyService = cancellationPolicyService;
        _paymentRepository = paymentRepository;
        _roomRepository = roomRepository;
    }

    public async Task<ApiResponse<BookingResponseDto>> CreateBookingAsync(long customerId, CreateBookingRequest request)
    {
        // 1. Kiểm tra ngày đặt
        if (request.CheckInDate < DateOnly.FromDateTime(DateTime.UtcNow) || request.CheckOutDate <= request.CheckInDate)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Ngày trả phòng (CheckOut) phải sau ngày nhận phòng (CheckIn).");
        }

        if (request.Rooms == null || request.Rooms.Count == 0)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Vui lòng chọn ít nhất 1 phòng để đặt.");
        }

        if (request.Rooms.Any(r => r.RoomId <= 0) || request.Rooms.Select(r => r.RoomId).Distinct().Count() != request.Rooms.Count)
            return ApiResponse<BookingResponseDto>.FailureResult("Room IDs must be positive and distinct.");

        // 2. Kiểm tra xung đột lịch đặt từng phòng (Double booking check)
        foreach (var room in request.Rooms)
        {
            var isBooked = await _bookingRepository.IsRoomBookedAsync(room.RoomId, request.CheckInDate, request.CheckOutDate);
            if (isBooked)
            {
                return ApiResponse<BookingResponseDto>.FailureResult($"Phòng (ID: {room.RoomId}) đã được đặt trong khoảng thời gian này.");
            }
        }

        // 3. Tính toán chi phí chuẩn xác từ hệ thống (Server-authoritative calculation)
        var roomIds = request.Rooms.Select(r => r.RoomId).Distinct().ToList();
        BookingPriceCalculationResultDto pricing;
        try
        {
            pricing = await _pricingService.CalculateAuthoritativePriceAsync(
                request.CheckInDate,
                request.CheckOutDate,
                roomIds,
                request.VoucherCode,
                request.PaymentMethod);
        }
        catch (InvalidOperationException ex)
        {
            return ApiResponse<BookingResponseDto>.FailureResult(ex.Message);
        }

        var bookingDetails = pricing.RoomBreakdowns.Select(rb => new BookingDetail
        {
            RoomId = rb.RoomId,
            UnitPrice = rb.UnitPricePerNight,
            NumberOfNights = rb.NumberOfNights,
            SubTotal = rb.SubTotal
        }).ToList();

        // 6. Sinh mã đặt phòng duy nhất: BK + yyyyMMddHHmmss + 3 số ngẫu nhiên
        string bookingCode = $"BK{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";

        // 7. Khởi tạo Entity Booking
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
            SubTotal = pricing.SubTotal,
            TaxAmount = pricing.TaxAmount,
            FeeAmount = pricing.FeeAmount,
            DiscountAmount = pricing.DiscountAmount,
            TotalAmount = pricing.TotalAmount,
            DepositAmount = pricing.DepositAmount,
            RemainingAmount = pricing.RemainingAmount,
            VoucherId = pricing.VoucherId,
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
        if (!await _bookingRepository.TryReserveAsync(booking))
            throw new HotelBooking.Application.Rooms.ConflictException("A selected room is no longer available. Please search again.");

        // Tăng số lượt dùng của Voucher và ghi nhận lịch sử áp mã nếu có
        if (pricing.VoucherId.HasValue)
        {
            var incremented = await _voucherRepository.IncrementUsedCountAtomicAsync(pricing.VoucherId.Value);
            if (!incremented)
            {
                await _voucherRepository.IncrementUsedCountAsync(pricing.VoucherId.Value);
            }

            await _voucherRepository.AddUsageRecordAsync(new VoucherUsage
            {
                VoucherId = pricing.VoucherId.Value,
                CustomerId = customerId,
                BookingId = booking.BookingId,
                DiscountApplied = pricing.DiscountAmount,
                UsedAt = DateTime.UtcNow
            });
        }

        var responseDto = MapToResponseDto(booking);
        return ApiResponse<BookingResponseDto>.SuccessResult(responseDto, "Đặt phòng thành công. Vui lòng thanh toán cọc trong 15 phút để giữ phòng.");
    }

    public async Task<ApiResponse<BookingResponseDto>> GetBookingByIdAsync(long bookingId, long currentUserId, bool isAdmin, bool isStaff)
    {
        var booking = await _bookingRepository.GetByIdWithDetailsAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Không tìm thấy thông tin đơn đặt phòng.");
        }

        // 1. Quản trị viên: Toàn quyền truy cập
        if (isAdmin)
        {
            return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
        }

        // 2. Nhân viên lễ tân: Chỉ xem được booking nếu phòng thuộc phân khu được phân công
        if (isStaff)
        {
            bool isAssigned = await _bookingRepository.IsStaffAssignedToBookingAsync(bookingId, currentUserId);
            if (!isAssigned)
            {
                return ApiResponse<BookingResponseDto>.FailureResult("Bạn không có quyền truy cập đơn đặt phòng ngoài phân khu được phân công.");
            }

            return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
        }

        // 3. Khách hàng: Chống IDOR - Chỉ xem được đơn đặt phòng của chính mình
        if (booking.CustomerId != currentUserId)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Bạn không có quyền xem thông tin đơn đặt phòng của khách hàng khác.");
        }

        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
    }

    public async Task<ApiResponse<BookingResponseDto>> GetBookingByCodeAsync(string bookingCode, long currentUserId, bool isAdmin, bool isStaff)
    {
        var booking = await _bookingRepository.GetByCodeAsync(bookingCode);
        if (booking == null)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Không tìm thấy thông tin đơn đặt phòng theo mã này.");
        }

        if (isAdmin)
        {
            return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
        }

        if (isStaff)
        {
            bool isAssigned = await _bookingRepository.IsStaffAssignedToBookingAsync(booking.BookingId, currentUserId);
            if (!isAssigned)
            {
                return ApiResponse<BookingResponseDto>.FailureResult("Bạn không có quyền truy cập đơn đặt phòng ngoài phân khu được phân công.");
            }

            return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
        }

        if (booking.CustomerId != currentUserId)
        {
            return ApiResponse<BookingResponseDto>.FailureResult("Bạn không có quyền xem thông tin đơn đặt phòng của khách hàng khác.");
        }

        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking));
    }

    public async Task<ApiResponse<List<BookingListDto>>> GetBookingsAsync(BookingFilterRequest filter, long currentUserId, bool isAdmin, bool isStaff)
    {
        long? filterCustomerId = filter.CustomerId;
        long? staffUserId = null;

        // Chống IDOR: Nếu là Khách hàng (không phải Admin và không phải Staff), ép buộc chỉ lấy đơn của chính mình
        if (!isAdmin && !isStaff)
        {
            filterCustomerId = currentUserId;
        }
        else if (isStaff && !isAdmin)
        {
            // Phân quyền Staff: Lọc theo phân khu của nhân viên phụ trách
            staffUserId = currentUserId;
        }

        var bookings = await _bookingRepository.GetListAsync(
            filterCustomerId,
            filter.Status,
            filter.PaymentStatus,
            filter.FromDate,
            filter.ToDate,
            filter.PageIndex,
            filter.PageSize,
            staffUserId
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

    public async Task<ApiResponse<CancelPreviewResponseDto>> PreviewCancelBookingAsync(long bookingId, long currentUserId, bool isAdmin)
    {
        var booking = await _bookingRepository.GetByIdWithDetailsAsync(bookingId)
                      ?? await _bookingRepository.GetByIdAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<CancelPreviewResponseDto>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        // Chống IDOR: Khách hàng chỉ xem trước đơn của chính mình. Quản trị viên có toàn quyền.
        if (!isAdmin && booking.CustomerId != currentUserId)
        {
            return ApiResponse<CancelPreviewResponseDto>.FailureResult("Bạn không có quyền xem thông tin hủy đơn đặt phòng của khách hàng khác.");
        }

        if (booking.BookingStatus is BookingStatus.CheckedIn or BookingStatus.CheckedOut or BookingStatus.Completed or BookingStatus.Cancelled or BookingStatus.Expired)
        {
            return ApiResponse<CancelPreviewResponseDto>.FailureResult($"Không thể xem trước hủy cho đơn đặt phòng đang ở trạng thái: {booking.BookingStatus}.");
        }

        int hotelId = await ResolveHotelIdAsync(booking);
        var totalPaid = _paymentRepository != null 
            ? await _paymentRepository.GetTotalPaidAmountAsync(bookingId) 
            : 0m;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysRemaining = booking.CheckInDate.DayNumber - today.DayNumber;

        CancellationPolicy? policy = null;
        if (_cancellationPolicyService != null && hotelId > 0)
        {
            policy = await _cancellationPolicyService.GetApplicablePolicyAsync(hotelId, daysRemaining);
        }

        CancelPreviewResponseDto preview;
        if (_cancellationPolicyService != null)
        {
            preview = _cancellationPolicyService.CalculateCancellation(booking, totalPaid, policy);
        }
        else
        {
            preview = new CancelPreviewResponseDto
            {
                BookingId = booking.BookingId,
                BookingCode = booking.BookingCode,
                CheckInDate = booking.CheckInDate,
                CheckOutDate = booking.CheckOutDate,
                DaysRemaining = daysRemaining,
                TotalAmount = booking.TotalAmount,
                TotalPaid = totalPaid,
                AppliedPolicyName = "Chưa có chính sách hủy phòng",
                RefundPercentage = 0m,
                RefundAmount = 0m,
                PenaltyPercentage = 100m,
                PenaltyAmount = totalPaid,
                IsEligibleForRefund = false,
                Message = "Chưa có chính sách hủy phòng phù hợp."
            };
        }

        return ApiResponse<CancelPreviewResponseDto>.SuccessResult(preview, "Lấy thông tin xem trước hủy phòng thành công.");
    }

    public async Task<ApiResponse<bool>> CancelBookingAsync(long bookingId, long currentUserId, bool isAdmin, CancelBookingRequest request)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        // Chống IDOR: Khách hàng chỉ được phép hủy đơn của chính mình. Quản trị viên có quyền hủy hỗ trợ khách.
        if (!isAdmin && booking.CustomerId != currentUserId)
        {
            return ApiResponse<bool>.FailureResult("Bạn không có quyền hủy đơn đặt phòng của khách hàng khác.");
        }

        if (booking.BookingStatus is BookingStatus.CheckedIn or BookingStatus.CheckedOut or BookingStatus.Completed or BookingStatus.Cancelled or BookingStatus.Expired)
        {
            return ApiResponse<bool>.FailureResult($"Không thể hủy đơn đặt phòng đang ở trạng thái: {booking.BookingStatus}.");
        }

        int hotelId = await ResolveHotelIdAsync(booking);
        var totalPaid = _paymentRepository != null 
            ? await _paymentRepository.GetTotalPaidAmountAsync(bookingId) 
            : 0m;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var daysRemaining = booking.CheckInDate.DayNumber - today.DayNumber;

        CancellationPolicy? policy = null;
        if (_cancellationPolicyService != null && hotelId > 0)
        {
            policy = await _cancellationPolicyService.GetApplicablePolicyAsync(hotelId, daysRemaining);
        }

        CancelPreviewResponseDto calculation;
        if (_cancellationPolicyService != null)
        {
            calculation = _cancellationPolicyService.CalculateCancellation(booking, totalPaid, policy);
        }
        else
        {
            calculation = new CancelPreviewResponseDto
            {
                RefundPercentage = 0m,
                RefundAmount = 0m,
                PenaltyPercentage = 100m,
                PenaltyAmount = totalPaid,
                AppliedPolicyName = "Default"
            };
        }

        var oldStatus = booking.BookingStatus.ToString();
        booking.BookingStatus = BookingStatus.Cancelled;
        booking.CancellationReason = request.Reason;
        booking.CancelledAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;

        if (totalPaid > 0m)
        {
            if (calculation.RefundAmount >= totalPaid)
            {
                booking.PaymentStatus = "Refunded";
            }
            else if (calculation.RefundAmount > 0m)
            {
                booking.PaymentStatus = "PartiallyPaid";
            }
        }

        // Tạo bản ghi hoàn tiền trong Payments (chống trùng lặp refund)
        if (calculation.RefundAmount > 0m && _paymentRepository != null)
        {
            var existingPayments = await _paymentRepository.GetByBookingIdAsync(booking.BookingId);
            bool hasRefundAlready = existingPayments != null && existingPayments.Any(p => p.PaymentType == PaymentType.Refund);
            if (!hasRefundAlready)
            {
                var refundPayment = new Payment
                {
                    BookingId = booking.BookingId,
                    PaymentMethod = Enum.TryParse<PaymentMethod>(booking.PaymentMethod, true, out var pm) ? pm : PaymentMethod.Deposit,
                    PaymentType = PaymentType.Refund,
                    Amount = calculation.RefundAmount,
                    Status = PaymentStatus.Paid,
                    TransactionCode = $"REFUND-{booking.BookingCode}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    PaidAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                };
                await _paymentRepository.CreateAsync(refundPayment);
            }
        }

        // Ghi lại lịch sử thay đổi trạng thái kèm đầy đủ thông tin hoàn hủy vào BookingStatusHistory.Note
        var who = isAdmin && booking.CustomerId != currentUserId
            ? $"Quản trị viên (ID: {currentUserId})"
            : "Khách hàng";
        var auditNote = $"{who} hủy đơn. Lý do: {request.Reason}. Chính sách: {calculation.AppliedPolicyName}. Đã thanh toán: {totalPaid:N0} VNĐ, Hoàn trả: {calculation.RefundAmount:N0} VNĐ ({calculation.RefundPercentage}%), Phí phạt: {calculation.PenaltyAmount:N0} VNĐ ({calculation.PenaltyPercentage}%).";

        await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
        {
            BookingId = booking.BookingId,
            OldStatus = oldStatus,
            NewStatus = BookingStatus.Cancelled.ToString(),
            ChangedByUserId = currentUserId,
            ChangedAt = DateTime.UtcNow,
            Note = auditNote
        });

        await _bookingRepository.UpdateAsync(booking);
        await _bookingRepository.SaveChangesAsync();

        return ApiResponse<bool>.SuccessResult(true, "Hủy đơn đặt phòng thành công.");
    }

    public async Task<ApiResponse<bool>> UpdateBookingStatusAsync(long bookingId, long staffUserId, bool isAdmin, UpdateBookingRequest request)
    {
        var booking = await _bookingRepository.GetByIdWithDetailsAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        // Phân quyền Staff: Nếu không phải Admin, phải kiểm tra xem nhân viên có phụ trách phân khu chứa phòng này hay không
        if (!isAdmin)
        {
            bool isAssigned = await _bookingRepository.IsStaffAssignedToBookingAsync(bookingId, staffUserId);
            if (!isAssigned)
            {
                return ApiResponse<bool>.FailureResult("Bạn không có quyền cập nhật trạng thái đơn đặt phòng ngoài phân khu được phân công.");
            }
        }

        if (!Enum.TryParse<BookingStatus>(request.NewStatus, true, out var newStatus) || !Enum.IsDefined(newStatus))
        {
            return ApiResponse<bool>.FailureResult($"Trạng thái '{request.NewStatus}' không hợp lệ.");
        }

        var oldStatus = booking.BookingStatus.ToString();
        booking.BookingStatus = newStatus;
        if (newStatus == BookingStatus.Pending) booking.HoldExpiresAt = DateTime.UtcNow.AddMinutes(15);
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

        if (newStatus is BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.CheckedIn)
        {
            if (!await _bookingRepository.TrySaveReservedAsync(booking))
                throw new HotelBooking.Application.Rooms.ConflictException("Rooms are no longer available for this booking.");
        }
        else
        {
            await _bookingRepository.UpdateAsync(booking);
            await _bookingRepository.SaveChangesAsync();
        }

        return ApiResponse<bool>.SuccessResult(true, $"Cập nhật trạng thái đơn đặt phòng sang '{newStatus}' thành công.");
    }

    private async Task<int> ResolveHotelIdAsync(Booking booking)
    {
        var details = booking.BookingDetails;
        if (details == null || details.Count == 0)
        {
            var fullBooking = await _bookingRepository.GetByIdWithDetailsAsync(booking.BookingId);
            details = fullBooking?.BookingDetails;
        }

        if (details != null && details.Count > 0 && _roomRepository != null)
        {
            var firstRoomId = details.First().RoomId;
            var room = await _roomRepository.FindRoomAsync(firstRoomId, default);
            if (room?.RoomType != null)
            {
                return room.RoomType.HotelId;
            }
            if (room?.Area != null)
            {
                return room.Area.HotelId;
            }
        }

        return 0;
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
            VoucherCode = booking.Voucher?.Code,
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
