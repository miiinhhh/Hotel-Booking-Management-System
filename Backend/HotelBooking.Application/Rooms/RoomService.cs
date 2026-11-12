using HotelBooking.Application.Interfaces;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Rooms;

public sealed class RoomService(
    IRoomRepository repository,
    IRoomPriceHistoryRepository? priceHistoryRepository = null)
{
    private async Task ValidateArea(int hotelId, int areaId, CancellationToken ct)
    {
        if (!await repository.IsActiveHotelAsync(hotelId, ct)) throw new NotFoundException("Không tìm thấy khách sạn đang hoạt động.");
        var area = await repository.FindAreaAsync(areaId, ct);
        if (area is null || area.HotelId != hotelId || !area.IsActive) throw new NotFoundException("Không tìm thấy phân khu đang hoạt động trong khách sạn này.");
    }

    private async Task<RoomType> Type(int hotelId, int id, CancellationToken ct)
    {
        var type = await repository.FindTypeAsync(id, ct);
        return type is not null && type.HotelId == hotelId ? type : throw new NotFoundException("Không tìm thấy hạng phòng trong khách sạn này.");
    }

    private async Task<Room> Room(int hotelId, long id, CancellationToken ct)
    {
        var room = await repository.FindRoomAsync(id, ct);
        return room is not null && room.RoomType.HotelId == hotelId ? room : throw new NotFoundException("Không tìm thấy phòng trong khách sạn này.");
    }

    public async Task<IReadOnlyList<RoomTypeDto>> ListTypes(int hotelId, CancellationToken ct)
    {
        if (!await repository.HotelExistsAsync(hotelId, ct)) throw new NotFoundException("Không tìm thấy khách sạn.");
        return (await repository.ListTypesAsync(hotelId, ct)).Select(Map).ToList();
    }

    public async Task<RoomTypeDto> GetType(int hotelId, int id, CancellationToken ct) => Map(await Type(hotelId, id, ct));

    public async Task<RoomTypeDto> CreateType(int hotelId, int areaId, RoomTypeRequest request, CancellationToken ct, long? changedByUserId = null)
    {
        await ValidateArea(hotelId, areaId, ct);
        var type = new RoomType(hotelId, areaId, request.Name, request.Description, request.BasePrice, request.Capacity, request.NumberOfBeds);
        await UniqueType(type, ct);
        repository.Add(type);
        await repository.SaveAsync(ct);

        if (priceHistoryRepository != null)
        {
            await priceHistoryRepository.AddHistoryAsync(new RoomPriceHistory
            {
                RoomTypeId = type.RoomTypeId,
                Price = type.BasePrice,
                EffectiveFrom = DateTime.UtcNow,
                EffectiveTo = null,
                ChangedByUserId = changedByUserId ?? 1,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        return Map(type);
    }

    public async Task<RoomTypeDto> UpdateType(int hotelId, int id, RoomTypeRequest request, CancellationToken ct, long? changedByUserId = null)
    {
        var type = await Type(hotelId, id, ct);
        await ValidateArea(hotelId, type.AreaId, ct);
        if (!type.IsActive) throw new ConflictException("Hạng phòng đang bị vô hiệu hóa.");

        var oldPrice = type.BasePrice;
        var newPrice = request.BasePrice;

        type.Update(request.Name, request.Description, request.BasePrice, request.Capacity, request.NumberOfBeds);
        await UniqueType(type, ct);
        await repository.SaveAsync(ct);

        if (priceHistoryRepository != null && oldPrice != newPrice)
        {
            await priceHistoryRepository.AddHistoryAsync(new RoomPriceHistory
            {
                RoomTypeId = type.RoomTypeId,
                Price = newPrice,
                EffectiveFrom = DateTime.UtcNow,
                EffectiveTo = null,
                ChangedByUserId = changedByUserId ?? 1,
                CreatedAt = DateTime.UtcNow
            }, ct);
        }

        return Map(type);
    }

    private async Task UniqueType(RoomType type, CancellationToken ct)
    {
        if (await repository.TypeNameExistsAsync(type.HotelId, type.AreaId, type.RoomTypeName, type.RoomTypeId, ct)) throw new ConflictException("Tên hạng phòng đã tồn tại trong phân khu này.");
    }

    public async Task DeleteType(int hotelId, int id, CancellationToken ct)
    {
        var type = await Type(hotelId, id, ct);
        if (await repository.HasActiveRoomsAsync(id, ct)) throw new ConflictException("Hãy vô hiệu hóa các phòng vật lý trước khi vô hiệu hóa hạng phòng.");
        type.Deactivate(); await repository.SaveAsync(ct);
    }

    public async Task<RoomTypeDto> SetTypeStatus(int hotelId, int id, bool active, CancellationToken ct)
    {
        if (!active) { await DeleteType(hotelId, id, ct); return await GetType(hotelId, id, ct); }
        var type = await Type(hotelId, id, ct);
        await ValidateArea(hotelId, type.AreaId, ct);
        type.Activate(); await repository.SaveAsync(ct); return Map(type);
    }

    public async Task<IReadOnlyList<RoomDto>> ListRooms(int hotelId, CancellationToken ct) => (await repository.ListRoomsAsync(hotelId, ct)).Select(Map).ToList();

    public async Task<RoomDto> GetRoom(int hotelId, long id, CancellationToken ct) => Map(await Room(hotelId, id, ct));

    private async Task<RoomType> ValidType(int hotelId, int areaId, int id, CancellationToken ct)
    {
        await ValidateArea(hotelId, areaId, ct);
        var type = await Type(hotelId, id, ct);
        if (type.AreaId != areaId || !type.IsActive) throw new ConflictException("Hạng phòng phải đang hoạt động và thuộc đúng phân khu của phòng.");
        return type;
    }

    public async Task<RoomDto> CreateRoom(int hotelId, int areaId, RoomRequest request, CancellationToken ct)
    {
        var type = await ValidType(hotelId, areaId, request.RoomTypeId, ct);
        var room = new Room(request.RoomTypeId, areaId, request.RoomNumber, request.Floor, request.Status, request.Description);
        await UniqueRoom(room, ct); repository.Add(room); await repository.SaveAsync(ct); return Map(room, type);
    }

    public async Task<RoomDto> UpdateRoom(int hotelId, long id, RoomRequest request, CancellationToken ct)
    {
        var room = await Room(hotelId, id, ct);
        var type = await ValidType(hotelId, room.AreaId, request.RoomTypeId, ct);
        if (request.Status == RoomStatus.Inactive && room.IsActive)
            await EnsureCanDeactivateRoom(room, ct);
        room.Update(request.RoomTypeId, request.RoomNumber, request.Floor, request.Status, request.Description);
        await UniqueRoom(room, ct); await repository.SaveAsync(ct); return Map(room, type);
    }

    private async Task UniqueRoom(Room room, CancellationToken ct)
    {
        if (await repository.RoomNumberExistsAsync(room.AreaId, room.RoomNumber, room.RoomId, ct)) throw new ConflictException("Số phòng đã tồn tại trong phân khu này.");
    }

    public async Task DeleteRoom(int hotelId, long id, CancellationToken ct)
    {
        var room = await Room(hotelId, id, ct);
        if (!room.IsActive) return;
        await EnsureCanDeactivateRoom(room, ct);
        room.Deactivate();
        await repository.SaveAsync(ct);
    }

    private async Task EnsureCanDeactivateRoom(Room room, CancellationToken ct)
    {
        if (room.Status == RoomStatus.Occupied)
            throw new ConflictException($"Phòng {room.RoomNumber} đang có khách lưu trú nên chưa thể vô hiệu hóa.");

        var bookingCode = await repository.FindBlockingBookingCodeAsync(room.RoomId, DateOnly.FromDateTime(DateTime.UtcNow), ct);
        if (!string.IsNullOrWhiteSpace(bookingCode))
            throw new ConflictException($"Phòng {room.RoomNumber} đang thuộc booking {bookingCode} nên chưa thể vô hiệu hóa.");

        if (await repository.HasActiveEmergencyLockAsync(room.RoomId, DateTime.UtcNow, ct))
            throw new ConflictException($"Phòng {room.RoomNumber} đang có lệnh khóa bán chưa kết thúc. Hãy giải phóng khóa trước.");
    }

    private static RoomTypeDto Map(RoomType t) => new(t.RoomTypeId, t.HotelId, t.AreaId, t.RoomTypeName, t.Description, t.BasePrice, t.Capacity, t.NumberOfBeds, t.IsActive);
    private static RoomDto Map(Room r) => Map(r, r.RoomType);
    private static RoomDto Map(Room r, RoomType t) => new(r.RoomId, t.HotelId, r.AreaId, r.RoomTypeId, r.RoomNumber, r.Floor, r.Status, r.Description, r.IsActive, t.BasePrice, t.Capacity);
}
