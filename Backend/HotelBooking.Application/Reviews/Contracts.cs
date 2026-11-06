using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;

namespace HotelBooking.Application.Reviews;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ReviewRequest([Range(1, 5)] int Rating, [StringLength(2000)] string? Comment);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record ModerateReviewRequest([Required] ReviewStatus? Status, [StringLength(500)] string? Reason);
public sealed record ReviewStay(long BookingId, long CustomerId, int? HotelId, BookingStatus Status, DateOnly CheckOut);
public sealed record ReviewDto(long ReviewId, long BookingId, long CustomerId, int? HotelId, byte Rating, string? Comment, ReviewStatus Status, DateTime CreatedAt, DateTime? UpdatedAt);
public sealed record PublicReviewDto(long ReviewId, byte Rating, string? Comment, DateTime CreatedAt, DateTime? UpdatedAt);
public sealed record ReviewPage<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);
public sealed record RatingBucket(int Rating, int Count);
public sealed record HotelRatingDto(int HotelId, int TotalReviews, decimal? AverageRating, IReadOnlyList<RatingBucket> Distribution);
public sealed record ReviewHistoryDto(long HistoryId, long ActorId, ReviewStatus OldStatus, ReviewStatus NewStatus, string Action, string? Reason, DateTime CreatedAt);

public interface IReviewRepository
{
    Task<bool> HotelExists(int hotelId, CancellationToken ct);
    Task<ReviewStay?> Stay(long bookingId, CancellationToken ct);
    Task<Review?> Find(long reviewId, CancellationToken ct);
    Task<Review?> ForBooking(long bookingId, CancellationToken ct);
    void Add(Review review);
    void Audit(ReviewModerationHistory history);
    Task Save(CancellationToken ct);
    Task<ReviewPage<PublicReviewDto>> Public(int hotelId, int page, int pageSize, CancellationToken ct);
    Task<ReviewPage<ReviewDto>> List(int? hotelId, long? customerId, ReviewStatus? status, int page, int pageSize, CancellationToken ct);
    Task<HotelRatingDto> Rating(int hotelId, CancellationToken ct);
    Task<IReadOnlyList<ReviewHistoryDto>> History(long reviewId, CancellationToken ct);
}
