using HotelBooking.Domain.Enums;

namespace HotelBooking.Domain.Entities;

public enum ReviewStatus { Visible, Hidden, Deleted }

public sealed class Review
{
    public long ReviewId { get; private set; }
    public long BookingId { get; private set; }
    public long CustomerId { get; private set; }
    public byte Rating { get; private set; }
    public string? Comment { get; private set; }
    public ReviewStatus Status { get; private set; } = ReviewStatus.Hidden;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; private set; }
    public Booking Booking { get; private set; } = null!;
    private Review() { }

    public Review(long bookingId, long customerId, BookingStatus bookingStatus, DateOnly checkOut, DateOnly today, int rating, string? comment)
    {
        if (bookingId <= 0 || customerId <= 0) throw new DomainRuleException("Invalid booking or customer.");
        EnsureCompleted(bookingStatus, checkOut, today);
        BookingId = bookingId; CustomerId = customerId;
        SetContent(rating, comment);
    }
    public static void EnsureCompleted(BookingStatus status, DateOnly checkOut, DateOnly today)
    {
        if (status != BookingStatus.Completed || checkOut > today)
            throw new DomainRuleException("Only a completed stay on or after its check-out date can be reviewed.");
    }
    public void Edit(int rating, string? comment)
    {
        if (Status == ReviewStatus.Deleted) throw new DomainRuleException("A deleted review cannot be edited.");
        SetContent(rating, comment);
        Status = ReviewStatus.Hidden; UpdatedAt = DateTime.UtcNow;
    }
    public void ChangeStatus(ReviewStatus status)
    {
        if (!Enum.IsDefined(status)) throw new DomainRuleException("Invalid review status.");
        if (Status == ReviewStatus.Deleted && status != ReviewStatus.Deleted)
            throw new DomainRuleException("A deleted review cannot be restored.");
        if (Status == status) return;
        Status = status; UpdatedAt = DateTime.UtcNow;
    }
    private void SetContent(int rating, string? comment)
    {
        if (rating is < 1 or > 5) throw new DomainRuleException("Rating must be between 1 and 5.");
        if (comment?.Length > 2000) throw new DomainRuleException("Comment cannot exceed 2000 characters.");
        Rating = (byte)rating; Comment = string.IsNullOrWhiteSpace(comment) ? null : comment.Trim();
    }
}

public sealed class ReviewModerationHistory
{
    public long HistoryId { get; private set; }
    public long ReviewId { get; private set; }
    public long ActorId { get; private set; }
    public ReviewStatus OldStatus { get; private set; }
    public ReviewStatus NewStatus { get; private set; }
    public string Action { get; private set; } = "";
    public string? Reason { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    private ReviewModerationHistory() { }
    public ReviewModerationHistory(long reviewId, long actorId, ReviewStatus oldStatus, ReviewStatus newStatus, string action, string? reason)
    {
        ReviewId = reviewId; ActorId = actorId; OldStatus = oldStatus; NewStatus = newStatus; Action = action; Reason = reason;
    }
}
