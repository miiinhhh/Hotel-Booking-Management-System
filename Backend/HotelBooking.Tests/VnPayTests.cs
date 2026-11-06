using System;
using System.Collections.Generic;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using Xunit;

namespace HotelBooking.Tests;

public class VnPayTests
{
    private readonly VnPaySettings _testSettings = new()
    {
        TmnCode = "HADLTGYF",
        HashSecret = "REMCDYSPOYOWJFSBTGBMFAOTHRQUPNVM",
        BaseUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
        ReturnUrl = "http://localhost:5131/api/payments/vnpay/return",
        FrontendReturnUrl = "http://localhost:5173/payment/vnpay-return"
    };

    [Fact]
    public void VnPayLibrary_CreateRequestUrl_ProducesValidHmacSha512Checksum()
    {
        var vnpay = new VnPayLibrary();
        vnpay.AddRequestData("vnp_Version", "2.1.0");
        vnpay.AddRequestData("vnp_Command", "pay");
        vnpay.AddRequestData("vnp_TmnCode", _testSettings.TmnCode);
        vnpay.AddRequestData("vnp_Amount", "10000000"); // 100,000 VND
        vnpay.AddRequestData("vnp_TxnRef", "STAYLUXE_TEST_001");
        vnpay.AddRequestData("vnp_OrderInfo", "Test payment");

        var url = vnpay.CreateRequestUrl(_testSettings.BaseUrl, _testSettings.HashSecret);

        Assert.StartsWith(_testSettings.BaseUrl, url);
        Assert.Contains("vnp_SecureHash=", url);
        Assert.Contains("vnp_TmnCode=HADLTGYF", url);
        Assert.Contains("vnp_TxnRef=STAYLUXE_TEST_001", url);
    }

    [Fact]
    public void VnPayLibrary_ValidateSignature_AcceptsValidSignature_AndRejectsTampered()
    {
        var vnpay = new VnPayLibrary();
        vnpay.AddResponseData("vnp_Amount", "10000000");
        vnpay.AddResponseData("vnp_BankCode", "NCB");
        vnpay.AddResponseData("vnp_ResponseCode", "00");
        vnpay.AddResponseData("vnp_TxnRef", "STAYLUXE_TEST_002");

        // Compute valid signature
        var rawData = "vnp_Amount=10000000&vnp_BankCode=NCB&vnp_ResponseCode=00&vnp_TxnRef=STAYLUXE_TEST_002";
        var validHash = VnPayLibrary.HmacSha512(_testSettings.HashSecret, rawData);
        vnpay.AddResponseData("vnp_SecureHash", validHash);

        var isValid = vnpay.ValidateSignature(validHash, _testSettings.HashSecret);
        Assert.True(isValid);

        // Tampered hash or tampered data
        var isInvalid = vnpay.ValidateSignature("tampered-hash-value-12345", _testSettings.HashSecret);
        Assert.False(isInvalid);
    }

    [Fact]
    public async Task VnPayService_CreatePaymentUrlAsync_RejectsUnauthorizedAccess()
    {
        var fakePaymentRepo = new FakePaymentRepo();
        var fakeBookingRepo = new FakeBookingRepo();
        var service = new VnPayService(fakePaymentRepo, fakeBookingRepo, _testSettings);

        var request = new CreateVnPayPaymentRequest
        {
            BookingId = 1,
            PaymentTarget = "Deposit"
        };

        // User 99 is not owner (owner is customerId 10)
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            service.CreatePaymentUrlAsync(request, customerId: 99, clientIp: "127.0.0.1"));
    }

    [Fact]
    public async Task VnPayService_CreatePaymentUrlAsync_GeneratesUrlAndPendingPayment()
    {
        var fakePaymentRepo = new FakePaymentRepo();
        var fakeBookingRepo = new FakeBookingRepo();
        var service = new VnPayService(fakePaymentRepo, fakeBookingRepo, _testSettings);

        var request = new CreateVnPayPaymentRequest
        {
            BookingId = 1,
            PaymentTarget = "Deposit"
        };

        var result = await service.CreatePaymentUrlAsync(request, customerId: 10, clientIp: "127.0.0.1");

        Assert.NotNull(result);
        Assert.Equal(1, result.BookingId);
        Assert.StartsWith("STAYLUXE_1_", result.TxnRef);
        Assert.Equal(300000m, result.Amount); // 30% deposit of 1,000,000
        Assert.Contains("vnp_SecureHash=", result.PaymentUrl);
        Assert.Equal(PaymentStatus.Pending, fakePaymentRepo.LastCreatedPayment?.Status);
    }

    [Fact]
    public async Task VnPayService_ProcessReturnCallbackAsync_ConfirmsPaidTransaction()
    {
        var fakePaymentRepo = new FakePaymentRepo();
        var fakeBookingRepo = new FakeBookingRepo();
        var service = new VnPayService(fakePaymentRepo, fakeBookingRepo, _testSettings);

        var txnRef = "STAYLUXE_1_TEST_003";
        fakePaymentRepo.StoredPayments[txnRef] = new Payment
        {
            PaymentId = 42,
            BookingId = 1,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            Amount = 300000m,
            Status = PaymentStatus.Pending,
            TransactionCode = txnRef
        };

        var query = new SortedList<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = "30000000",
            ["vnp_BankCode"] = "NCB",
            ["vnp_ResponseCode"] = "00",
            ["vnp_TransactionNo"] = "14567890",
            ["vnp_TxnRef"] = txnRef
        };

        var rawToSign = $"vnp_Amount={WebUtility.UrlEncode(query["vnp_Amount"])}&vnp_BankCode={WebUtility.UrlEncode(query["vnp_BankCode"])}&vnp_ResponseCode={WebUtility.UrlEncode(query["vnp_ResponseCode"])}&vnp_TransactionNo={WebUtility.UrlEncode(query["vnp_TransactionNo"])}&vnp_TxnRef={WebUtility.UrlEncode(query["vnp_TxnRef"])}";
        var hash = VnPayLibrary.HmacSha512(_testSettings.HashSecret, rawToSign);
        query["vnp_SecureHash"] = hash;

        var result = await service.ProcessReturnCallbackAsync(query);

        Assert.True(result.Success);
        Assert.Equal("Paid", result.Status);
        Assert.Equal(PaymentStatus.Paid, fakePaymentRepo.StoredPayments[txnRef].Status);
        Assert.NotNull(fakePaymentRepo.StoredPayments[txnRef].PaidAt);
    }

    [Fact]
    public async Task VnPayService_ProcessIpnAsync_IsIdempotent_WhenCalledMultipleTimes()
    {
        var fakePaymentRepo = new FakePaymentRepo();
        var fakeBookingRepo = new FakeBookingRepo();
        var service = new VnPayService(fakePaymentRepo, fakeBookingRepo, _testSettings);

        var txnRef = "STAYLUXE_1_TEST_004";
        fakePaymentRepo.StoredPayments[txnRef] = new Payment
        {
            PaymentId = 43,
            BookingId = 1,
            Amount = 300000m,
            Status = PaymentStatus.Pending,
            TransactionCode = txnRef
        };

        var query = new SortedList<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Amount"] = "30000000",
            ["vnp_ResponseCode"] = "00",
            ["vnp_TxnRef"] = txnRef
        };

        var rawToSign = $"vnp_Amount={WebUtility.UrlEncode(query["vnp_Amount"])}&vnp_ResponseCode={WebUtility.UrlEncode(query["vnp_ResponseCode"])}&vnp_TxnRef={WebUtility.UrlEncode(query["vnp_TxnRef"])}";
        query["vnp_SecureHash"] = VnPayLibrary.HmacSha512(_testSettings.HashSecret, rawToSign);

        // First IPN: Marks as Paid
        var ipn1 = await service.ProcessIpnAsync(query);
        Assert.Equal("00", ipn1.RspCode);
        Assert.Equal("Confirm Success", ipn1.Message);

        // Second IPN: Returns Order Already Confirmed (02)
        var ipn2 = await service.ProcessIpnAsync(query);
        Assert.Equal("02", ipn2.RspCode);
        Assert.Equal("Order already confirmed", ipn2.Message);
    }

    private class FakePaymentRepo : IPaymentRepository
    {
        public Payment? LastCreatedPayment { get; private set; }
        public Dictionary<string, Payment> StoredPayments { get; } = new();

        public Task<Payment?> GetByIdAsync(long paymentId) => Task.FromResult(LastCreatedPayment);
        public Task<IEnumerable<Payment>> GetByBookingIdAsync(long bookingId) => Task.FromResult<IEnumerable<Payment>>([]);

        public Task<Payment?> GetByTransactionCodeAsync(string transactionCode)
        {
            StoredPayments.TryGetValue(transactionCode, out var p);
            return Task.FromResult(p ?? (LastCreatedPayment?.TransactionCode == transactionCode ? LastCreatedPayment : null));
        }

        public Task<long> CreateAsync(Payment payment)
        {
            payment.PaymentId = 100;
            LastCreatedPayment = payment;
            if (payment.TransactionCode != null) StoredPayments[payment.TransactionCode] = payment;
            return Task.FromResult(payment.PaymentId);
        }

        public Task<bool> UpdateStatusAsync(long paymentId, string status, DateTime? paidAt)
        {
            if (LastCreatedPayment != null && LastCreatedPayment.PaymentId == paymentId)
            {
                LastCreatedPayment.Status = Enum.Parse<PaymentStatus>(status);
                LastCreatedPayment.PaidAt = paidAt;
            }
            foreach (var p in StoredPayments.Values)
            {
                if (p.PaymentId == paymentId)
                {
                    p.Status = Enum.Parse<PaymentStatus>(status);
                    p.PaidAt = paidAt;
                }
            }
            return Task.FromResult(true);
        }

        public Task<bool> UpdateStatusIfPendingAsync(long paymentId, string status, DateTime? paidAt)
        {
            bool updated = false;
            if (LastCreatedPayment != null && LastCreatedPayment.PaymentId == paymentId && LastCreatedPayment.Status == PaymentStatus.Pending)
            {
                LastCreatedPayment.Status = Enum.Parse<PaymentStatus>(status);
                LastCreatedPayment.PaidAt = paidAt;
                updated = true;
            }
            foreach (var p in StoredPayments.Values)
            {
                if (p.PaymentId == paymentId && p.Status == PaymentStatus.Pending)
                {
                    p.Status = Enum.Parse<PaymentStatus>(status);
                    p.PaidAt = paidAt;
                    updated = true;
                }
            }
            return Task.FromResult(updated);
        }

        public Task CancelPendingPaymentsForBookingAsync(long bookingId)
        {
            if (LastCreatedPayment != null && LastCreatedPayment.BookingId == bookingId && LastCreatedPayment.Status == PaymentStatus.Pending)
            {
                LastCreatedPayment.Status = PaymentStatus.Failed;
            }
            foreach (var p in StoredPayments.Values)
            {
                if (p.BookingId == bookingId && p.Status == PaymentStatus.Pending)
                {
                    p.Status = PaymentStatus.Failed;
                }
            }
            return Task.CompletedTask;
        }

        public Task<decimal> GetTotalPaidAmountAsync(long bookingId) => Task.FromResult(0m);

        public Task<BookingPaymentInfo?> GetBookingPaymentInfoAsync(long bookingId)
        {
            return Task.FromResult<BookingPaymentInfo?>(new BookingPaymentInfo
            {
                BookingId = bookingId,
                BookingStatus = "Pending",
                TotalAmount = 1000000m,
                DepositAmount = 300000m,
                RemainingAmount = 1000000m
            });
        }

        public Task UpdateBookingPaymentSummaryAsync(long bookingId, decimal totalPaid, decimal totalAmount) => Task.CompletedTask;

        public Task<BookingCustomerAccessInfo?> GetBookingCustomerAccessInfoAsync(long bookingId)
        {
            return Task.FromResult<BookingCustomerAccessInfo?>(new BookingCustomerAccessInfo
            {
                BookingId = bookingId,
                CustomerId = 10,
                BookingStatus = "Pending"
            });
        }

        public Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId) => Task.FromResult(true);
        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetCustomerPaymentHistoryAsync(long customerId, int page, int pageSize) => Task.FromResult(((IReadOnlyList<PaymentHistoryDto>)new List<PaymentHistoryDto>(), 0));
        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetBookingPaymentHistoryAsync(long bookingId, int page, int pageSize) => Task.FromResult(((IReadOnlyList<PaymentHistoryDto>)new List<PaymentHistoryDto>(), 0));
        public Task<(IReadOnlyList<PaymentHistoryDto> Items, int TotalCount)> GetStaffPaymentHistoryAsync(PaymentHistoryFilterRequest filter, long staffUserId, bool isAdmin) => Task.FromResult(((IReadOnlyList<PaymentHistoryDto>)new List<PaymentHistoryDto>(), 0));
    }

    private class FakeBookingRepo : IBookingRepository
    {
        public Task<Booking?> GetByIdAsync(long bookingId) => Task.FromResult<Booking?>(new Booking { BookingId = bookingId, BookingCode = $"BK{bookingId}" });
        public Task<Booking?> GetByIdWithDetailsAsync(long bookingId) => Task.FromResult<Booking?>(new Booking { BookingId = bookingId, BookingCode = $"BK{bookingId}" });
        public Task<Booking?> GetByCodeAsync(string bookingCode) => Task.FromResult<Booking?>(null);
        public Task<List<Booking>> GetListAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, int pageIndex, int pageSize, long? staffUserId = null) => Task.FromResult(new List<Booking>());
        public Task<int> GetCountAsync(long? customerId, string? status, string? paymentStatus, DateOnly? fromDate, DateOnly? toDate, long? staffUserId = null) => Task.FromResult(0);
        public Task<bool> IsRoomBookedAsync(long roomId, DateOnly checkIn, DateOnly checkOut, long? excludeBookingId = null) => Task.FromResult(false);
        public Task<bool> IsStaffAssignedToBookingAsync(long bookingId, long staffUserId) => Task.FromResult(true);
        public Task<List<int>> GetAssignedAreaIdsAsync(long staffUserId) => Task.FromResult(new List<int>());
        public Task AddAsync(Booking booking) => Task.CompletedTask;
        public Task<bool> TryReserveAsync(Booking booking) => Task.FromResult(true);
        public Task<bool> TrySaveReservedAsync(Booking booking) => Task.FromResult(true);
        public Task UpdateAsync(Booking booking) => Task.CompletedTask;
        public Task AddStatusHistoryAsync(BookingStatusHistory history) => Task.CompletedTask;
        public Task SaveChangesAsync() => Task.CompletedTask;
    }
}
