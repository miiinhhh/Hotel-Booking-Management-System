using HotelBooking.Application.Reviews;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public sealed class ReviewRepository(HotelBookingDBContext db) : IReviewRepository
{
    public Task<bool> HotelExists(int hotelId, CancellationToken ct) => db.Set<InventoryHotel>().AnyAsync(x => x.HotelId == hotelId, ct);
    public async Task<ReviewStay?> Stay(long bookingId, CancellationToken ct)
    {
        var booking = await db.Bookings.AsNoTracking().SingleOrDefaultAsync(x => x.BookingId == bookingId, ct);
        if (booking is null) return null;
        var roomIds = await db.BookingDetails.Where(x => x.BookingId == bookingId).Select(x => x.RoomId).Distinct().ToArrayAsync(ct);
        var linked = await (from room in db.Set<InventoryRoom>()
                            join type in db.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
                            where roomIds.Contains(room.RoomId)
                            select new { room.RoomId, type.HotelId }).ToListAsync(ct);
        var hotels = linked.Select(x => x.HotelId).Distinct().ToArray();
        int? hotelId = roomIds.Length > 0 && linked.Count == roomIds.Length && hotels.Length == 1 ? hotels[0] : null;
        return new(booking.BookingId, booking.CustomerId, hotelId, booking.BookingStatus, booking.CheckOutDate);
    }
    public Task<Review?> Find(long reviewId, CancellationToken ct) => db.Set<Review>().SingleOrDefaultAsync(x => x.ReviewId == reviewId, ct);
    public Task<Review?> ForBooking(long bookingId, CancellationToken ct) => db.Set<Review>().SingleOrDefaultAsync(x => x.BookingId == bookingId, ct);
    public void Add(Review review) => db.Add(review);
    public void Audit(ReviewModerationHistory history) => db.Add(history);
    public async Task Save(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new ConflictException("The review was changed by another request. Reload it before trying again."); }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        { throw new ConflictException("This booking already has a review."); }
    }

    private IQueryable<long> RoomsInHotel(int hotelId) => from room in db.Set<InventoryRoom>()
        join type in db.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
        where type.HotelId == hotelId select room.RoomId;
    internal IQueryable<Review> InHotel(int hotelId)
    {
        var rooms = RoomsInHotel(hotelId);
        return db.Set<Review>().Where(r => r.Booking.BookingDetails.Any(d => rooms.Contains(d.RoomId)) &&
            !r.Booking.BookingDetails.Any(d => !rooms.Contains(d.RoomId)));
    }
    internal IQueryable<Review> Visible(int hotelId)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        return InHotel(hotelId).Where(r => r.Status == ReviewStatus.Visible && r.CustomerId == r.Booking.CustomerId &&
            r.Booking.BookingStatus == BookingStatus.Completed && r.Booking.CheckOutDate <= today);
    }
    public async Task<ReviewPage<PublicReviewDto>> Public(int hotelId, int page, int pageSize, CancellationToken ct)
    {
        var query = Visible(hotelId).AsNoTracking();
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.ReviewId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(x => new PublicReviewDto(x.ReviewId, x.Rating, x.Comment, x.CreatedAt, x.UpdatedAt)).ToListAsync(ct);
        return new(items, total, page, pageSize);
    }
    public async Task<ReviewPage<ReviewDto>> List(int? hotelId, long? customerId, ReviewStatus? status, int page, int pageSize, CancellationToken ct)
    {
        var query = (hotelId.HasValue ? InHotel(hotelId.Value) : db.Set<Review>()).AsNoTracking();
        if (customerId.HasValue) query = query.Where(x => x.CustomerId == customerId.Value);
        if (status.HasValue) query = query.Where(x => x.Status == status.Value);
        var total = await query.CountAsync(ct);
        var reviews = await query.OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.ReviewId).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var bookingIds = reviews.Select(x => x.BookingId).ToArray();
        var links = await (from detail in db.BookingDetails
                           join room in db.Set<InventoryRoom>() on detail.RoomId equals room.RoomId
                           join type in db.Set<InventoryType>() on room.RoomTypeId equals type.RoomTypeId
                           where bookingIds.Contains(detail.BookingId)
                           select new { detail.BookingId, type.HotelId }).Distinct().ToListAsync(ct);
        var hotelMap = links.GroupBy(x => x.BookingId).ToDictionary(g => g.Key, g => g.Count() == 1 ? (int?)g.First().HotelId : null);
        return new(reviews.Select(x => new ReviewDto(x.ReviewId, x.BookingId, x.CustomerId, hotelMap.GetValueOrDefault(x.BookingId), x.Rating, x.Comment, x.Status, x.CreatedAt, x.UpdatedAt)).ToArray(), total, page, pageSize);
    }
    public async Task<HotelRatingDto> Rating(int hotelId, CancellationToken ct)
    {
        // Aggregate a single snapshot of the visible ratings so average/count/distribution agree.
        var counts = await Visible(hotelId).AsNoTracking().GroupBy(x => x.Rating)
            .Select(g => new { Rating = (int)g.Key, Count = g.Count() }).ToListAsync(ct);
        var total = counts.Sum(x => x.Count);
        decimal? average = total == 0 ? null : decimal.Round(counts.Sum(x => (decimal)x.Rating * x.Count) / total, 2, MidpointRounding.AwayFromZero);
        return new(hotelId, total, average, Enumerable.Range(1, 5).Select(star => new RatingBucket(star, counts.SingleOrDefault(x => x.Rating == star)?.Count ?? 0)).ToArray());
    }
    public async Task<IReadOnlyList<ReviewHistoryDto>> History(long reviewId, CancellationToken ct) =>
        await db.Set<ReviewModerationHistory>().AsNoTracking().Where(x => x.ReviewId == reviewId).OrderBy(x => x.HistoryId)
            .Select(x => new ReviewHistoryDto(x.HistoryId, x.ActorId, x.OldStatus, x.NewStatus, x.Action, x.Reason, x.CreatedAt)).ToListAsync(ct);
}
