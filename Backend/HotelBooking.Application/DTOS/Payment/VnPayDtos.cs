namespace HotelBooking.Application.DTOs.Payment;

public class VnPaySettings
{
    public const string SectionName = "VnPay";

    public string TmnCode { get; set; } = string.Empty;
    public string HashSecret { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    public string ReturnUrl { get; set; } = "http://localhost:5131/api/payments/vnpay/return";
    public string FrontendReturnUrl { get; set; } = "http://localhost:5173/payment/vnpay-return";
    public string? IpnUrl { get; set; }
    public bool TestMode { get; set; } = true;
}

public class CreateVnPayPaymentRequest
{
    public long BookingId { get; set; }
    public string PaymentTarget { get; set; } = "Deposit"; // "Deposit" or "Full"
}

public class VnPayPaymentResponse
{
    public long PaymentId { get; set; }
    public long BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string TxnRef { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class VnPayCallbackResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public long BookingId { get; set; }
    public string BookingCode { get; set; } = string.Empty;
    public string TxnRef { get; set; } = string.Empty;
    public string? TransactionNo { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
}

public class VnPayIpnResponse
{
    public string RspCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public static VnPayIpnResponse Success() => new() { RspCode = "00", Message = "Confirm Success" };
    public static VnPayIpnResponse OrderNotFound() => new() { RspCode = "01", Message = "Order not found" };
    public static VnPayIpnResponse OrderAlreadyConfirmed() => new() { RspCode = "02", Message = "Order already confirmed" };
    public static VnPayIpnResponse InvalidAmount() => new() { RspCode = "04", Message = "Invalid amount" };
    public static VnPayIpnResponse InvalidChecksum() => new() { RspCode = "97", Message = "Invalid Checksum" };
    public static VnPayIpnResponse UnknownError(string message = "Unknown error") => new() { RspCode = "99", Message = message };
}
