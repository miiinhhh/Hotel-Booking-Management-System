using HotelBooking.Application.DTOs.Common;
using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using Xunit;

namespace HotelBooking.Tests;

public sealed class PaymentTests
{
    private class FakePaymentRepository : IPaymentRepository
    {
        public readonly List<Payment> Payments = new();
        public readonly List<BookingCustomerAccessInfo> BookingsAccess = new();
        public readonly HashSet<(long BookingId, long StaffId)> StaffAssignments = new();
        public BookingPaymentInfo? BookingInfo { get; set; }
        public decimal TotalPaid { get; set; }

        public Task<Payment?> GetByIdAsync(long paymentId)
        {
            var payment = Payments.FirstOrDefault(p => p.PaymentId == paymentId);
            return Task.FromResult(payment);
        }

        public Task<IEnumerable<Payment>> GetByBookingIdAsync(long bookingId)
        {
            var payments = Payments.Where(p => p.BookingId == bookingId).AsEnumerable();
            return Task.FromResult(payments);
        }

        public Task<long> CreateAsync(Payment payment)
        {
            payment.PaymentId = Payments.Count + 1;
            Payments.Add(payment);
            return Task.FromResult(payment.PaymentId);
        }

        public Task<bool> UpdateStatusAsync(long paymentId, string status, DateTime? paidAt)
        {
            var payment = Payments.FirstOrDefault(p => p.PaymentId == paymentId);
            if (payment == null) return Task.FromResult(false);

            if (Enum.TryParse<PaymentStatus>(status, true, out var parsedStatus))
            {
                payment.Status = parsedStatus;
            }
            payment.PaidAt = paidAt;
            return Task.FromResult(true);
        }

        public Task<decimal> GetTotalPaidAmountAsync(long bookingId)
        {
            return Task.FromResult(TotalPaid);
        }

        public Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(long bookingId)
        {
            return Task.FromResult(BookingInfo);
        }

        public Task UpdateBookingPaymentSummaryAsync(long bookingId, decimal totalPaid, decimal totalAmount)
        {
            TotalPaid = totalPaid;
            if (BookingInfo != null)
            {
                BookingInfo.RemainingAmount = Math.Max(0, totalAmount - totalPaid);
            }
            return Task.CompletedTask;
        }

        public Task<BookingCustomerAccessInfo?> GetBookingCustomerAccessInfoAsync(long bookingId)
        {
            var booking = BookingsAccess.FirstOrDefault(b => b.BookingId == bookingId);
            return Task.FromResult(booking);
        }

        public Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId)
        {
            return Task.FromResult(StaffAssignments.Contains((bookingId, staffUserId)));
        }

        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetCustomerPaymentHistoryAsync(
            long customerId,
            int page,
            int pageSize)
        {
            var bookingIds = BookingsAccess.Where(b => b.CustomerId == customerId).Select(b => b.BookingId).ToHashSet();
            var matches = Payments.Where(p => bookingIds.Contains(p.BookingId))
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.PaymentId)
                .Select(p => new PaymentHistoryDto
                {
                    PaymentId = p.PaymentId,
                    BookingId = p.BookingId,
                    CustomerId = customerId,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    PaymentType = p.PaymentType.ToString(),
                    Status = p.Status.ToString(),
                    CreatedAt = p.CreatedAt,
                    PaidAt = p.PaidAt
                })
                .ToList();

            var totalCount = matches.Count;
            var items = matches.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(((IReadOnlyList<PaymentHistoryDto>)items, totalCount));
        }

        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetBookingPaymentHistoryAsync(
            long bookingId,
            int page,
            int pageSize)
        {
            var booking = BookingsAccess.FirstOrDefault(b => b.BookingId == bookingId);
            var customerId = booking?.CustomerId ?? 0;

            var matches = Payments.Where(p => p.BookingId == bookingId)
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.PaymentId)
                .Select(p => new PaymentHistoryDto
                {
                    PaymentId = p.PaymentId,
                    BookingId = p.BookingId,
                    CustomerId = customerId,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    PaymentType = p.PaymentType.ToString(),
                    Status = p.Status.ToString(),
                    CreatedAt = p.CreatedAt,
                    PaidAt = p.PaidAt
                })
                .ToList();

            var totalCount = matches.Count;
            var items = matches.Skip((page - 1) * pageSize).Take(pageSize).ToList();
            return Task.FromResult(((IReadOnlyList<PaymentHistoryDto>)items, totalCount));
        }

        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetStaffPaymentHistoryAsync(
            PaymentHistoryFilterRequest filter,
            long staffUserId,
            bool isAdmin)
        {
            var query = Payments.AsEnumerable();

            if (!isAdmin)
            {
                var assignedBookingIds = StaffAssignments
                    .Where(s => s.StaffId == staffUserId)
                    .Select(s => s.BookingId)
                    .ToHashSet();

                query = query.Where(p => assignedBookingIds.Contains(p.BookingId));
            }

            if (filter.BookingId.HasValue)
            {
                query = query.Where(p => p.BookingId == filter.BookingId.Value);
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(p => string.Equals(p.Status.ToString(), filter.Status, StringComparison.OrdinalIgnoreCase));
            }

            var matches = query
                .OrderByDescending(p => p.CreatedAt)
                .ThenByDescending(p => p.PaymentId)
                .Select(p => new PaymentHistoryDto
                {
                    PaymentId = p.PaymentId,
                    BookingId = p.BookingId,
                    Amount = p.Amount,
                    PaymentMethod = p.PaymentMethod.ToString(),
                    PaymentType = p.PaymentType.ToString(),
                    Status = p.Status.ToString(),
                    CreatedAt = p.CreatedAt,
                    PaidAt = p.PaidAt
                })
                .ToList();

            var totalCount = matches.Count;
            var items = matches.Skip((filter.Page - 1) * filter.PageSize).Take(filter.PageSize).ToList();
            return Task.FromResult(((IReadOnlyList<PaymentHistoryDto>)items, totalCount));
        }
    }

    [Fact]
    public async Task CreatePayment_WithNegativeOrZeroAmount_ThrowsArgumentException()
    {
        var repo = new FakePaymentRepository();
        var service = new PaymentService(repo);

        var request = new CreatePaymentRequest
        {
            BookingId = 1,
            Amount = 0,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment
        };

        await Assert.ThrowsAsync<ArgumentException>(() => service.CreatePaymentAsync(request));
    }

    [Fact]
    public async Task CreatePayment_WhenBookingNotFound_ThrowsKeyNotFoundException()
    {
        var repo = new FakePaymentRepository { BookingInfo = null };
        var service = new PaymentService(repo);

        var request = new CreatePaymentRequest
        {
            BookingId = 999,
            Amount = 500000,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment
        };

        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreatePaymentAsync(request));
    }

    [Fact]
    public async Task CreatePayment_WhenBookingCancelled_ThrowsInvalidOperationException()
    {
        var repo = new FakePaymentRepository
        {
            BookingInfo = new BookingPaymentInfo
            {
                BookingId = 1,
                BookingStatus = "Cancelled",
                TotalAmount = 1000000
            }
        };
        var service = new PaymentService(repo);

        var request = new CreatePaymentRequest
        {
            BookingId = 1,
            Amount = 300000,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreatePaymentAsync(request));
    }

    [Fact]
    public async Task CreatePayment_WhenAmountExceedsRemaining_ThrowsInvalidOperationException()
    {
        var repo = new FakePaymentRepository
        {
            BookingInfo = new BookingPaymentInfo
            {
                BookingId = 1,
                BookingStatus = "Pending",
                TotalAmount = 1000000
            },
            TotalPaid = 800000
        };
        var service = new PaymentService(repo);

        var request = new CreatePaymentRequest
        {
            BookingId = 1,
            Amount = 300000,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreatePaymentAsync(request));
    }

    [Fact]
    public async Task CreatePayment_ValidRequest_CreatesPendingPayment()
    {
        var repo = new FakePaymentRepository
        {
            BookingInfo = new BookingPaymentInfo
            {
                BookingId = 1,
                BookingStatus = "Pending",
                TotalAmount = 1000000,
                DepositAmount = 300000,
                RemainingAmount = 1000000
            },
            TotalPaid = 0
        };
        var service = new PaymentService(repo);

        var request = new CreatePaymentRequest
        {
            BookingId = 1,
            Amount = 300000,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            TransactionCode = "TX123456"
        };

        var response = await service.CreatePaymentAsync(request);

        Assert.NotNull(response);
        Assert.Equal(1, response.PaymentId);
        Assert.Equal(1, response.BookingId);
        Assert.Equal(300000, response.Amount);
        Assert.Equal(PaymentStatus.Pending, response.Status);
        Assert.Equal("TX123456", response.TransactionCode);
    }

    [Fact]
    public async Task ConfirmPayment_WhenSuccessful_UpdatesStatusToPaid()
    {
        var repo = new FakePaymentRepository
        {
            BookingInfo = new BookingPaymentInfo
            {
                BookingId = 1,
                BookingStatus = "Pending",
                TotalAmount = 1000000,
                DepositAmount = 300000,
                RemainingAmount = 1000000
            }
        };
        var service = new PaymentService(repo);

        var payment = new Payment
        {
            BookingId = 1,
            Amount = 300000,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        var paymentId = await repo.CreateAsync(payment);
        repo.TotalPaid = 300000;

        var result = await service.ConfirmPaymentAsync(paymentId, new ConfirmPaymentRequest { IsSuccessful = true });

        Assert.NotNull(result);
        Assert.Equal(PaymentStatus.Paid, result.Status);
        Assert.NotNull(result.PaidAt);
    }

    [Fact]
    public async Task ConfirmPayment_WhenFailed_UpdatesStatusToFailed()
    {
        var repo = new FakePaymentRepository
        {
            BookingInfo = new BookingPaymentInfo
            {
                BookingId = 1,
                BookingStatus = "Pending",
                TotalAmount = 1000000
            }
        };
        var service = new PaymentService(repo);

        var payment = new Payment
        {
            BookingId = 1,
            Amount = 300000,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            Status = PaymentStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        var paymentId = await repo.CreateAsync(payment);

        var result = await service.ConfirmPaymentAsync(paymentId, new ConfirmPaymentRequest { IsSuccessful = false });

        Assert.NotNull(result);
        Assert.Equal(PaymentStatus.Failed, result.Status);
        Assert.Null(result.PaidAt);
    }

    // ==========================================
    // HISTORY & AUTHORIZATION TESTS
    // ==========================================

    [Theory]
    [InlineData(0, 10)]
    [InlineData(-1, 10)]
    [InlineData(1, 0)]
    [InlineData(1, 101)]
    public async Task GetMyPaymentHistory_InvalidPaging_ThrowsArgumentException(int page, int pageSize)
    {
        var repo = new FakePaymentRepository();
        var service = new PaymentService(repo);

        await Assert.ThrowsAsync<ArgumentException>(() => service.GetMyPaymentHistoryAsync(1, page, pageSize));
    }

    [Fact]
    public async Task GetMyPaymentHistory_ReturnsOnlyCurrentCustomerPayments()
    {
        var repo = new FakePaymentRepository();
        long customerA = 10;
        long customerB = 20;

        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 101, CustomerId = customerA });
        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 102, CustomerId = customerB });

        repo.Payments.Add(new Payment { PaymentId = 1, BookingId = 101, Amount = 100000, CreatedAt = DateTime.UtcNow });
        repo.Payments.Add(new Payment { PaymentId = 2, BookingId = 102, Amount = 200000, CreatedAt = DateTime.UtcNow });

        var service = new PaymentService(repo);
        var result = await service.GetMyPaymentHistoryAsync(customerA, 1, 10);

        Assert.NotNull(result);
        Assert.Equal(1, result.TotalItems);
        Assert.Single(result.Items);
        Assert.Equal(101, result.Items[0].BookingId);
    }

    [Fact]
    public async Task GetBookingPaymentHistory_WhenBookingNotFound_ThrowsKeyNotFoundException()
    {
        var repo = new FakePaymentRepository();
        var service = new PaymentService(repo);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.GetBookingPaymentHistoryAsync(999, 10, isAdmin: false, isStaff: false, page: 1, pageSize: 10));
    }

    [Fact]
    public async Task GetBookingPaymentHistory_CustomerNotOwner_ThrowsUnauthorizedAccessException()
    {
        var repo = new FakePaymentRepository();
        long ownerId = 10;
        long attackerId = 99;

        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 101, CustomerId = ownerId });

        var service = new PaymentService(repo);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetBookingPaymentHistoryAsync(101, attackerId, isAdmin: false, isStaff: false, page: 1, pageSize: 10));
    }

    [Fact]
    public async Task GetBookingPaymentHistory_CustomerIsOwner_ReturnsPayments()
    {
        var repo = new FakePaymentRepository();
        long ownerId = 10;

        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 101, CustomerId = ownerId });
        repo.Payments.Add(new Payment { PaymentId = 1, BookingId = 101, Amount = 500000, CreatedAt = DateTime.UtcNow });

        var service = new PaymentService(repo);
        var result = await service.GetBookingPaymentHistoryAsync(101, ownerId, isAdmin: false, isStaff: false, page: 1, pageSize: 10);

        Assert.NotNull(result);
        Assert.Equal(1, result.TotalItems);
        Assert.Single(result.Items);
    }

    [Fact]
    public async Task GetBookingPaymentHistory_Admin_CanViewAnyBooking()
    {
        var repo = new FakePaymentRepository();
        long ownerId = 10;
        long adminId = 999;

        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 101, CustomerId = ownerId });
        repo.Payments.Add(new Payment { PaymentId = 1, BookingId = 101, Amount = 500000, CreatedAt = DateTime.UtcNow });

        var service = new PaymentService(repo);
        var result = await service.GetBookingPaymentHistoryAsync(101, adminId, isAdmin: true, isStaff: false, page: 1, pageSize: 10);

        Assert.NotNull(result);
        Assert.Equal(1, result.TotalItems);
    }

    [Fact]
    public async Task GetBookingPaymentHistory_Staff_OnlyAssignedAreaAllowed()
    {
        var repo = new FakePaymentRepository();
        long staffId = 50;

        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 101, CustomerId = 10 });
        repo.BookingsAccess.Add(new BookingCustomerAccessInfo { BookingId = 102, CustomerId = 11 });

        // Staff is assigned to Booking 101, but NOT Booking 102
        repo.StaffAssignments.Add((101, staffId));

        var service = new PaymentService(repo);

        // Allowed for 101
        var result = await service.GetBookingPaymentHistoryAsync(101, staffId, isAdmin: false, isStaff: true, page: 1, pageSize: 10);
        Assert.NotNull(result);

        // Denied for 102
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.GetBookingPaymentHistoryAsync(102, staffId, isAdmin: false, isStaff: true, page: 1, pageSize: 10));
    }

    [Fact]
    public async Task GetStaffPaymentHistory_PagingCalculations_CalculatesTotalPagesCorrectly()
    {
        var repo = new FakePaymentRepository();
        for (int i = 1; i <= 25; i++)
        {
            repo.Payments.Add(new Payment { PaymentId = i, BookingId = i, Amount = i * 10000, CreatedAt = DateTime.UtcNow.AddMinutes(-i) });
        }

        var service = new PaymentService(repo);
        var filter = new PaymentHistoryFilterRequest { Page = 1, PageSize = 10 };

        var result = await service.GetStaffPaymentHistoryAsync(filter, staffUserId: 1, isAdmin: true);

        Assert.NotNull(result);
        Assert.Equal(25, result.TotalItems);
        Assert.Equal(10, result.PageSize);
        Assert.Equal(1, result.Page);
        Assert.Equal(3, result.TotalPages);
        Assert.Equal(10, result.Items.Count);

        // Page 3 (last page with remaining 5 items)
        filter.Page = 3;
        var page3Result = await service.GetStaffPaymentHistoryAsync(filter, staffUserId: 1, isAdmin: true);
        Assert.Equal(5, page3Result.Items.Count);
    }
}
