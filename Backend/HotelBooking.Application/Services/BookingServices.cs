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
    private readonly IBookingNotificationPublisher? _notificationPublisher;
    private readonly HotelBooking.Application.Common.BookingLimits _limits;

    public BookingServices(
        IBookingRepository bookingRepository,
        IBookingPricingService pricingService,
        IVoucherRepository voucherRepository)
        : this(bookingRepository, pricingService, voucherRepository, null, null, null, null)
    {
    }

    [ActivatorUtilitiesConstructor]
    public BookingServices(
        IBookingRepository bookingRepository,
        IBookingPricingService pricingService,
        IVoucherRepository voucherRepository,
        ICancellationPolicyService? cancellationPolicyService,
        IPaymentRepository? paymentRepository,
        IRoomRepository? roomRepository,
        IBookingNotificationPublisher? notificationPublisher = null,
        Microsoft.Extensions.Options.IOptions<HotelBooking.Application.Common.BookingLimits>? limits = null)
    {
        _limits = limits?.Value ?? new HotelBooking.Application.Common.BookingLimits();
        _bookingRepository = bookingRepository;
        _pricingService = pricingService;
        _voucherRepository = voucherRepository;
        _cancellationPolicyService = cancellationPolicyService;
        _paymentRepository = paymentRepository;
        _roomRepository = roomRepository;
        _notificationPublisher = notificationPublisher;
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

        // Chống giữ phòng hàng loạt: chỉ giới hạn đơn giữ phòng mà chưa trả tiền (BookingLimits trong appsettings).
        var limitError = await CheckBookingLimitsAsync(customerId, request);
        if (limitError != null) return ApiResponse<BookingResponseDto>.FailureResult(limitError);

        // 2. Kiểm tra xung đột lịch. Khách đặt theo HẠNG PHÒNG: phòng hệ thống xếp tạm đã có người giữ
        //    thì tự chuyển sang phòng khác cùng hạng còn trống; lễ tân có thể đổi phòng lại khi check-in.
        var chosen = new List<long>();
        foreach (var room in request.Rooms)
        {
            if (!await _bookingRepository.IsRoomBookedAsync(room.RoomId, request.CheckInDate, request.CheckOutDate) && !chosen.Contains(room.RoomId))
            {
                chosen.Add(room.RoomId);
                continue;
            }
            var alternative = await _bookingRepository.FindAlternativeRoomAsync(room.RoomId, request.CheckInDate, request.CheckOutDate, chosen);
            if (alternative is null)
                return ApiResponse<BookingResponseDto>.FailureResult("Hạng phòng này đã hết phòng trống trong khoảng thời gian bạn chọn. Vui lòng chọn ngày hoặc hạng phòng khác.");
            room.RoomId = alternative.Value;
            chosen.Add(alternative.Value);
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
                request.PaymentMethod,
                customerId: customerId);
        }
        catch (InvalidOperationException ex)
        {
            return ApiResponse<BookingResponseDto>.FailureResult(ex.Message);
        }

        // Chống lạm dụng voucher: Nếu khách hàng nhập mã voucher nhưng mã không được áp dụng (hết lượt dùng/đã dùng 1 lần/không tồn tại)
        if (!string.IsNullOrWhiteSpace(request.VoucherCode) && !pricing.VoucherId.HasValue)
        {
            return ApiResponse<BookingResponseDto>.FailureResult(
                pricing.VoucherMessage ?? $"Mã ưu đãi '{request.VoucherCode.Trim().ToUpperInvariant()}' không tồn tại hoặc bạn đã sử dụng hết lượt cho phép.");
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
        // "Thanh toán tại khách sạn" (Cash): xác nhận ngay, không giữ chỗ 15 phút (khách không phải trả trước).
        var payAtHotel = string.Equals(request.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase);
        var booking = new Booking
        {
            BookingCode = bookingCode,
            CustomerId = customerId,
            CheckInDate = request.CheckInDate,
            CheckOutDate = request.CheckOutDate,
            NumberOfGuests = request.NumberOfGuests,
            BookingStatus = payAtHotel ? BookingStatus.Confirmed : BookingStatus.Pending,
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
            HoldExpiresAt = payAtHotel ? null : DateTime.UtcNow.AddMinutes(15), // Giữ phòng 15 phút chờ đặt cọc
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
            NewStatus = booking.BookingStatus.ToString(),
            ChangedByUserId = customerId,
            ChangedAt = DateTime.UtcNow,
            Note = payAtHotel
                ? "Đơn đặt phòng mới được tạo — thanh toán tại khách sạn, đã xác nhận giữ phòng."
                : "Đơn đặt phòng mới được tạo (chờ thanh toán cọc/xác nhận)."
        });

        // 6. Lưu vào CSDL — giữ phòng và trừ lượt voucher trong CÙNG giao dịch, dưới cùng khóa phòng.
        // Nếu voucher vừa hết lượt (hai khách dùng lượt cuối cùng lúc) thì người đến sau bị từ chối
        // và booking của họ bị rollback, không còn trường hợp voucher bị dùng vượt giới hạn.
        if (pricing.VoucherId is long voucherId)
        {
            var outcome = await _bookingRepository.TryReserveAsync(booking, async () =>
            {
                if (!await _voucherRepository.IncrementUsedCountAtomicAsync(voucherId)) return false;
                await _voucherRepository.AddUsageRecordAsync(new VoucherUsage
                {
                    VoucherId = voucherId,
                    CustomerId = customerId,
                    BookingId = booking.BookingId,
                    DiscountApplied = pricing.DiscountAmount,
                    UsedAt = DateTime.UtcNow
                });
                return true;
            });
            if (outcome == ReservationOutcome.RoomUnavailable)
                throw new HotelBooking.Application.Rooms.ConflictException("A selected room is no longer available. Please search again.");
            if (outcome == ReservationOutcome.Rejected)
                throw new HotelBooking.Application.Rooms.ConflictException("Mã giảm giá vừa hết lượt sử dụng hoặc không còn hiệu lực. Vui lòng đặt lại không dùng mã hoặc chọn mã khác.");
        }
        else if (!await _bookingRepository.TryReserveAsync(booking))
            throw new HotelBooking.Application.Rooms.ConflictException("A selected room is no longer available. Please search again.");

        var responseDto = MapToResponseDto(booking);
        if (_notificationPublisher != null)
        {
            _ = _notificationPublisher.PublishBookingCreatedAsync(booking.BookingId, booking.BookingCode, booking.TotalAmount);
        }
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

        // Thông tin hiển thị: khách sạn, hạng phòng, ảnh (theo phòng đầu tiên của đơn).
        var firstRoomIds = bookings.SelectMany(b => b.BookingDetails?.Select(d => d.RoomId) ?? []).Where(id => id > 0).Distinct().ToList();
        var display = await _bookingRepository.GetRoomDisplayInfoAsync(firstRoomIds);
        // Số tiền hoàn thật cho đơn đã/đang hoàn tiền.
        var refunds = new Dictionary<long, (decimal Amount, DateTime? At)>();
        if (_paymentRepository != null)
        {
            foreach (var b in bookings.Where(x => x.PaymentStatus is "RefundPending" or "Refunded"))
            {
                var refund = (await _paymentRepository.GetByBookingIdAsync(b.BookingId))?.FirstOrDefault(p => p.PaymentType == PaymentType.Refund);
                if (refund != null) refunds[b.BookingId] = (refund.Amount, refund.PaidAt);
            }
        }

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
            CreatedAt = b.CreatedAt,
            HotelName = display.GetValueOrDefault(b.BookingDetails?.FirstOrDefault()?.RoomId ?? 0)?.HotelName,
            RoomTypeName = display.GetValueOrDefault(b.BookingDetails?.FirstOrDefault()?.RoomId ?? 0)?.RoomTypeName,
            HoldExpiresAt = b.BookingStatus == BookingStatus.Pending ? b.HoldExpiresAt : null,
            // Khách đặt theo hạng phòng: số phòng chỉ báo cho khách khi đã nhận phòng; nhân viên luôn thấy.
            RoomNumbers = isAdmin || isStaff || b.BookingStatus is BookingStatus.CheckedIn or BookingStatus.CheckedOut or BookingStatus.Completed
                ? string.Join(", ", (b.BookingDetails ?? []).Select(d => display.GetValueOrDefault(d.RoomId)?.RoomNumber).Where(n => !string.IsNullOrEmpty(n)))
                : null,
            ImageUrl = display.GetValueOrDefault(b.BookingDetails?.FirstOrDefault()?.RoomId ?? 0)?.ImageUrl,
            RefundAmount = refunds.TryGetValue(b.BookingId, out var rf) ? rf.Amount : null,
            RefundedAt = refunds.TryGetValue(b.BookingId, out var rf2) ? rf2.At : null
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

    public async Task<ApiResponse<bool>> CancelBookingAsync(long bookingId, long currentUserId, bool isAdmin, CancelBookingRequest request, bool isStaffManager = false)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        // Chống IDOR: khách chỉ hủy đơn của chính mình; Admin hủy hỗ trợ mọi đơn;
        // nhân viên có quyền quản lý đặt phòng chỉ hủy đơn thuộc phân khu được giao.
        var cancelledByStaff = false;
        if (!isAdmin && booking.CustomerId != currentUserId)
        {
            if (!isStaffManager)
                return ApiResponse<bool>.FailureResult("Bạn không có quyền hủy đơn đặt phòng của khách hàng khác.");
            if (!await _bookingRepository.IsStaffAssignedToBookingAsync(bookingId, currentUserId))
                return ApiResponse<bool>.FailureResult("Bạn không có quyền hủy đơn đặt phòng ngoài phân khu được phân công.");
            cancelledByStaff = true;
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
            if (calculation.RefundAmount > 0m)
            {
                booking.PaymentStatus = "RefundPending";
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
                    Status = PaymentStatus.RefundPending,
                    TransactionCode = $"REFUND-{booking.BookingCode}-{DateTime.UtcNow:yyyyMMddHHmmss}",
                    PaidAt = null,
                    CreatedAt = DateTime.UtcNow
                };
                await _paymentRepository.CreateAsync(refundPayment);
            }
        }

        // Ghi lại lịch sử thay đổi trạng thái kèm đầy đủ thông tin hoàn hủy vào BookingStatusHistory.Note
        var who = isAdmin && booking.CustomerId != currentUserId
            ? $"Quản trị viên (ID: {currentUserId})"
            : cancelledByStaff ? $"Nhân viên (ID: {currentUserId})" : "Khách hàng";
        var auditNote = $"{who} hủy đơn. Lý do: {request.Reason}. Chính sách: {calculation.AppliedPolicyName}. Đã thanh toán: {HotelBooking.Application.Common.MoneyText.Vnd(totalPaid)} VNĐ, Hoàn trả: {HotelBooking.Application.Common.MoneyText.Vnd(calculation.RefundAmount)} VNĐ ({calculation.RefundPercentage}%), Phí phạt: {HotelBooking.Application.Common.MoneyText.Vnd(calculation.PenaltyAmount)} VNĐ ({calculation.PenaltyPercentage}%).";

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

        if (_notificationPublisher != null)
        {
            _ = _notificationPublisher.PublishBookingStatusChangedAsync(booking.BookingId, booking.BookingCode, oldStatus, BookingStatus.Cancelled.ToString(), auditNote);
        }

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

        // Chỉ cho phép các bước hợp lệ của vòng đời đơn (Hủy / No-show dùng API riêng).
        if (!IsAllowedStatusTransition(booking.BookingStatus, newStatus))
        {
            return ApiResponse<bool>.FailureResult(
                $"Không thể chuyển đơn từ \"{StatusLabel(booking.BookingStatus)}\" sang \"{StatusLabel(newStatus)}\".");
        }

        // Check-in chỉ trong khoảng [ngày nhận phòng − 1 ngày (nhận sớm), ngày trả phòng).
        if (newStatus == BookingStatus.CheckedIn)
        {
            var todayVn = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(7));
            if (todayVn < booking.CheckInDate.AddDays(-EarlyCheckInDays))
                return ApiResponse<bool>.FailureResult(
                    $"Chưa tới ngày nhận phòng ({booking.CheckInDate:dd/MM/yyyy}). Chỉ cho nhận phòng sớm tối đa {EarlyCheckInDays} ngày.");
            if (todayVn >= booking.CheckOutDate)
                return ApiResponse<bool>.FailureResult(
                    $"Đơn đã qua ngày trả phòng ({booking.CheckOutDate:dd/MM/yyyy}), không thể check-in.");
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

        if (_notificationPublisher != null)
        {
            _ = _notificationPublisher.PublishBookingStatusChangedAsync(booking.BookingId, booking.BookingCode, oldStatus, newStatus.ToString(), request.Note);
        }

        return ApiResponse<bool>.SuccessResult(true, $"Cập nhật trạng thái đơn đặt phòng sang '{newStatus}' thành công.");
    }

    /// <summary>Kiểm tra quyền/trạng thái/ngày và tính lại giá cho yêu cầu đổi lịch (dùng chung cho xem trước và thực hiện).</summary>
    private async Task<(string? Error, Booking? Booking, BookingPriceCalculationResultDto? Pricing, decimal Paid)> PrepareRescheduleAsync(
        long bookingId, long currentUserId, bool isAdmin, bool isStaff, RescheduleBookingRequest request)
    {
        var booking = await _bookingRepository.GetByIdWithDetailsAsync(bookingId);
        if (booking == null) return ("Không tìm thấy đơn đặt phòng.", null, null, 0m);

        if (!isAdmin)
        {
            if (isStaff)
            {
                if (!await _bookingRepository.IsStaffAssignedToBookingAsync(bookingId, currentUserId))
                    return ("Bạn không có quyền đổi lịch đơn đặt phòng ngoài phân khu được phân công.", null, null, 0m);
            }
            else if (booking.CustomerId != currentUserId)
            {
                return ("Bạn không có quyền chỉnh sửa đơn đặt phòng của khách hàng khác.", null, null, 0m);
            }
        }

        if (booking.BookingStatus is not (BookingStatus.Pending or BookingStatus.Confirmed))
            return ("Chỉ đổi lịch được đơn đang chờ xác nhận hoặc đã xác nhận (chưa nhận phòng).", null, null, 0m);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        if (request.NewCheckInDate < today || request.NewCheckOutDate <= request.NewCheckInDate)
            return ("Ngày nhận phòng mới không được ở quá khứ và ngày trả phòng phải sau ngày nhận phòng.", null, null, 0m);

        if (request.NewCheckInDate == booking.CheckInDate && request.NewCheckOutDate == booking.CheckOutDate
            && (request.NewRoomIds == null || request.NewRoomIds.Count == 0))
            return ("Ngày mới trùng với lịch hiện tại.", null, null, 0m);

        var targetRoomIds = request.NewRoomIds != null && request.NewRoomIds.Count > 0
            ? request.NewRoomIds.Distinct().ToList()
            : booking.BookingDetails.Select(d => d.RoomId).Distinct().ToList();

        BookingPriceCalculationResultDto pricing;
        try
        {
            pricing = await _pricingService.CalculateAuthoritativePriceAsync(
                request.NewCheckInDate, request.NewCheckOutDate, targetRoomIds, booking.Voucher?.Code, booking.PaymentMethod);
        }
        catch (InvalidOperationException ex)
        {
            return (ex.Message, null, null, 0m);
        }

        var paid = _paymentRepository != null ? await _paymentRepository.GetTotalPaidAmountAsync(bookingId) : 0m;
        return (null, booking, pricing, paid);
    }

    public async Task<ApiResponse<ReschedulePreviewDto>> PreviewRescheduleAsync(long bookingId, long currentUserId, bool isAdmin, bool isStaff, RescheduleBookingRequest request)
    {
        var (error, booking, pricing, paid) = await PrepareRescheduleAsync(bookingId, currentUserId, isAdmin, isStaff, request);
        if (error != null) return ApiResponse<ReschedulePreviewDto>.FailureResult(error);

        var available = await _bookingRepository.AreRoomsAvailableForRescheduleAsync(
            booking!.BookingId, pricing!.RoomBreakdowns.Select(r => r.RoomId).ToList(), request.NewCheckInDate, request.NewCheckOutDate);

        return ApiResponse<ReschedulePreviewDto>.SuccessResult(new ReschedulePreviewDto
        {
            OldCheckInDate = booking.CheckInDate,
            OldCheckOutDate = booking.CheckOutDate,
            NewCheckInDate = request.NewCheckInDate,
            NewCheckOutDate = request.NewCheckOutDate,
            OldTotalAmount = booking.TotalAmount,
            NewTotalAmount = pricing.TotalAmount,
            PaidAmount = paid,
            NewRemainingAmount = paid > 0m ? Math.Max(0m, pricing.TotalAmount - paid) : pricing.TotalAmount,
            OverpaidAmount = Math.Max(0m, paid - pricing.TotalAmount),
            NewDepositAmount = paid > 0m ? paid : pricing.DepositAmount,
            RoomsAvailable = available
        });
    }

    public async Task<ApiResponse<BookingResponseDto>> RescheduleBookingAsync(long bookingId, long currentUserId, bool isAdmin, bool isStaff, RescheduleBookingRequest request)
    {
        var (error, booking, pricing, paid) = await PrepareRescheduleAsync(bookingId, currentUserId, isAdmin, isStaff, request);
        if (error != null) return ApiResponse<BookingResponseDto>.FailureResult(error);
        booking = booking!; pricing = pricing!;

        var oldCheckIn = booking.CheckInDate;
        var oldCheckOut = booking.CheckOutDate;
        var oldTotal = booking.TotalAmount;

        booking.CheckInDate = request.NewCheckInDate;
        booking.CheckOutDate = request.NewCheckOutDate;
        booking.SubTotal = pricing.SubTotal;
        booking.TaxAmount = pricing.TaxAmount;
        booking.FeeAmount = pricing.FeeAmount;
        booking.DiscountAmount = pricing.DiscountAmount;
        booking.TotalAmount = pricing.TotalAmount;
        if (paid > 0m)
        {
            // Khách đã trả tiền: giữ nguyên số đã trả; chênh lệch cộng/trừ vào phần còn lại thu khi nhận phòng.
            booking.DepositAmount = paid;
            booking.RemainingAmount = Math.Max(0m, pricing.TotalAmount - paid);
            booking.PaymentStatus = booking.RemainingAmount == 0m ? "Paid" : "PartiallyPaid";
        }
        else
        {
            booking.DepositAmount = pricing.DepositAmount;
            booking.RemainingAmount = Math.Max(0m, pricing.TotalAmount - booking.DepositAmount);
        }
        booking.UpdatedAt = DateTime.UtcNow;

        // Cập nhật booking details
        booking.BookingDetails.Clear();
        foreach (var rb in pricing.RoomBreakdowns)
        {
            booking.BookingDetails.Add(new BookingDetail
            {
                BookingId = booking.BookingId,
                RoomId = rb.RoomId,
                UnitPrice = rb.UnitPricePerNight,
                NumberOfNights = rb.NumberOfNights,
                SubTotal = rb.SubTotal
            });
        }

        var note = $"Đổi lịch lưu trú từ [{oldCheckIn:dd/MM/yyyy} - {oldCheckOut:dd/MM/yyyy}] sang [{request.NewCheckInDate:dd/MM/yyyy} - {request.NewCheckOutDate:dd/MM/yyyy}]. Tổng tiền: {HotelBooking.Application.Common.MoneyText.Vnd(oldTotal)} -> {HotelBooking.Application.Common.MoneyText.Vnd(pricing.TotalAmount)} VNĐ. Lý do: {request.Reason ?? "Theo yêu cầu khách hàng"}.";
        await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
        {
            BookingId = booking.BookingId,
            OldStatus = booking.BookingStatus.ToString(),
            NewStatus = booking.BookingStatus.ToString(),
            ChangedByUserId = currentUserId,
            ChangedAt = DateTime.UtcNow,
            Note = note
        });

        if (!await _bookingRepository.TrySaveReservedAsync(booking))
        {
            throw new HotelBooking.Application.Rooms.ConflictException("Phòng không còn khả dụng trong khoảng thời gian mới.");
        }

        if (_notificationPublisher != null)
        {
            _ = _notificationPublisher.PublishBookingRescheduledAsync(booking.BookingId, booking.BookingCode, request.NewCheckInDate, request.NewCheckOutDate, booking.TotalAmount);
        }

        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking), "Đổi lịch đặt phòng thành công.");
    }

    private async Task<string?> CheckBookingLimitsAsync(long customerId, CreateBookingRequest request)
    {
        if (_limits.MaxRoomsPerBooking > 0 && request.Rooms.Count > _limits.MaxRoomsPerBooking)
            return $"Mỗi đơn đặt tối đa {_limits.MaxRoomsPerBooking} phòng. Đoàn đông hơn vui lòng liên hệ khách sạn.";

        var stats = await _bookingRepository.GetCustomerBookingStatsAsync(customerId);
        var payAtHotel = string.Equals(request.PaymentMethod, "Cash", StringComparison.OrdinalIgnoreCase);
        if (payAtHotel)
        {
            if (_limits.NoShowsToBlockPayAtHotel > 0 && stats.NoShows >= _limits.NoShowsToBlockPayAtHotel)
                return "Tài khoản của bạn đã nhiều lần không đến nhận phòng nên cần đặt cọc qua VNPay để giữ phòng. Vui lòng chọn thanh toán VNPay.";
            if (_limits.MaxPayAtHotelUpcoming > 0 && stats.UpcomingPayAtHotel >= _limits.MaxPayAtHotelUpcoming)
                return $"Bạn đang có {stats.UpcomingPayAtHotel} đơn thanh toán tại khách sạn chưa đến ngày nhận phòng (tối đa {_limits.MaxPayAtHotelUpcoming}). Vui lòng đặt cọc qua VNPay cho đơn mới.";
        }
        else if (_limits.MaxPendingHolds > 0 && stats.ActiveHolds >= _limits.MaxPendingHolds)
        {
            return $"Bạn đang có {stats.ActiveHolds} đơn chờ thanh toán. Hãy hoàn tất thanh toán hoặc hủy một đơn trước khi đặt thêm.";
        }
        return null;
    }

    /// <summary>Phòng cùng hạng còn trống mà nhân viên có thể chuyển đơn sang (trong phân khu của mình).</summary>
    public async Task<ApiResponse<List<RoomChangeOption>>> GetRoomChangeOptionsAsync(long bookingId, long currentRoomId, long staffUserId, bool isAdmin)
    {
        var (error, booking, areaIds) = await PrepareRoomChangeAsync(bookingId, currentRoomId, staffUserId, isAdmin);
        if (error != null) return ApiResponse<List<RoomChangeOption>>.FailureResult(error);
        var options = await _bookingRepository.RoomChangeOptionsAsync(bookingId, currentRoomId, booking!.CheckInDate, booking.CheckOutDate, areaIds);
        return ApiResponse<List<RoomChangeOption>>.SuccessResult(options);
    }

    /// <summary>
    /// Lễ tân xếp/đổi số phòng cho đơn sang phòng khác CÙNG HẠNG còn trống (không đổi ngày, không đổi giá).
    /// Dùng khi nhận phòng, khi phòng cần bảo trì, hoặc khách muốn đổi tầng/view.
    /// </summary>
    public async Task<ApiResponse<BookingResponseDto>> ChangeRoomAsync(long bookingId, long staffUserId, bool isAdmin, ChangeRoomRequest request)
    {
        var (error, booking, areaIds) = await PrepareRoomChangeAsync(bookingId, request.CurrentRoomId, staffUserId, isAdmin);
        if (error != null) return ApiResponse<BookingResponseDto>.FailureResult(error);
        booking = booking!;
        // Giữ nguyên phòng đang xếp tạm: chỉ ghi nhận lễ tân đã chốt phòng.
        if (request.NewRoomId == request.CurrentRoomId)
        {
            var current = (await _bookingRepository.GetRoomDisplayInfoAsync([request.CurrentRoomId])).GetValueOrDefault(request.CurrentRoomId);
            var number = current?.RoomNumber ?? request.CurrentRoomId.ToString();
            await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
            {
                BookingId = booking.BookingId,
                OldStatus = booking.BookingStatus.ToString(),
                NewStatus = booking.BookingStatus.ToString(),
                ChangedByUserId = staffUserId,
                ChangedAt = DateTime.UtcNow,
                Note = $"Xếp phòng: giữ phòng {number}{(current is null ? "" : $" ({current.RoomTypeName})")}.{(string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Lý do: {request.Reason.Trim()}.")}"
            });
            await _bookingRepository.SaveChangesAsync();
            return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking), $"Đã xếp phòng {number} cho đơn.");
        }

        var options = await _bookingRepository.RoomChangeOptionsAsync(bookingId, request.CurrentRoomId, booking.CheckInDate, booking.CheckOutDate, areaIds);
        var target = options.FirstOrDefault(o => o.RoomId == request.NewRoomId);
        if (target == null)
            return ApiResponse<BookingResponseDto>.FailureResult("Phòng mới phải cùng hạng phòng, còn trống trong thời gian lưu trú và thuộc khu vực bạn phụ trách.");

        var detail = booking.BookingDetails.First(d => d.RoomId == request.CurrentRoomId);
        detail.RoomId = request.NewRoomId;
        booking.UpdatedAt = DateTime.UtcNow;

        await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
        {
            BookingId = booking.BookingId,
            OldStatus = booking.BookingStatus.ToString(),
            NewStatus = booking.BookingStatus.ToString(),
            ChangedByUserId = staffUserId,
            ChangedAt = DateTime.UtcNow,
            Note = $"Xếp phòng: chuyển sang phòng {target.RoomNumber} ({target.RoomTypeName}).{(string.IsNullOrWhiteSpace(request.Reason) ? "" : $" Lý do: {request.Reason.Trim()}.")}"
        });

        if (!await _bookingRepository.TrySaveReservedAsync(booking))
            throw new HotelBooking.Application.Rooms.ConflictException("Phòng vừa được giữ cho đơn khác. Vui lòng chọn phòng khác.");
        return ApiResponse<BookingResponseDto>.SuccessResult(MapToResponseDto(booking), $"Đã chuyển sang phòng {target.RoomNumber}.");
    }

    private async Task<(string? Error, Booking? Booking, IReadOnlyCollection<int>? AreaIds)> PrepareRoomChangeAsync(long bookingId, long currentRoomId, long staffUserId, bool isAdmin)
    {
        var booking = await _bookingRepository.GetByIdWithDetailsAsync(bookingId);
        if (booking == null) return ("Không tìm thấy đơn đặt phòng.", null, null);
        if (booking.BookingStatus is not (BookingStatus.Pending or BookingStatus.Confirmed or BookingStatus.CheckedIn))
            return ("Chỉ đổi phòng được đơn chưa trả phòng (chờ xác nhận, đã xác nhận hoặc đang lưu trú).", null, null);
        if (!booking.BookingDetails.Any(d => d.RoomId == currentRoomId))
            return ("Phòng hiện tại không thuộc đơn này.", null, null);
        IReadOnlyCollection<int>? areaIds = null;
        if (!isAdmin)
        {
            if (!await _bookingRepository.IsStaffAssignedToBookingAsync(bookingId, staffUserId))
                return ("Bạn không có quyền xếp phòng cho đơn ngoài phân khu được phân công.", null, null);
            var assigned = await _bookingRepository.GetAssignedAreaIdsAsync(staffUserId);
            areaIds = assigned;
        }
        return (null, booking, areaIds);
    }

    public async Task<ApiResponse<bool>> MarkNoShowAsync(long bookingId, long staffUserId, bool isAdmin, NoShowRequest request)
    {
        var booking = await _bookingRepository.GetByIdAsync(bookingId);
        if (booking == null)
        {
            return ApiResponse<bool>.FailureResult("Không tìm thấy đơn đặt phòng.");
        }

        if (!isAdmin)
        {
            bool isAssigned = await _bookingRepository.IsStaffAssignedToBookingAsync(bookingId, staffUserId);
            if (!isAssigned)
            {
                return ApiResponse<bool>.FailureResult("Bạn không có quyền xử lý đơn đặt phòng ngoài phân khu được phân công.");
            }
        }

        if (booking.BookingStatus is not (BookingStatus.Confirmed or BookingStatus.Pending))
        {
            return ApiResponse<bool>.FailureResult($"Chỉ có thể ghi nhận No-Show cho đơn đặt phòng ở trạng thái Confirmed hoặc Pending. Trạng thái hiện tại: {booking.BookingStatus}.");
        }

        var oldStatus = booking.BookingStatus.ToString();
        // Hủy đơn theo đúng Check constraint SQL Server (CK_Bookings_BookingStatus)
        booking.BookingStatus = BookingStatus.Cancelled;
        booking.CancellationReason = "No-Show: Khách không đến nhận phòng theo lịch hẹn." + (string.IsNullOrWhiteSpace(request.Note) ? "" : $" Ghi chú: {request.Note}");
        booking.CancelledAt = DateTime.UtcNow;
        booking.UpdatedAt = DateTime.UtcNow;

        var note = $"Lễ tân đánh dấu No-Show (Khách không đến nhận phòng). Đơn được hủy tự động và giải phóng phòng. {request.Note}".Trim();
        await _bookingRepository.AddStatusHistoryAsync(new BookingStatusHistory
        {
            BookingId = booking.BookingId,
            OldStatus = oldStatus,
            NewStatus = BookingStatus.Cancelled.ToString(),
            ChangedByUserId = staffUserId,
            ChangedAt = DateTime.UtcNow,
            Note = note
        });

        await _bookingRepository.UpdateAsync(booking);
        await _bookingRepository.SaveChangesAsync();

        if (_notificationPublisher != null)
        {
            _ = _notificationPublisher.PublishBookingStatusChangedAsync(booking.BookingId, booking.BookingCode, oldStatus, BookingStatus.Cancelled.ToString(), note);
        }

        return ApiResponse<bool>.SuccessResult(true, "Đã ghi nhận khách vắng mặt (No-Show) và hủy đơn thành công.");
    }


    /// <summary>Số ngày được phép nhận phòng sớm trước ngày nhận phòng.</summary>
    private const int EarlyCheckInDays = 1;

    private static bool IsAllowedStatusTransition(BookingStatus from, BookingStatus to) => (from, to) switch
    {
        (BookingStatus.Pending, BookingStatus.Confirmed) => true,
        (BookingStatus.Confirmed, BookingStatus.CheckedIn) => true,
        (BookingStatus.CheckedIn, BookingStatus.CheckedOut) => true,
        (BookingStatus.CheckedIn, BookingStatus.Completed) => true,
        (BookingStatus.CheckedOut, BookingStatus.Completed) => true,
        _ => false
    };

    private static string StatusLabel(BookingStatus status) => status switch
    {
        BookingStatus.Pending => "Chờ xác nhận",
        BookingStatus.Confirmed => "Đã xác nhận",
        BookingStatus.CheckedIn => "Đang lưu trú",
        BookingStatus.CheckedOut => "Đã trả phòng",
        BookingStatus.Completed => "Hoàn tất",
        BookingStatus.Cancelled => "Đã hủy",
        BookingStatus.Expired => "Hết hạn",
        _ => status.ToString()
    };

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
