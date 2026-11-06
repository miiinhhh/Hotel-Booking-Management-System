using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.Application.DTOs.Payment;

namespace HotelBooking.Application.Interfaces;

public interface IVnPayService
{
    Task<VnPayPaymentResponse> CreatePaymentUrlAsync(
        CreateVnPayPaymentRequest request,
        long customerId,
        string clientIp,
        CancellationToken ct = default);

    Task<VnPayCallbackResultDto> ProcessReturnCallbackAsync(
        IDictionary<string, string> queryParams,
        CancellationToken ct = default);

    Task<VnPayIpnResponse> ProcessIpnAsync(
        IDictionary<string, string> queryParams,
        CancellationToken ct = default);

    Task<VnPayCallbackResultDto?> GetPaymentStatusByTxnRefAsync(
        string txnRef,
        long currentUserId,
        bool isAdmin,
        bool isStaff,
        CancellationToken ct = default);
}
