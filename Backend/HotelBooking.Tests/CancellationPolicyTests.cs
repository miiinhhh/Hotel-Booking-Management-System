namespace HotelBooking.Tests;

using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.DTOs.Cancellation;
using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using Xunit;

public class CancellationPolicyTests
{
    private class FakeCancellationPolicyRepository : ICancellationPolicyRepository
    {
        public List<CancellationPolicy> Policies { get; } = new();

        public Task<CancellationPolicy?> GetByIdAsync(int id, CancellationToken ct = default)
        {
            var item = Policies.FirstOrDefault(p => p.CancellationPolicyId == id);
            return Task.FromResult(item);
        }

        public Task<IReadOnlyList<CancellationPolicy>> GetByHotelIdAsync(int hotelId, bool activeOnly = true, CancellationToken ct = default)
        {
            var query = Policies.Where(p => p.HotelId == hotelId);
            if (activeOnly)
            {
                query = query.Where(p => p.IsActive);
            }
            var list = query.OrderByDescending(p => p.DaysBeforeCheckIn).ToList();
            return Task.FromResult<IReadOnlyList<CancellationPolicy>>(list);
        }

        public Task<CancellationPolicy> AddAsync(CancellationPolicy policy, CancellationToken ct = default)
        {
            if (policy.CancellationPolicyId == 0)
            {
                policy.CancellationPolicyId = Policies.Count + 1;
            }
            Policies.Add(policy);
            return Task.FromResult(policy);
        }

        public Task UpdateAsync(CancellationPolicy policy, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task DeleteAsync(CancellationPolicy policy, CancellationToken ct = default)
        {
            Policies.Remove(policy);
            return Task.CompletedTask;
        }

        public Task<bool> HasConflictAsync(int hotelId, int daysBeforeCheckIn, int? excludeId = null, CancellationToken ct = default)
        {
            var query = Policies.Where(p => p.HotelId == hotelId && p.DaysBeforeCheckIn == daysBeforeCheckIn && p.IsActive);
            if (excludeId.HasValue)
            {
                query = query.Where(p => p.CancellationPolicyId != excludeId.Value);
            }
            return Task.FromResult(query.Any());
        }

        public Task SaveChangesAsync(CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }
    }

    private class FakePaymentRepository : IPaymentRepository
    {
        public List<Payment> Payments { get; } = new();

        public Task<Payment?> GetByIdAsync(long paymentId)
        {
            return Task.FromResult(Payments.FirstOrDefault(p => p.PaymentId == paymentId));
        }

        public Task<IEnumerable<Payment>> GetByBookingIdAsync(long bookingId)
        {
            var items = Payments.Where(p => p.BookingId == bookingId).ToList();
            return Task.FromResult<IEnumerable<Payment>>(items);
        }

        public Task<long> CreateAsync(Payment payment)
        {
            payment.PaymentId = Payments.Count + 1;
            Payments.Add(payment);
            return Task.FromResult(payment.PaymentId);
        }

        public Task<bool> UpdateStatusAsync(long paymentId, string status, DateTime? paidAt)
        {
            var item = Payments.FirstOrDefault(p => p.PaymentId == paymentId);
            if (item != null)
            {
                if (Enum.TryParse<PaymentStatus>(status, true, out var ps))
                {
                    item.Status = ps;
                }
                item.PaidAt = paidAt;
                return Task.FromResult(true);
            }
            return Task.FromResult(false);
        }

        public Task<decimal> GetTotalPaidAmountAsync(long bookingId)
        {
            var total = Payments
                .Where(p => p.BookingId == bookingId && p.Status == PaymentStatus.Paid && p.PaymentType == PaymentType.Payment)
                .Sum(p => p.Amount);
            return Task.FromResult(total);
        }

        public Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(long bookingId) => throw new NotImplementedException();
        public Task UpdateBookingPaymentSummaryAsync(long bookingId, decimal totalPaid, decimal totalAmount) => throw new NotImplementedException();
        public Task<BookingCustomerAccessInfo?> GetBookingCustomerAccessInfoAsync(long bookingId) => throw new NotImplementedException();
        public Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId) => throw new NotImplementedException();
        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetCustomerPaymentHistoryAsync(long customerId, int page, int pageSize) => throw new NotImplementedException();
        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetBookingPaymentHistoryAsync(long bookingId, int page, int pageSize) => throw new NotImplementedException();
        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetStaffPaymentHistoryAsync(PaymentHistoryFilterRequest filter, long staffUserId, bool isAdmin) => throw new NotImplementedException();
    }

    private class FakeBookingRepository : IBookingRepository
    {
        public List<Booking> Bookings { get; } = new();
        public List<BookingStatusHistory> Histories { get; } = new();

        public Task<Booking?> GetByIdAsync(long bookingId)
        {
            return Task.FromResult(Bookings.FirstOrDefault(b => b.BookingId == bookingId));
        }

        public Task<Booking?> GetByIdWithDetailsAsync(long bookingId)
        {
            return Task.FromResult(Bookings.FirstOrDefault(b => b.BookingId == bookingId));
        }

        public Task<Booking?> GetByCodeAsync(string bookingCode)
        {
            return Task.FromResult(Bookings.FirstOrDefault(b => b.BookingCode == bookingCode));
        }

        public Task<List<Booking>> GetListAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, int pageIndex, int pageSize)
        {
            return Task.FromResult(Bookings);
        }

        public Task<int> GetCountAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate)
        {
            return Task.FromResult(Bookings.Count);
        }

        public Task<bool> IsRoomBookedAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeBookingId = null)
        {
            return Task.FromResult(false);
        }

        public Task AddAsync(Booking booking)
        {
            Bookings.Add(booking);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(Booking booking)
        {
            return Task.CompletedTask;
        }

        public Task AddStatusHistoryAsync(BookingStatusHistory history)
        {
            Histories.Add(history);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync()
        {
            return Task.CompletedTask;
        }
    }

    private class FakeRoomRepository : IRoomRepository
    {
        public Dictionary<long, Room> Rooms { get; } = new();

        public Task<Room?> FindRoomAsync(long id, CancellationToken ct)
        {
            Rooms.TryGetValue(id, out var room);
            return Task.FromResult(room);
        }

        public Task<bool> HotelExistsAsync(int hotelId, CancellationToken ct) => Task.FromResult(true);
        public Task<bool> IsActiveHotelAsync(int hotelId, CancellationToken ct) => Task.FromResult(true);
        public Task<HotelArea?> FindAreaAsync(int areaId, CancellationToken ct) => Task.FromResult<HotelArea?>(null);
        public Task<RoomType?> FindTypeAsync(int id, CancellationToken ct) => Task.FromResult<RoomType?>(null);
        public Task<IReadOnlyList<RoomType>> ListTypesAsync(int hotelId, CancellationToken ct) => Task.FromResult<IReadOnlyList<RoomType>>(new List<RoomType>());
        public Task<IReadOnlyList<Room>> ListRoomsAsync(int hotelId, CancellationToken ct) => Task.FromResult<IReadOnlyList<Room>>(new List<Room>());
        public Task<bool> TypeNameExistsAsync(int hotelId, int areaId, string name, int exceptId, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> RoomNumberExistsAsync(int areaId, string number, long exceptId, CancellationToken ct) => Task.FromResult(false);
        public Task<bool> HasActiveRoomsAsync(int typeId, CancellationToken ct) => Task.FromResult(false);
        public void Add(RoomType type) { }
        public void Add(Room room) { }
        public Task SaveAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private static (
        BookingServices bookingService,
        CancellationPolicyService policyService,
        FakeBookingRepository bookingRepo,
        FakePaymentRepository paymentRepo,
        FakeCancellationPolicyRepository policyRepo,
        FakeRoomRepository roomRepo) CreateSystem()
    {
        var bookingRepo = new FakeBookingRepository();
        var paymentRepo = new FakePaymentRepository();
        var policyRepo = new FakeCancellationPolicyRepository();
        var roomRepo = new FakeRoomRepository();

        var policyService = new CancellationPolicyService(policyRepo);
        var bookingService = new BookingServices(
            bookingRepo,
            null!, // pricingService
            null!, // voucherRepo
            policyService,
            paymentRepo,
            roomRepo);

        return (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo);
    }

    private static Room CreateRoom(long roomId, int hotelId)
    {
        var roomType = new RoomType(hotelId, 1, "Deluxe", "Desc", 1_000_000m, 2, 1);
        typeof(RoomType).GetProperty("RoomTypeId")!.SetValue(roomType, 10);
        var room = new Room(10, 1, "101", 1, RoomStatus.Available, "Room 101");
        typeof(Room).GetProperty("RoomId")!.SetValue(room, roomId);
        typeof(Room).GetProperty("RoomType")!.SetValue(room, roomType);
        return room;
    }

    [Fact]
    public async Task Scenario1_EarlyCancellation_Returns100PercentRefund()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.Add(new CancellationPolicy
        {
            CancellationPolicyId = 1,
            HotelId = 1,
            PolicyName = "Chính sách hủy trước 7 ngày (100% hoàn tiền)",
            DaysBeforeCheckIn = 7,
            RefundPercentage = 100m,
            DepositPenaltyPercentage = 0m,
            IsActive = true
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 1,
            BookingCode = "BK20261027001",
            CustomerId = 10,
            CheckInDate = today.AddDays(10),
            CheckOutDate = today.AddDays(12),
            BookingStatus = BookingStatus.Confirmed,
            PaymentMethod = "Deposit",
            PaymentStatus = "Paid",
            TotalAmount = 2_000_000m,
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101, UnitPrice = 1_000_000m, NumberOfNights = 2, SubTotal = 2_000_000m } }
        };
        bookingRepo.Bookings.Add(booking);

        paymentRepo.Payments.Add(new Payment
        {
            PaymentId = 1,
            BookingId = 1,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            Amount = 2_000_000m,
            Status = PaymentStatus.Paid
        });

        // Preview
        var previewResult = await bookingService.PreviewCancelBookingAsync(1, 10, false);
        Assert.True(previewResult.Success);
        Assert.Equal(100m, previewResult.Data!.RefundPercentage);
        Assert.Equal(2_000_000m, previewResult.Data.RefundAmount);
        Assert.Equal(0m, previewResult.Data.PenaltyAmount);
        Assert.True(previewResult.Data.IsEligibleForRefund);

        // Cancel
        var cancelResult = await bookingService.CancelBookingAsync(1, 10, false, new CancelBookingRequest { Reason = "Kế hoạch thay đổi" });
        Assert.True(cancelResult.Success);
        Assert.Equal(BookingStatus.Cancelled, booking.BookingStatus);
        Assert.Equal("Refunded", booking.PaymentStatus);

        // Refund payment created
        var refundPayment = paymentRepo.Payments.FirstOrDefault(p => p.PaymentType == PaymentType.Refund);
        Assert.NotNull(refundPayment);
        Assert.Equal(2_000_000m, refundPayment.Amount);
        Assert.Equal(PaymentStatus.Paid, refundPayment.Status);

        // History recorded
        var history = bookingRepo.Histories.FirstOrDefault();
        Assert.NotNull(history);
        Assert.Equal("Cancelled", history.NewStatus);
        Assert.Contains("Hoàn trả: 2,000,000 VNĐ (100%)", history.Note);
    }

    [Fact]
    public async Task Scenario2_TieredCancellation_SelectsHighestApplicableDaysPolicy()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.AddRange(new[]
        {
            new CancellationPolicy { CancellationPolicyId = 1, HotelId = 1, PolicyName = "Hủy trước 7 ngày", DaysBeforeCheckIn = 7, RefundPercentage = 100m, DepositPenaltyPercentage = 0m, IsActive = true },
            new CancellationPolicy { CancellationPolicyId = 2, HotelId = 1, PolicyName = "Hủy trước 3 ngày", DaysBeforeCheckIn = 3, RefundPercentage = 50m, DepositPenaltyPercentage = 50m, IsActive = true },
            new CancellationPolicy { CancellationPolicyId = 3, HotelId = 1, PolicyName = "Hủy trước 1 ngày", DaysBeforeCheckIn = 1, RefundPercentage = 20m, DepositPenaltyPercentage = 80m, IsActive = true }
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 2,
            BookingCode = "BK20261027002",
            CustomerId = 10,
            CheckInDate = today.AddDays(4), // 4 days remaining -> matches 3 days policy (since 3 <= 4)
            CheckOutDate = today.AddDays(6),
            BookingStatus = BookingStatus.Confirmed,
            TotalAmount = 4_000_000m,
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101 } }
        };
        bookingRepo.Bookings.Add(booking);

        paymentRepo.Payments.Add(new Payment
        {
            BookingId = 2,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            Amount = 4_000_000m,
            Status = PaymentStatus.Paid
        });

        var preview = await bookingService.PreviewCancelBookingAsync(2, 10, false);
        Assert.True(preview.Success);
        Assert.Equal("Hủy trước 3 ngày", preview.Data!.AppliedPolicyName);
        Assert.Equal(50m, preview.Data.RefundPercentage);
        Assert.Equal(2_000_000m, preview.Data.RefundAmount);
        Assert.Equal(2_000_000m, preview.Data.PenaltyAmount);

        await bookingService.CancelBookingAsync(2, 10, false, new CancelBookingRequest { Reason = "Bận việc" });
        var refundPayment = paymentRepo.Payments.FirstOrDefault(p => p.PaymentType == PaymentType.Refund);
        Assert.NotNull(refundPayment);
        Assert.Equal(2_000_000m, refundPayment.Amount);
    }

    [Fact]
    public async Task Scenario3_LateCancellation_ZeroRefundWhenNoPolicyMatches()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.Add(new CancellationPolicy
        {
            CancellationPolicyId = 1,
            HotelId = 1,
            PolicyName = "Hủy trước 3 ngày",
            DaysBeforeCheckIn = 3,
            RefundPercentage = 50m,
            DepositPenaltyPercentage = 50m,
            IsActive = true
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 3,
            BookingCode = "BK20261027003",
            CustomerId = 10,
            CheckInDate = today.AddDays(1), // 1 day remaining -> no policy has DaysBeforeCheckIn <= 1
            BookingStatus = BookingStatus.Confirmed,
            TotalAmount = 2_000_000m,
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101 } }
        };
        bookingRepo.Bookings.Add(booking);

        paymentRepo.Payments.Add(new Payment
        {
            BookingId = 3,
            PaymentType = PaymentType.Payment,
            Amount = 2_000_000m,
            Status = PaymentStatus.Paid
        });

        var preview = await bookingService.PreviewCancelBookingAsync(3, 10, false);
        Assert.True(preview.Success);
        Assert.Equal(0m, preview.Data!.RefundPercentage);
        Assert.Equal(0m, preview.Data.RefundAmount);
        Assert.Equal(2_000_000m, preview.Data.PenaltyAmount);
        Assert.False(preview.Data.IsEligibleForRefund);

        await bookingService.CancelBookingAsync(3, 10, false, new CancelBookingRequest { Reason = "Hủy sát giờ" });
        var refundPayment = paymentRepo.Payments.FirstOrDefault(p => p.PaymentType == PaymentType.Refund);
        Assert.Null(refundPayment); // Không tạo payment refund khi số tiền hoàn = 0
    }

    [Fact]
    public async Task Scenario4_PastCheckInDate_ReturnsZeroRefund()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.Add(new CancellationPolicy
        {
            CancellationPolicyId = 1,
            HotelId = 1,
            PolicyName = "Chính sách 1 ngày",
            DaysBeforeCheckIn = 1,
            RefundPercentage = 100m,
            DepositPenaltyPercentage = 0m,
            IsActive = true
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 4,
            CustomerId = 10,
            CheckInDate = today.AddDays(-2), // Đã quá hạn 2 ngày
            BookingStatus = BookingStatus.Pending,
            TotalAmount = 1_000_000m,
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101 } }
        };
        bookingRepo.Bookings.Add(booking);
        paymentRepo.Payments.Add(new Payment { BookingId = 4, PaymentType = PaymentType.Payment, Amount = 1_000_000m, Status = PaymentStatus.Paid });

        var preview = await bookingService.PreviewCancelBookingAsync(4, 10, false);
        Assert.True(preview.Success);
        Assert.Equal(0m, preview.Data!.RefundAmount);
        Assert.Equal(1_000_000m, preview.Data.PenaltyAmount);
    }

    [Fact]
    public async Task Scenario5_UnpaidBooking_ReturnsZeroRefundAndZeroPenalty()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.Add(new CancellationPolicy
        {
            CancellationPolicyId = 1,
            HotelId = 1,
            PolicyName = "Hủy linh hoạt 100%",
            DaysBeforeCheckIn = 0,
            RefundPercentage = 100m,
            DepositPenaltyPercentage = 0m,
            IsActive = true
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 5,
            CustomerId = 10,
            CheckInDate = today.AddDays(5),
            BookingStatus = BookingStatus.Pending,
            PaymentStatus = "Unpaid",
            TotalAmount = 3_000_000m,
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101 } }
        };
        bookingRepo.Bookings.Add(booking);

        var preview = await bookingService.PreviewCancelBookingAsync(5, 10, false);
        Assert.True(preview.Success);
        Assert.Equal(0m, preview.Data!.TotalPaid);
        Assert.Equal(0m, preview.Data.RefundAmount);
        Assert.Equal(0m, preview.Data.PenaltyAmount);
        Assert.False(preview.Data.IsEligibleForRefund);

        await bookingService.CancelBookingAsync(5, 10, false, new CancelBookingRequest { Reason = "Đổi ý" });
        Assert.Equal(BookingStatus.Cancelled, booking.BookingStatus);
        Assert.Empty(paymentRepo.Payments);
    }

    [Fact]
    public async Task Scenario6_PartialPayment_CalculatesRefundFromPaidAmountOnly()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.Add(new CancellationPolicy
        {
            CancellationPolicyId = 1,
            HotelId = 1,
            PolicyName = "Hủy trước 3 ngày hoàn 50%",
            DaysBeforeCheckIn = 3,
            RefundPercentage = 50m,
            DepositPenaltyPercentage = 50m,
            IsActive = true
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 6,
            BookingCode = "BKPARTIAL",
            CustomerId = 10,
            CheckInDate = today.AddDays(5),
            BookingStatus = BookingStatus.Confirmed,
            TotalAmount = 10_000_000m,
            DepositAmount = 3_000_000m, // Khách chỉ mới cọc 3 triệu
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101 } }
        };
        bookingRepo.Bookings.Add(booking);

        paymentRepo.Payments.Add(new Payment
        {
            BookingId = 6,
            PaymentType = PaymentType.Payment,
            Amount = 3_000_000m,
            Status = PaymentStatus.Paid
        });

        var preview = await bookingService.PreviewCancelBookingAsync(6, 10, false);
        Assert.True(preview.Success);
        Assert.Equal(3_000_000m, preview.Data!.TotalPaid);
        Assert.Equal(1_500_000m, preview.Data.RefundAmount); // 50% của 3 triệu đã trả, không phải của 10 triệu
        Assert.Equal(1_500_000m, preview.Data.PenaltyAmount);

        await bookingService.CancelBookingAsync(6, 10, false, new CancelBookingRequest { Reason = "Không đi nữa" });
        var refundPayment = paymentRepo.Payments.FirstOrDefault(p => p.PaymentType == PaymentType.Refund);
        Assert.NotNull(refundPayment);
        Assert.Equal(1_500_000m, refundPayment.Amount);
    }

    [Fact]
    public async Task Scenario7_PreventsDuplicateRefund_WhenRefundRecordAlreadyExists()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        policyRepo.Policies.Add(new CancellationPolicy
        {
            CancellationPolicyId = 1,
            HotelId = 1,
            PolicyName = "Hủy 100%",
            DaysBeforeCheckIn = 3,
            RefundPercentage = 100m,
            DepositPenaltyPercentage = 0m,
            IsActive = true
        });

        var room = CreateRoom(101, 1);
        roomRepo.Rooms[101] = room;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var booking = new Booking
        {
            BookingId = 7,
            CustomerId = 10,
            CheckInDate = today.AddDays(5),
            BookingStatus = BookingStatus.Confirmed,
            TotalAmount = 1_000_000m,
            BookingDetails = new List<BookingDetail> { new() { RoomId = 101 } }
        };
        bookingRepo.Bookings.Add(booking);

        paymentRepo.Payments.Add(new Payment { BookingId = 7, PaymentType = PaymentType.Payment, Amount = 1_000_000m, Status = PaymentStatus.Paid });
        // Giả lập đã có 1 bản ghi Refund trước đó
        paymentRepo.Payments.Add(new Payment { BookingId = 7, PaymentType = PaymentType.Refund, Amount = 1_000_000m, Status = PaymentStatus.Paid });

        await bookingService.CancelBookingAsync(7, 10, false, new CancelBookingRequest { Reason = "Thử lại" });

        var refundCount = paymentRepo.Payments.Count(p => p.PaymentType == PaymentType.Refund);
        Assert.Equal(1, refundCount); // Không bị nhân đôi bản ghi hoàn tiền
    }

    [Fact]
    public async Task Scenario8_EnsureBookingAccess_ThrowsUnauthorizedWhenActorIsNotOwner()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        var booking = new Booking
        {
            BookingId = 8,
            CustomerId = 10,
            CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(5),
            BookingStatus = BookingStatus.Confirmed
        };
        bookingRepo.Bookings.Add(booking);

        // Khách hàng ID = 99 truy cập đơn của khách ID = 10 mà không phải admin
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            bookingService.PreviewCancelBookingAsync(8, 99, false));

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            bookingService.CancelBookingAsync(8, 99, false, new CancelBookingRequest { Reason = "Hack" }));
    }

    [Fact]
    public async Task Scenario9_AmbiguityHandling_SafelyPicksHighestRefundCandidate()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        // 2 chính sách bị xung đột dữ liệu cùng DaysBeforeCheckIn = 3 nhưng tỷ lệ hoàn khác nhau (50% và 70%)
        policyRepo.Policies.AddRange(new[]
        {
            new CancellationPolicy { CancellationPolicyId = 1, HotelId = 1, PolicyName = "Policy A", DaysBeforeCheckIn = 3, RefundPercentage = 50m, DepositPenaltyPercentage = 50m, IsActive = true },
            new CancellationPolicy { CancellationPolicyId = 2, HotelId = 1, PolicyName = "Policy B", DaysBeforeCheckIn = 3, RefundPercentage = 70m, DepositPenaltyPercentage = 30m, IsActive = true }
        });

        var chosen = await policyService.GetApplicablePolicyAsync(1, 4);
        Assert.NotNull(chosen);
        Assert.Equal(70m, chosen.RefundPercentage); // Ưu tiên quyền lợi khách hàng (70%)
    }

    [Fact]
    public async Task Scenario10_PolicyCrudValidation_ThrowsOnInvalidInputsOrConflict()
    {
        var (bookingService, policyService, bookingRepo, paymentRepo, policyRepo, roomRepo) = CreateSystem();

        // Empty Name
        await Assert.ThrowsAsync<ArgumentException>(() =>
            policyService.CreatePolicyAsync(new CreateCancellationPolicyRequest { HotelId = 1, PolicyName = "", DaysBeforeCheckIn = 3, RefundPercentage = 50m, DepositPenaltyPercentage = 50m }));

        // Negative days
        await Assert.ThrowsAsync<ArgumentException>(() =>
            policyService.CreatePolicyAsync(new CreateCancellationPolicyRequest { HotelId = 1, PolicyName = "Test", DaysBeforeCheckIn = -1, RefundPercentage = 50m, DepositPenaltyPercentage = 50m }));

        // Invalid percentage > 100
        await Assert.ThrowsAsync<ArgumentException>(() =>
            policyService.CreatePolicyAsync(new CreateCancellationPolicyRequest { HotelId = 1, PolicyName = "Test", DaysBeforeCheckIn = 3, RefundPercentage = 150m, DepositPenaltyPercentage = 0m }));

        // Successful create
        var created = await policyService.CreatePolicyAsync(new CreateCancellationPolicyRequest
        {
            HotelId = 1,
            PolicyName = "Standard Policy",
            DaysBeforeCheckIn = 5,
            RefundPercentage = 80m,
            DepositPenaltyPercentage = 20m,
            IsActive = true
        });
        Assert.Equal(5, created.DaysBeforeCheckIn);

        // Conflict check: tạo thêm chính sách active cùng DaysBeforeCheckIn = 5 cho cùng khách sạn
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            policyService.CreatePolicyAsync(new CreateCancellationPolicyRequest
            {
                HotelId = 1,
                PolicyName = "Conflicting Policy",
                DaysBeforeCheckIn = 5,
                RefundPercentage = 50m,
                DepositPenaltyPercentage = 50m,
                IsActive = true
            }));
    }
}
