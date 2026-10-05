using System.ComponentModel.DataAnnotations;
using HotelBooking.Domain.Entities;
namespace HotelBooking.Application.Rooms;

public sealed record RoomTypeRequest(
    [Required, StringLength(100)] string Name,
    string? Description,
    [Range(typeof(decimal), "0", "9999999999999999.99")] decimal BasePrice,
    [Range(1, int.MaxValue)] int Capacity,
    [Range(1, int.MaxValue)] int NumberOfBeds);
public sealed record RoomRequest(
    [Range(1, int.MaxValue)] int RoomTypeId,
    [Required, StringLength(20)] string RoomNumber,
    [Range(0, int.MaxValue)] int Floor,
    RoomStatus Status,
    [StringLength(500)] string? Description);
public sealed record RoomTypeDto(int RoomTypeId, int HotelId, int AreaId, string Name, string? Description, decimal BasePrice, int Capacity, int NumberOfBeds, bool IsActive);
public sealed record RoomDto(long RoomId, int HotelId, int AreaId, int RoomTypeId, string RoomNumber, int Floor, RoomStatus Status, string? Description, bool IsActive, decimal Price, int Capacity);
public sealed class NotFoundException(string message) : Exception(message);
public sealed class ConflictException(string message) : Exception(message);

public interface IRoomRepository
{
    Task<bool> IsActiveHotelAsync(int hotelId, CancellationToken ct);
    Task<HotelArea?> FindAreaAsync(int areaId, CancellationToken ct);
    Task<RoomType?> FindTypeAsync(int id, CancellationToken ct);
    Task<Room?> FindRoomAsync(long id, CancellationToken ct);
    Task<IReadOnlyList<RoomType>> ListTypesAsync(int hotelId, CancellationToken ct);
    Task<IReadOnlyList<Room>> ListRoomsAsync(int hotelId, CancellationToken ct);
    Task<bool> TypeNameExistsAsync(int hotelId, int areaId, string name, int exceptId, CancellationToken ct);
    Task<bool> RoomNumberExistsAsync(int areaId, string number, long exceptId, CancellationToken ct);
    Task<bool> HasActiveRoomsAsync(int typeId, CancellationToken ct);
    void Add(RoomType type);
    void Add(Room room);
    Task SaveAsync(CancellationToken ct);
}

