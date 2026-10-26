using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using ContentDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using HotelDb = HotelBooking.Infrastructure.Persistence.HotelDbContext;

namespace HotelBooking.Infrastructure.Repositories;

public sealed class ReportPayment
{
    public long PaymentId { get; set; }
    public long BookingId { get; set; }
    public string PaymentType { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime? PaidAt { get; set; }
}

public sealed class DiscoveryRepository(HotelDb hotels, ContentDb content, HotelBookingDBContext bookings) : IDiscoveryRepository
{
    private static ImageDto Map(IPropertyImage i) => new(i.ImageId, i.ImageUrl, i.AltText, i.DisplayOrder, i.IsPrimary,
        i.CreatedAt, i.OriginalFileName, i.ContentType, i.FileSize, i.Width, i.Height);
    private static AmenityDto Map(Amenity a) => new(a.AmenityId, a.AmenityName, a.Description, a.IsActive);
    public async Task<DiscoveryPage> SearchAsync(HotelDiscoveryRequest request, CancellationToken ct)
    {
        var query = hotels.Hotels.AsNoTracking().Where(h => h.IsActive);
        if (!string.IsNullOrWhiteSpace(request.Location))
        {
            var location = request.Location.Trim().ToUpperInvariant();
            query = query.Where(h => (h.City + " " + h.Address + " " + h.HotelName).ToUpper().Contains(location));
        }
        var candidates = await query.OrderBy(h => h.HotelId).ToListAsync(ct);
        var ids = candidates.Select(h => h.HotelId).ToArray();
        var availableQuery = new RoomInventoryRepository(bookings).AllAvailabilityQuery(request.CheckIn, request.CheckOut)
            .Where(r => ids.Contains(r.HotelId));
        if (!string.IsNullOrWhiteSpace(request.RoomTypeName))
        {
            var name = request.RoomTypeName.Trim().ToUpperInvariant();
            availableQuery = availableQuery.Where(r => r.RoomTypeName.ToUpper().Contains(name));
        }
        if (request.MinPrice is { } min) availableQuery = availableQuery.Where(r => r.Price >= min);
        if (request.MaxPrice is { } max) availableQuery = availableQuery.Where(r => r.Price <= max);
        var available = await availableQuery.ToListAsync(ct);
        var groups = available.GroupBy(r => new { r.HotelId, r.RoomTypeId })
            .Where(g => g.Count() >= request.Rooms && (long)g.First().Capacity * request.Rooms >= request.Adults + request.Children)
            .Select(g => new { Room = g.First(), Count = g.Count() }).ToList();
        var images = await content.HotelImages.AsNoTracking().Where(i => ids.Contains(i.HotelId) && i.IsPrimary)
            .ToDictionaryAsync(i => i.HotelId, i => i.ImageUrl, ct);
        var allowedAmenities = request.AmenityId is { } amenity
            ? (await content.HotelAmenities.Where(x => x.AmenityId == amenity && x.Amenity.IsActive).Select(x => x.HotelId).ToListAsync(ct)).ToHashSet()
            : null;
        var cards = candidates.Where(h => allowedAmenities is null || allowedAmenities.Contains(h.HotelId)).Select(h =>
        {
            var best = groups.Where(g => g.Room.HotelId == h.HotelId).OrderBy(g => g.Room.Price).ThenBy(g => g.Room.RoomTypeId).FirstOrDefault();
            return best is null ? null : new HotelCardDto(h.HotelId, h.HotelName, h.Address, h.City,
                images.GetValueOrDefault(h.HotelId), best.Room.RoomTypeName, best.Room.Price, best.Count, best.Room.Capacity);
        }).OfType<HotelCardDto>();
        cards = request.Sort switch
        {
            "price_desc" => cards.OrderByDescending(h => h.PricePerNight).ThenBy(h => h.HotelId),
            "name" => cards.OrderBy(h => h.Name).ThenBy(h => h.HotelId),
            _ => cards.OrderBy(h => h.PricePerNight).ThenBy(h => h.HotelId)
        };
        var all = cards.ToList();
        var items = all.Skip((request.Page - 1) * request.PageSize).Take(request.PageSize).ToList();
        return new(items, all.Count, request.Page, request.PageSize, (int)(((long)all.Count + request.PageSize - 1) / request.PageSize),
            items.Count == 0 ? "Không tìm thấy khách sạn phù hợp. Hãy đổi ngày, khu vực hoặc số khách/phòng." : null);
    }
    public async Task<HotelDiscoveryDetail> DetailAsync(int hotelId, HotelDiscoveryRequest request, CancellationToken ct)
    {
        var hotel = await hotels.Hotels.AsNoTracking().SingleOrDefaultAsync(h => h.HotelId == hotelId && h.IsActive, ct)
            ?? throw new NotFoundException("Active hotel not found.");
        var available = await new RoomInventoryRepository(bookings).Available(hotelId, request.CheckIn, request.CheckOut, ct);
        var roomIds = available.Select(r => r.RoomId).ToArray();
        var roomImages = await content.RoomImages.AsNoTracking().Where(x => roomIds.Contains(x.RoomId) && x.IsPrimary).ToDictionaryAsync(x => x.RoomId, x => x.ImageUrl, ct);
        var roomAmenities = await content.RoomAmenities.AsNoTracking().Include(x => x.Amenity)
            .Where(x => roomIds.Contains(x.RoomId) && x.Amenity.IsActive).ToListAsync(ct);
        var amenities = await content.HotelAmenities.AsNoTracking().Where(x => x.HotelId == hotelId && x.Amenity.IsActive).Select(x => x.Amenity).ToListAsync(ct);
        var images = await content.HotelImages.AsNoTracking().Where(x => x.HotelId == hotelId).OrderBy(x => x.DisplayOrder).ThenBy(x => x.ImageId).ToListAsync(ct);
        var policy = await content.Set<HotelDiscoverySettings>().AsNoTracking().SingleOrDefaultAsync(x => x.HotelId == hotelId, ct);
        return new(hotelId, hotel.HotelName, hotel.Address, hotel.City, hotel.Description,
            new(hotel.CheckInTime.ToString("HH:mm"), hotel.CheckOutTime.ToString("HH:mm"), policy?.CancellationPolicy),
            images.Select(Map).ToList(), amenities.Select(Map).ToList(),
            available.Select(r => new DiscoveryRoom(r.RoomId, r.RoomTypeId, r.RoomTypeName, r.RoomNumber, r.Floor, r.Price, r.Capacity,
                roomImages.GetValueOrDefault(r.RoomId), roomAmenities.Where(x => x.RoomId == r.RoomId).Select(x => Map(x.Amenity)).ToList())).ToList(), request.CheckIn, request.CheckOut);
    }
    public async Task SetPolicyAsync(int hotelId, string? policy, CancellationToken ct)
    {
        if (!await content.Hotels.AnyAsync(x => x.HotelId == hotelId, ct)) throw new NotFoundException("Hotel not found.");
        var settings = await content.Set<HotelDiscoverySettings>().FindAsync([hotelId], ct);
        if (settings is null) { settings = new() { HotelId = hotelId }; content.Add(settings); }
        settings.CancellationPolicy = string.IsNullOrWhiteSpace(policy) ? null : policy;
        await content.SaveChangesAsync(ct);
    }
    public async Task<IReadOnlyList<HotelCardDto>> WishlistAsync(long userId, CancellationToken ct)
    {
        var ids = await content.Set<HotelWishlist>().Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt).Select(x => x.HotelId).ToListAsync(ct);
        var data = await hotels.Hotels.AsNoTracking().Where(x => ids.Contains(x.HotelId) && x.IsActive).ToListAsync(ct);
        var images = await content.HotelImages.AsNoTracking().Where(x => ids.Contains(x.HotelId) && x.IsPrimary).ToDictionaryAsync(x => x.HotelId, x => x.ImageUrl, ct);
        // Wishlist is not an availability promise; pricing is resolved only by a dated search.
        return ids.Join(data, x => x, h => h.HotelId, (_, h) => new HotelCardDto(h.HotelId, h.HotelName, h.Address, h.City,
            images.GetValueOrDefault(h.HotelId), "", 0, 0, 0)).ToList();
    }
    public async Task SetWishlistAsync(long userId, int hotelId, bool saved, CancellationToken ct)
    {
        if (saved && !await hotels.Hotels.AnyAsync(x => x.HotelId == hotelId && x.IsActive, ct)) throw new NotFoundException("Hotel not found.");
        var item = await content.Set<HotelWishlist>().FindAsync([userId, hotelId], ct);
        if (saved && item is null) content.Add(new HotelWishlist { UserId = userId, HotelId = hotelId });
        if (!saved && item is not null) content.Remove(item);
        try { await content.SaveChangesAsync(ct); }
        catch (DbUpdateException ex) when (saved && ex.InnerException is SqlException { Number: 2601 or 2627 })
        { content.ChangeTracker.Clear(); } // Concurrent save of the same pair is idempotent.
    }
    public async Task<ReportSource> ReportAsync(ReportFilter filter, CancellationToken ct)
    {
        if (filter.HotelId is { } hotelId && !await hotels.Hotels.AnyAsync(x => x.HotelId == hotelId, ct)) throw new NotFoundException("Hotel not found.");
        var rooms = await (from room in bookings.Set<InventoryRoom>().AsNoTracking()
                           join type in bookings.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
                           join area in bookings.Set<InventoryArea>() on room.AreaId equals area.AreaId
                           join hotel in bookings.Set<InventoryHotel>() on type.HotelId equals hotel.HotelId
                           where room.IsActive && type.IsActive && area.IsActive && hotel.IsActive && room.Status != "Inactive" && room.Status != "Maintenance"
                           where room.AreaId == type.AreaId && area.HotelId == type.HotelId && (!filter.HotelId.HasValue || type.HotelId == filter.HotelId)
                           select room.RoomId).ToListAsync(ct);
        var scopedRoomIds = await (from room in bookings.Set<InventoryRoom>()
                                   join type in bookings.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
                                   where !filter.HotelId.HasValue || type.HotelId == filter.HotelId
                                   select room.RoomId).ToListAsync(ct);
        var scopedBookings = bookings.Bookings.AsNoTracking().Where(b => b.BookingDetails.Any(d => scopedRoomIds.Contains(d.RoomId)));
        var start = filter.From.ToDateTime(TimeOnly.MinValue);
        var end = filter.To.ToDateTime(TimeOnly.MinValue);
        var created = await scopedBookings.Where(b => b.CreatedAt >= start && b.CreatedAt < end).Select(b => new { b.CreatedAt, b.BookingStatus }).ToListAsync(ct);
        var payments = await bookings.Set<ReportPayment>().AsNoTracking().Where(p => p.PaidAt >= start && p.PaidAt < end &&
            ((p.PaymentType == "Payment" && p.Status == "Paid") || (p.PaymentType == "Refund" && (p.Status == "Paid" || p.Status == "Refunded"))) && scopedBookings.Any(b => b.BookingId == p.BookingId)).ToListAsync(ct);
        var stays = await bookings.BookingDetails.AsNoTracking().Where(d => rooms.Contains(d.RoomId) &&
            d.Booking.CheckInDate < filter.To && d.Booking.CheckOutDate > filter.From &&
            (d.Booking.BookingStatus == BookingStatus.Confirmed || d.Booking.BookingStatus == BookingStatus.CheckedIn ||
             d.Booking.BookingStatus == BookingStatus.CheckedOut || d.Booking.BookingStatus == BookingStatus.Completed))
            .Select(d => new { d.RoomId, d.Booking.CheckInDate, d.Booking.CheckOutDate }).ToListAsync(ct);
        var locks = await bookings.Set<RoomEmergencyLock>().AsNoTracking().Where(x => rooms.Contains(x.RoomId) && !x.IsReleased && x.StartsAt < end && x.EndsAt > start).ToListAsync(ct);
        return new ReportSource(rooms, created.Select(b => new ReportBooking(b.CreatedAt, b.BookingStatus == BookingStatus.Cancelled)).ToList(),
            payments.Select(p => new ReportReceipt(p.PaidAt!.Value, p.PaymentType == "Refund" ? -p.Amount : p.Amount)).ToList(),
            stays.Select(s => new ReportStay(s.RoomId, s.CheckInDate, s.CheckOutDate)).ToList(),
            locks.Select(l => new ReportLock(l.RoomId, l.StartsAt, l.EndsAt)).ToList());
    }
}
