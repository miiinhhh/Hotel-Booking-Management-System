namespace HotelBooking.Domain.Entities;

// Durable cleanup: a failed disk deletion can be retried after metadata commits.
public sealed class ImageFileDeletion
{
    public long Id { get; set; }
    public string StorageKey { get; set; } = "";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
