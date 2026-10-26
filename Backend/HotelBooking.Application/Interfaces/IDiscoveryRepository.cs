using HotelBooking.Application.DTOs;

namespace HotelBooking.Application.Interfaces;

public interface IDiscoveryRepository
{
    Task<DiscoveryPage> SearchAsync(HotelDiscoveryRequest request, CancellationToken ct);
    Task<HotelDiscoveryDetail> DetailAsync(int hotelId, HotelDiscoveryRequest request, CancellationToken ct);
    Task SetPolicyAsync(int hotelId, string? policy, CancellationToken ct);
    Task<IReadOnlyList<HotelCardDto>> WishlistAsync(long userId, CancellationToken ct);
    Task SetWishlistAsync(long userId, int hotelId, bool saved, CancellationToken ct);
    Task<ReportSource> ReportAsync(ReportFilter filter, CancellationToken ct);
}
