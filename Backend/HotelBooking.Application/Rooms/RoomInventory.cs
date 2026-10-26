using System.ComponentModel.DataAnnotations;
using HotelBooking.Domain.Entities;
namespace HotelBooking.Application.Rooms;

public sealed record AvailabilityRequest(DateOnly CheckIn, DateOnly CheckOut);
public sealed record AvailableRoom
{
    public long RoomId { get; init; }
    public int HotelId { get; init; }
    public int AreaId { get; init; }
    public int RoomTypeId { get; init; }
    public string RoomTypeName { get; init; } = "";
    public string RoomNumber { get; init; } = "";
    public int Floor { get; init; }
    public decimal Price { get; init; }
    public int Capacity { get; init; }
}
public sealed record AvailabilityResult(DateOnly CheckIn, DateOnly CheckOut, IReadOnlyList<AvailableRoom> Rooms);
public sealed record CreateRoomLockRequest([Required, MinLength(1), MaxLength(100)] long[] RoomIds, DateTimeOffset StartsAt, DateTimeOffset EndsAt, [Required, StringLength(500)] string Reason);
public sealed record RoomLockDto(long LockId, Guid BatchId, int HotelId, long RoomId, DateTime StartsAt, DateTime EndsAt, string Reason, long CreatedByUserId, DateTime CreatedAt, string Status, DateTime? ReleasedAt, long? ReleasedByUserId);
public sealed class InventoryAccessException() : Exception("The room is outside your assigned area.");
public interface IRoomInventoryRepository
{
    Task<IReadOnlyList<AvailableRoom>> Available(int hotelId, DateOnly checkIn, DateOnly checkOut, CancellationToken ct);
    Task<IReadOnlyList<RoomLockDto>> CreateLocks(int hotelId, CreateRoomLockRequest request, long actorId, bool isAdmin, CancellationToken ct);
    Task<IReadOnlyList<RoomLockDto>> ListLocks(int hotelId, long actorId, bool isAdmin, CancellationToken ct);
    Task<RoomLockDto> Release(int hotelId, long lockId, long actorId, bool isAdmin, CancellationToken ct);
}
public sealed class RoomInventoryService(IRoomInventoryRepository repository)
{
    public async Task<AvailabilityResult> Available(int hotelId, AvailabilityRequest request, CancellationToken ct)
    {
        if (hotelId <= 0 || request.CheckIn < DateOnly.FromDateTime(DateTime.UtcNow) || request.CheckOut <= request.CheckIn)
            throw new DomainRuleException("Check-in must be today or later and check-out must follow check-in.");
        return new(request.CheckIn, request.CheckOut, await repository.Available(hotelId, request.CheckIn, request.CheckOut, ct));
    }
    public Task<IReadOnlyList<RoomLockDto>> CreateLocks(int hotelId, CreateRoomLockRequest request, long actorId, bool isAdmin, CancellationToken ct)
    {
        if (request.RoomIds is null || request.RoomIds.Length is < 1 or > 100 || request.RoomIds.Any(id => id <= 0) || request.RoomIds.Distinct().Count() != request.RoomIds.Length || request.StartsAt == default || request.StartsAt >= request.EndsAt || request.EndsAt <= DateTimeOffset.UtcNow || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 500)
            throw new DomainRuleException("Select 1–100 distinct rooms, a valid time range and a reason of up to 500 characters.");
        return repository.CreateLocks(hotelId, request, actorId, isAdmin, ct);
    }
    public Task<IReadOnlyList<RoomLockDto>> ListLocks(int hotelId, long actorId, bool isAdmin, CancellationToken ct) => repository.ListLocks(hotelId, actorId, isAdmin, ct);
    public Task<RoomLockDto> Release(int hotelId, long lockId, long actorId, bool isAdmin, CancellationToken ct) => repository.Release(hotelId, lockId, actorId, isAdmin, ct);
}
