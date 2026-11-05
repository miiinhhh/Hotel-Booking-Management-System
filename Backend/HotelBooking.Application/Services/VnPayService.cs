using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.Application.Common;
using HotelBooking.Application.DTOs.Payment;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
namespace HotelBooking.Application.Services;

public class VnPayService : IVnPayService
{
    private readonly IPaymentRepository _paymentRepository;
    private readonly IBookingRepository _bookingRepository;
    private readonly VnPaySettings _settings;
    private readonly HttpClient _httpClient;

    public VnPayService(
        IPaymentRepository paymentRepository,
        IBookingRepository bookingRepository,
        VnPaySettings settings,
        HttpClient? httpClient = null)
    {
        _paymentRepository = paymentRepository;
        _bookingRepository = bookingRepository;
        _settings = settings;
        _httpClient = httpClient ?? new HttpClient();
    }

    public async Task<VnPayPaymentResponse> CreatePaymentUrlAsync(
        CreateVnPayPaymentRequest request,
        long customerId,
        string clientIp,
        CancellationToken ct = default)
    {
        if (request.BookingId <= 0)
        {
            throw new ArgumentException("BookingId must be greater than 0.");
        }

        var booking = await _paymentRepository.GetBookingPaymentInfoAsync(request.BookingId);
        if (booking == null)
        {
            throw new KeyNotFoundException($"Booking with ID {request.BookingId} was not found.");
        }

        var bookingAccess = await _paymentRepository.GetBookingCustomerAccessInfoAsync(request.BookingId)
            ?? throw new KeyNotFoundException("Booking access info not found.");

        if (bookingAccess.CustomerId != customerId)
        {
            throw new UnauthorizedAccessException("You do not have permission to initiate payment for this booking.");
        }

        if (booking.BookingStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot initiate payment for a cancelled booking.");
        }

        if (booking.BookingStatus.Equals("Expired", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot initiate payment for an expired booking.");
        }

        var totalPaid = await _paymentRepository.GetTotalPaidAmountAsync(request.BookingId);
        var remainingAmount = booking.TotalAmount - totalPaid;

        if (remainingAmount <= 0)
        {
            throw new InvalidOperationException("This booking has already been fully paid.");
        }

        decimal amountToPay;
        if (request.PaymentTarget?.Equals("Full", StringComparison.OrdinalIgnoreCase) == true)
        {
            amountToPay = remainingAmount;
        }
        else
        {
            // Default: Pay deposit amount if defined, otherwise pay remaining amount
            amountToPay = booking.DepositAmount > 0
                ? Math.Min(booking.DepositAmount, remainingAmount)
                : remainingAmount;
        }

        if (amountToPay <= 0)
        {
            throw new InvalidOperationException("Calculated payment amount must be greater than 0.");
        }

        // Cancel previous orphan pending payments for this booking to prevent duplicate pending states
        await _paymentRepository.CancelPendingPaymentsForBookingAsync(booking.BookingId);

        // Generate unique transaction reference with project prefix to avoid collisions with other projects
        var txnRef = $"STAYLUXE_{booking.BookingId}_{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";

        // Create pending payment transaction in database
        var payment = new Payment
        {
            BookingId = booking.BookingId,
            PaymentMethod = PaymentMethod.Deposit,
            PaymentType = PaymentType.Payment,
            Amount = amountToPay,
            Status = PaymentStatus.Pending,
            TransactionCode = txnRef,
            PaidAt = null,
            CreatedAt = DateTime.UtcNow
        };

        var paymentId = await _paymentRepository.CreateAsync(payment);

        // Build VNPay URL
        var vnpay = new VnPayLibrary();
        var now = DateTime.UtcNow.AddHours(7); // VN local time (UTC+7)

        vnpay.AddRequestData("vnp_Version", "2.1.0");
        vnpay.AddRequestData("vnp_Command", "pay");
        vnpay.AddRequestData("vnp_TmnCode", _settings.TmnCode);
        vnpay.AddRequestData("vnp_Amount", ((long)(amountToPay * 100)).ToString());
        vnpay.AddRequestData("vnp_CreateDate", now.ToString("yyyyMMddHHmmss"));
        vnpay.AddRequestData("vnp_CurrCode", "VND");
        vnpay.AddRequestData("vnp_IpAddr", string.IsNullOrWhiteSpace(clientIp) ? "127.0.0.1" : clientIp);
        vnpay.AddRequestData("vnp_Locale", "vn");
        vnpay.AddRequestData("vnp_OrderInfo", $"Thanh toan don {booking.BookingId} {txnRef}");
        vnpay.AddRequestData("vnp_OrderType", "hotel");
        vnpay.AddRequestData("vnp_ReturnUrl", _settings.ReturnUrl);
        vnpay.AddRequestData("vnp_TxnRef", txnRef);

        var paymentUrl = vnpay.CreateRequestUrl(_settings.BaseUrl, _settings.HashSecret);

        // Fetch booking code for response
        var bookingDetails = await _bookingRepository.GetByIdAsync(booking.BookingId);
        var bookingCode = bookingDetails?.BookingCode ?? $"BK{booking.BookingId}";

        return new VnPayPaymentResponse
        {
            PaymentId = paymentId,
            BookingId = booking.BookingId,
            BookingCode = bookingCode,
            TxnRef = txnRef,
            Amount = amountToPay,
            PaymentUrl = paymentUrl,
            CreatedAt = payment.CreatedAt
        };
    }

    public async Task<VnPayCallbackResultDto> ProcessReturnCallbackAsync(
        IDictionary<string, string> queryParams,
        CancellationToken ct = default)
    {
        var vnpay = new VnPayLibrary();
        foreach (var (key, value) in queryParams)
        {
            vnpay.AddResponseData(key, value);
        }

        var txnRef = vnpay.GetResponseData("vnp_TxnRef");
        var responseCode = vnpay.GetResponseData("vnp_ResponseCode");
        var transactionNo = vnpay.GetResponseData("vnp_TransactionNo");
        var rawAmount = vnpay.GetResponseData("vnp_Amount");

        decimal amount = 0m;
        if (long.TryParse(rawAmount, out var parsedAmount))
        {
            amount = parsedAmount / 100m;
        }

        var vnpSecureHash = vnpay.GetResponseData("vnp_SecureHash");
        if (string.IsNullOrWhiteSpace(vnpSecureHash) ||
            !vnpay.ValidateSignature(vnpSecureHash, _settings.HashSecret))
        {
            var paymentOnInvalid = !string.IsNullOrWhiteSpace(txnRef)
                ? await _paymentRepository.GetByTransactionCodeAsync(txnRef)
                : null;
            var bookingOnInvalid = paymentOnInvalid != null
                ? await _bookingRepository.GetByIdAsync(paymentOnInvalid.BookingId)
                : null;

            return new VnPayCallbackResultDto
            {
                Success = false,
                BookingId = paymentOnInvalid?.BookingId ?? 0,
                BookingCode = bookingOnInvalid?.BookingCode ?? "",
                TxnRef = txnRef,
                TransactionNo = transactionNo,
                Amount = amount,
                Message = "Chữ ký số bảo mật không hợp lệ (Invalid Checksum).",
                Status = "InvalidSignature"
            };
        }

        var payment = await _paymentRepository.GetByTransactionCodeAsync(txnRef);
        if (payment == null)
        {
            return new VnPayCallbackResultDto
            {
                Success = false,
                TxnRef = txnRef,
                TransactionNo = transactionNo,
                Amount = amount,
                Message = "Giao dịch không tồn tại trên hệ thống.",
                Status = "NotFound"
            };
        }

        var bookingDetails = await _bookingRepository.GetByIdAsync(payment.BookingId);
        var bookingCode = bookingDetails?.BookingCode ?? $"BK{payment.BookingId}";

        // Idempotency: If already marked Paid, return success immediately
        if (payment.Status == PaymentStatus.Paid)
        {
            return new VnPayCallbackResultDto
            {
                Success = true,
                BookingId = payment.BookingId,
                BookingCode = bookingCode,
                TxnRef = txnRef,
                TransactionNo = transactionNo,
                Amount = payment.Amount,
                Status = "Paid",
                PaidAt = payment.PaidAt,
                Message = "Giao dịch đã được ghi nhận thanh toán thành công."
            };
        }

        if (responseCode == "00")
        {
            var paidAt = DateTime.UtcNow;
            var updated = await _paymentRepository.UpdateStatusIfPendingAsync(payment.PaymentId, PaymentStatus.Paid.ToString(), paidAt);

            if (updated)
            {
                var totalPaid = await _paymentRepository.GetTotalPaidAmountAsync(payment.BookingId);
                var bookingInfo = await _paymentRepository.GetBookingPaymentInfoAsync(payment.BookingId);

                if (bookingInfo != null)
                {
                    await _paymentRepository.UpdateBookingPaymentSummaryAsync(
                        payment.BookingId,
                        totalPaid,
                        bookingInfo.TotalAmount);
                }
            }

            return new VnPayCallbackResultDto
            {
                Success = true,
                BookingId = payment.BookingId,
                BookingCode = bookingCode,
                TxnRef = txnRef,
                TransactionNo = transactionNo,
                Amount = payment.Amount,
                Status = "Paid",
                PaidAt = paidAt,
                Message = "Thanh toán thành công."
            };
        }
        else
        {
            await _paymentRepository.UpdateStatusIfPendingAsync(payment.PaymentId, PaymentStatus.Failed.ToString(), null);

            return new VnPayCallbackResultDto
            {
                Success = false,
                BookingId = payment.BookingId,
                BookingCode = bookingCode,
                TxnRef = txnRef,
                TransactionNo = transactionNo,
                Amount = payment.Amount,
                Status = "Failed",
                Message = $"Thanh toán không thành công hoặc bị hủy bỏ (Mã phản hồi: {responseCode})."
            };
        }
    }

    public async Task<VnPayIpnResponse> ProcessIpnAsync(
        IDictionary<string, string> queryParams,
        CancellationToken ct = default)
    {
        var vnpay = new VnPayLibrary();
        foreach (var (key, value) in queryParams)
        {
            vnpay.AddResponseData(key, value);
        }

        var txnRef = vnpay.GetResponseData("vnp_TxnRef");
        var responseCode = vnpay.GetResponseData("vnp_ResponseCode");
        var transactionNo = vnpay.GetResponseData("vnp_TransactionNo");
        var rawAmount = vnpay.GetResponseData("vnp_Amount");

        decimal amount = 0m;
        if (long.TryParse(rawAmount, out var parsedAmount))
        {
            amount = parsedAmount / 100m;
        }

        var vnpSecureHash = vnpay.GetResponseData("vnp_SecureHash");
        if (string.IsNullOrWhiteSpace(vnpSecureHash) ||
            !vnpay.ValidateSignature(vnpSecureHash, _settings.HashSecret))
        {
            return VnPayIpnResponse.InvalidChecksum();
        }

        var payment = await _paymentRepository.GetByTransactionCodeAsync(txnRef);
        if (payment == null)
        {
            return VnPayIpnResponse.OrderNotFound();
        }

        if (long.TryParse(rawAmount, out var ipnParsedAmount))
        {
            var expectedVnpAmount = (long)(payment.Amount * 100);
            if (ipnParsedAmount != expectedVnpAmount)
            {
                return VnPayIpnResponse.InvalidAmount();
            }
        }

        // Idempotency check: Already confirmed
        if (payment.Status == PaymentStatus.Paid)
        {
            return VnPayIpnResponse.OrderAlreadyConfirmed();
        }

        if (responseCode == "00")
        {
            var paidAt = DateTime.UtcNow;
            var updated = await _paymentRepository.UpdateStatusIfPendingAsync(payment.PaymentId, PaymentStatus.Paid.ToString(), paidAt);

            if (updated)
            {
                var totalPaid = await _paymentRepository.GetTotalPaidAmountAsync(payment.BookingId);
                var bookingInfo = await _paymentRepository.GetBookingPaymentInfoAsync(payment.BookingId);

                if (bookingInfo != null)
                {
                    await _paymentRepository.UpdateBookingPaymentSummaryAsync(
                        payment.BookingId,
                        totalPaid,
                        bookingInfo.TotalAmount);
                }
            }

            return VnPayIpnResponse.Success();
        }
        else
        {
            await _paymentRepository.UpdateStatusIfPendingAsync(payment.PaymentId, PaymentStatus.Failed.ToString(), null);
            return VnPayIpnResponse.Success();
        }
    }

    public async Task<VnPayCallbackResultDto?> GetPaymentStatusByTxnRefAsync(
        string txnRef,
        long currentUserId,
        bool isAdmin,
        bool isStaff,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(txnRef))
        {
            return null;
        }

        var payment = await _paymentRepository.GetByTransactionCodeAsync(txnRef);
        if (payment == null)
        {
            return null;
        }

        if (!isAdmin && !isStaff)
        {
            var bookingAccess = await _paymentRepository.GetBookingCustomerAccessInfoAsync(payment.BookingId);
            if (bookingAccess != null && bookingAccess.CustomerId != currentUserId)
            {
                throw new UnauthorizedAccessException("You do not have permission to view this payment transaction.");
            }
        }

        var bookingDetails = await _bookingRepository.GetByIdAsync(payment.BookingId);
        var bookingCode = bookingDetails?.BookingCode ?? $"BK{payment.BookingId}";

        return new VnPayCallbackResultDto
        {
            Success = payment.Status == PaymentStatus.Paid,
            BookingId = payment.BookingId,
            BookingCode = bookingCode,
            TxnRef = payment.TransactionCode ?? txnRef,
            TransactionNo = null,
            Amount = payment.Amount,
            Status = payment.Status.ToString(),
            PaidAt = payment.PaidAt,
            Message = payment.Status == PaymentStatus.Paid
                ? "Thanh toán thành công."
                : (payment.Status == PaymentStatus.Pending ? "Giao dịch đang chờ thanh toán." : "Giao dịch thất bại.")
        };
    }

    public async Task<VnPayRefundResultDto> RefundTransactionAsync(
        long bookingId,
        string createBy = "System",
        string clientIp = "127.0.0.1",
        CancellationToken ct = default)
    {
        if (bookingId <= 0)
        {
            return new VnPayRefundResultDto
            {
                Success = false,
                ResponseCode = "01",
                Message = "BookingId khong hop le.",
                BookingId = bookingId
            };
        }

        var payments = (await _paymentRepository.GetByBookingIdAsync(bookingId))?.ToList()
            ?? new List<Payment>();

        var originalPayment = payments.FirstOrDefault(p =>
            p.PaymentType == PaymentType.Payment &&
            p.Status == PaymentStatus.Paid);

        if (originalPayment == null || string.IsNullOrWhiteSpace(originalPayment.TransactionCode))
        {
            return new VnPayRefundResultDto
            {
                Success = false,
                ResponseCode = "01",
                Message = "Khong tim thay giao dich thanh toan truc tuyen thanh cong cua don de hoan tien.",
                BookingId = bookingId
            };
        }

        var refundPayment = payments.FirstOrDefault(p =>
            p.PaymentType == PaymentType.Refund &&
            p.Status == PaymentStatus.RefundPending)
            ?? payments.FirstOrDefault(p => p.PaymentType == PaymentType.Refund);

        if (refundPayment == null)
        {
            return new VnPayRefundResultDto
            {
                Success = false,
                ResponseCode = "01",
                Message = "Khong tim thay ban ghi hoan tien (Refund) cho don nay.",
                BookingId = bookingId,
                TxnRef = originalPayment.TransactionCode
            };
        }

        if (refundPayment.Status == PaymentStatus.Refunded)
        {
            return new VnPayRefundResultDto
            {
                Success = true,
                ResponseCode = "00",
                Message = "Giao dich da duoc hoan tien thanh cong truoc do.",
                BookingId = bookingId,
                TxnRef = originalPayment.TransactionCode,
                RefundAmount = refundPayment.Amount,
                RefundedAt = refundPayment.PaidAt
            };
        }

        var transactionType = refundPayment.Amount >= originalPayment.Amount ? "02" : "03"; // 02: Full, 03: Partial
        var requestId = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var version = "2.1.0";
        var command = "refund";
        var tmnCode = _settings.TmnCode;
        var originalTxnRef = originalPayment.TransactionCode;
        var amountInCents = (long)(refundPayment.Amount * 100);
        var amountStr = amountInCents.ToString();
        var orderInfo = $"Hoan tien don dat phong {bookingId} {originalTxnRef}";
        var transactionNo = "0";
        var originalTxnDate = (originalPayment.PaidAt ?? originalPayment.CreatedAt).AddHours(7).ToString("yyyyMMddHHmmss");
        var createDate = DateTime.UtcNow.AddHours(7).ToString("yyyyMMddHHmmss");
        var ipAddr = string.IsNullOrWhiteSpace(clientIp) ? "127.0.0.1" : clientIp;

        // Chuoi ky checksum Merchant WebAPI VNPay chuan:
        // vnp_RequestId|vnp_Version|vnp_Command|vnp_TmnCode|vnp_TransactionType|vnp_TxnRef|vnp_Amount|vnp_TransactionNo|vnp_TransactionDate|vnp_CreateBy|vnp_CreateDate|vnp_IpAddr|vnp_OrderInfo
        var hashRaw = $"{requestId}|{version}|{command}|{tmnCode}|{transactionType}|{originalTxnRef}|{amountStr}|{transactionNo}|{originalTxnDate}|{createBy}|{createDate}|{ipAddr}|{orderInfo}";
        var secureHash = VnPayLibrary.HmacSha512(_settings.HashSecret, hashRaw);

        var requestPayload = new Dictionary<string, object>
        {
            ["vnp_RequestId"] = requestId,
            ["vnp_Version"] = version,
            ["vnp_Command"] = command,
            ["vnp_TmnCode"] = tmnCode,
            ["vnp_TransactionType"] = transactionType,
            ["vnp_TxnRef"] = originalTxnRef,
            ["vnp_Amount"] = amountInCents,
            ["vnp_OrderInfo"] = orderInfo,
            ["vnp_TransactionNo"] = 0,
            ["vnp_TransactionDate"] = originalTxnDate,
            ["vnp_CreateBy"] = createBy,
            ["vnp_CreateDate"] = createDate,
            ["vnp_IpAddr"] = ipAddr,
            ["vnp_SecureHash"] = secureHash
        };

        try
        {
            var httpClient = _httpClient;
            var jsonString = JsonSerializer.Serialize(requestPayload);
            using var httpContent = JsonContent.Create(requestPayload);

            var apiUrl = !string.IsNullOrWhiteSpace(_settings.ApiUrl)
                ? _settings.ApiUrl
                : "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

            var response = await httpClient.PostAsync(apiUrl, httpContent, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            using var doc = JsonDocument.Parse(responseBody);
            var root = doc.RootElement;
            var responseCode = root.TryGetProperty("vnp_ResponseCode", out var rc) ? rc.GetString() ?? "" : "";
            var responseMessage = root.TryGetProperty("vnp_Message", out var rm) ? rm.GetString() ?? "" : "";
            var vnpTransactionNo = root.TryGetProperty("vnp_TransactionNo", out var tn) ? tn.GetString() : null;

            if (responseCode == "00")
            {
                var refundedAt = DateTime.UtcNow;
                await _paymentRepository.UpdateStatusAsync(refundPayment.PaymentId, PaymentStatus.Refunded.ToString(), refundedAt);

                return new VnPayRefundResultDto
                {
                    Success = true,
                    ResponseCode = responseCode,
                    Message = "Hoan tien qua VNPay thanh cong: " + responseMessage,
                    BookingId = bookingId,
                    TxnRef = originalTxnRef,
                    RefundAmount = refundPayment.Amount,
                    VnPayTransactionNo = vnpTransactionNo,
                    RefundedAt = refundedAt
                };
            }
            else
            {
                return new VnPayRefundResultDto
                {
                    Success = false,
                    ResponseCode = responseCode,
                    Message = $"VNPay tu choi hoan tien (Ma loi {responseCode}): {responseMessage}",
                    BookingId = bookingId,
                    TxnRef = originalTxnRef,
                    RefundAmount = refundPayment.Amount,
                    VnPayTransactionNo = vnpTransactionNo
                };
            }
        }
        catch (Exception ex)
        {
            return new VnPayRefundResultDto
            {
                Success = false,
                ResponseCode = "99",
                Message = "Loi ngoai le khi goi cong hoan tien VNPay: " + ex.Message,
                BookingId = bookingId,
                TxnRef = originalTxnRef,
                RefundAmount = refundPayment.Amount
            };
        }
    }
}
