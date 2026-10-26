namespace HotelBooking.Domain.Entities;

public sealed class RoomEmergencyLock
{
    public long LockId { get; private set; }
    public Guid BatchId { get; private set; }
    public int HotelId { get; private set; }
    public long RoomId { get; private set; }
    public DateTime StartsAt { get; private set; }
    public DateTime EndsAt { get; private set; }
    public string Reason { get; private set; } = "";
    public long CreatedByUserId { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public bool IsReleased { get; private set; }
    public DateTime? ReleasedAt { get; private set; }
    public long? ReleasedByUserId { get; private set; }
    private RoomEmergencyLock() { }
    public RoomEmergencyLock(Guid batchId, int hotelId, long roomId, DateTimeOffset start, DateTimeOffset end, string reason, long actorId)
    {
        if (hotelId <= 0 || roomId <= 0 || actorId <= 0 || start >= end || string.IsNullOrWhiteSpace(reason) || reason.Trim().Length > 500)
            throw new DomainRuleException("Invalid room lock, time range or reason (1–500 characters).");
        BatchId = batchId; HotelId = hotelId; RoomId = roomId; StartsAt = start.UtcDateTime; EndsAt = end.UtcDateTime;
        Reason = reason.Trim(); CreatedByUserId = actorId; CreatedAt = DateTime.UtcNow;
    }
    public void Release(long actorId)
    {
        if (actorId <= 0) throw new DomainRuleException("Invalid actor.");
        if (IsReleased) return;
        IsReleased = true; ReleasedAt = DateTime.UtcNow; ReleasedByUserId = actorId;
    }
}
