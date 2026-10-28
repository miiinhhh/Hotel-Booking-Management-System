using System.ComponentModel.DataAnnotations;
using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Services;

public sealed class DiscoveryService(IDiscoveryRepository repository, IContentAccess access)
{
    private static void Validate(HotelDiscoveryRequest request)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTimeOffset.UtcNow, "Asia/Bangkok").DateTime);
        if (!Validator.TryValidateObject(request, new ValidationContext(request), [], true) ||
            request.CheckIn < today || request.CheckOut <= request.CheckIn || request.CheckOut.DayNumber - request.CheckIn.DayNumber > 90 ||
            request.MinPrice > request.MaxPrice || ((long)request.Page - 1) * request.PageSize > int.MaxValue ||
            request.Sort is not ("price_asc" or "price_desc" or "name") || request.AmenityId <= 0)
            throw new DomainRuleException("Select valid dates (up to 90 nights), guests, rooms, prices and pagination.");
    }
    public Task<DiscoveryPage> SearchAsync(HotelDiscoveryRequest request, CancellationToken ct)
    { Validate(request); return repository.SearchAsync(request, ct); }
    public Task<HotelDiscoveryDetail> DetailAsync(int hotelId, HotelDiscoveryRequest request, CancellationToken ct)
    { Validate(request); return repository.DetailAsync(hotelId, request, ct); }
    public async Task SetPolicyAsync(long actor, int hotelId, HotelPolicyRequest request, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        if (request.CancellationPolicy?.Length > 2000) throw new DomainRuleException("Policy allows 2000 characters.");
        await repository.SetPolicyAsync(hotelId, request.CancellationPolicy?.Trim(), ct);
    }
    public Task<IReadOnlyList<HotelCardDto>> WishlistAsync(long userId, CancellationToken ct) => repository.WishlistAsync(userId, ct);
    public Task SetWishlistAsync(long userId, int hotelId, bool saved, CancellationToken ct) => repository.SetWishlistAsync(userId, hotelId, saved, ct);
    public async Task<BusinessReport> ReportAsync(long actor, ReportFilter filter, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        if (filter.From == default || filter.To <= filter.From || filter.To.DayNumber - filter.From.DayNumber > 366 || filter.HotelId <= 0)
            throw new DomainRuleException("Select a report interval [From, To) of 1–366 days and a valid hotel.");
        return BusinessReportCalculator.Calculate(filter, await repository.ReportAsync(filter, ct));
    }
}
