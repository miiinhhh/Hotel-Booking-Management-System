using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Reviews;

public sealed class ReviewService(IReviewRepository repository)
{
    private static void Page(int page, int pageSize)
    {
        if (page < 1 || pageSize is < 1 or > 100 || ((long)page - 1) * pageSize > int.MaxValue)
            throw new DomainRuleException("Page must be positive and pageSize must be between 1 and 100.");
    }
    private async Task Hotel(int hotelId, CancellationToken ct)
    {
        if (hotelId <= 0 || !await repository.HotelExists(hotelId, ct)) throw new NotFoundException("Hotel not found.");
    }
    private async Task<ReviewStay> OwnStay(long bookingId, long actorId, CancellationToken ct)
    {
        var stay = await repository.Stay(bookingId, ct) ?? throw new NotFoundException("Booking not found.");
        if (stay.CustomerId != actorId) throw new UnauthorizedAccessException("You can review only your own booking.");
        Review.EnsureCompleted(stay.Status, stay.CheckOut, DateOnly.FromDateTime(DateTime.UtcNow));
        if (stay.HotelId is null) throw new ConflictException("Booking must contain rooms belonging to exactly one hotel.");
        return stay;
    }
    private static ReviewDto Map(Review review, int? hotelId) => new(review.ReviewId, review.BookingId, review.CustomerId, hotelId, review.Rating, review.Comment, review.Status, review.CreatedAt, review.UpdatedAt);

    public async Task<ReviewDto> Create(long bookingId, long actorId, ReviewRequest request, CancellationToken ct)
    {
        var stay = await OwnStay(bookingId, actorId, ct);
        if (await repository.ForBooking(bookingId, ct) is not null) throw new ConflictException("This booking already has a review.");
        var review = new Review(bookingId, actorId, stay.Status, stay.CheckOut, DateOnly.FromDateTime(DateTime.UtcNow), request.Rating, request.Comment);
        repository.Add(review); await repository.Save(ct);
        return Map(review, stay.HotelId);
    }
    public async Task<ReviewDto> GetOwn(long bookingId, long actorId, CancellationToken ct)
    {
        var stay = await repository.Stay(bookingId, ct) ?? throw new NotFoundException("Booking not found.");
        if (stay.CustomerId != actorId) throw new UnauthorizedAccessException("You can read only your own review here.");
        var review = await repository.ForBooking(bookingId, ct) ?? throw new NotFoundException("Review not found.");
        if (review.CustomerId != actorId) throw new UnauthorizedAccessException("Review ownership mismatch.");
        return Map(review, stay.HotelId);
    }
    public async Task<ReviewDto> Edit(long bookingId, long actorId, ReviewRequest request, CancellationToken ct)
    {
        var stay = await OwnStay(bookingId, actorId, ct);
        var review = await repository.ForBooking(bookingId, ct) ?? throw new NotFoundException("Review not found.");
        if (review.CustomerId != actorId) throw new UnauthorizedAccessException("Review ownership mismatch.");
        if (review.Status == ReviewStatus.Deleted) throw new ConflictException("A deleted review cannot be edited.");
        var previous = review.Status;
        review.Edit(request.Rating, request.Comment);
        repository.Audit(new(review.ReviewId, actorId, previous, review.Status, "AuthorEdit", "Edited by the author; moderation required again."));
        await repository.Save(ct); return Map(review, stay.HotelId);
    }
    public async Task DeleteOwn(long bookingId, long actorId, CancellationToken ct)
    {
        var stay = await repository.Stay(bookingId, ct) ?? throw new NotFoundException("Booking not found.");
        if (stay.CustomerId != actorId) throw new UnauthorizedAccessException("You can remove only your own review.");
        var review = await repository.ForBooking(bookingId, ct) ?? throw new NotFoundException("Review not found.");
        if (review.CustomerId != actorId) throw new UnauthorizedAccessException("Review ownership mismatch.");
        if (review.Status == ReviewStatus.Deleted) return;
        var previous = review.Status; review.ChangeStatus(ReviewStatus.Deleted);
        repository.Audit(new(review.ReviewId, actorId, previous, review.Status, "AuthorDelete", "Removed by author."));
        await repository.Save(ct);
    }
    public async Task<ReviewPage<PublicReviewDto>> Public(int hotelId, int page, int pageSize, CancellationToken ct)
    {
        Page(page, pageSize); await Hotel(hotelId, ct); return await repository.Public(hotelId, page, pageSize, ct);
    }
    public async Task<HotelRatingDto> Rating(int hotelId, CancellationToken ct)
    {
        await Hotel(hotelId, ct); return await repository.Rating(hotelId, ct);
    }
    public Task<ReviewPage<ReviewDto>> Mine(long actorId, int page, int pageSize, CancellationToken ct)
    {
        Page(page, pageSize); return repository.List(null, actorId, null, page, pageSize, ct);
    }
    public async Task<ReviewPage<ReviewDto>> ModerationList(int hotelId, ReviewStatus? status, int page, int pageSize, CancellationToken ct)
    {
        Page(page, pageSize);
        if (status.HasValue && !Enum.IsDefined(status.Value)) throw new DomainRuleException("Invalid review status.");
        await Hotel(hotelId, ct); return await repository.List(hotelId, null, status, page, pageSize, ct);
    }
    public async Task<ReviewDto> Moderate(int hotelId, long reviewId, long actorId, ModerateReviewRequest request, CancellationToken ct)
    {
        var target = request.Status ?? throw new DomainRuleException("Status is required.");
        if (!Enum.IsDefined(target) || request.Reason?.Length > 500) throw new DomainRuleException("Invalid status or reason.");
        var review = await repository.Find(reviewId, ct) ?? throw new NotFoundException("Review not found.");
        var stay = await repository.Stay(review.BookingId, ct);
        if (stay?.HotelId != hotelId) throw new NotFoundException("Review not found in this hotel.");
        if (review.Status == ReviewStatus.Deleted && target != ReviewStatus.Deleted) throw new ConflictException("A deleted review cannot be restored.");
        if (target == ReviewStatus.Visible)
        {
            if (review.CustomerId != stay.CustomerId) throw new ConflictException("The review author does not match the booking owner.");
            Review.EnsureCompleted(stay.Status, stay.CheckOut, DateOnly.FromDateTime(DateTime.UtcNow));
        }
        if (target is ReviewStatus.Hidden or ReviewStatus.Deleted && string.IsNullOrWhiteSpace(request.Reason))
            throw new DomainRuleException("A moderation reason is required to hide or delete a review.");
        if (review.Status == target) return Map(review, hotelId);
        var previous = review.Status; review.ChangeStatus(target);
        repository.Audit(new(review.ReviewId, actorId, previous, target, "Moderation", request.Reason?.Trim()));
        await repository.Save(ct); return Map(review, hotelId);
    }
    public async Task<IReadOnlyList<ReviewHistoryDto>> History(int hotelId, long reviewId, CancellationToken ct)
    {
        var review = await repository.Find(reviewId, ct) ?? throw new NotFoundException("Review not found.");
        if ((await repository.Stay(review.BookingId, ct))?.HotelId != hotelId) throw new NotFoundException("Review not found in this hotel.");
        return await repository.History(reviewId, ct);
    }
}
