using HotelBooking.Domain.Entities;
namespace HotelBooking.Application.Rooms;

public sealed class RoomService(IRoomRepository repository)
{
    private async Task ValidateArea(int hotelId, int areaId, CancellationToken ct)
    {
        if (!await repository.IsActiveHotelAsync(hotelId, ct)) throw new NotFoundException("Active hotel not found.");
        var area = await repository.FindAreaAsync(areaId, ct);
        if (area is null || area.HotelId != hotelId || !area.IsActive) throw new NotFoundException("Active area in this hotel not found.");
    }
    private async Task<RoomType> Type(int hotelId, int id, CancellationToken ct)
    {
        var type = await repository.FindTypeAsync(id, ct);
        return type is not null && type.HotelId == hotelId ? type : throw new NotFoundException("Room type not found in this hotel.");
    }
    private async Task<Room> Room(int hotelId, long id, CancellationToken ct)
    {
        var room = await repository.FindRoomAsync(id, ct);
        return room is not null && room.RoomType.HotelId == hotelId ? room : throw new NotFoundException("Room not found in this hotel.");
    }
    public async Task<IReadOnlyList<RoomTypeDto>> ListTypes(int hotelId, CancellationToken ct) => (await repository.ListTypesAsync(hotelId, ct)).Select(Map).ToList();
    public async Task<RoomTypeDto> GetType(int hotelId, int id, CancellationToken ct) => Map(await Type(hotelId, id, ct));
    public async Task<RoomTypeDto> CreateType(int hotelId, int areaId, RoomTypeRequest request, CancellationToken ct)
    {
        await ValidateArea(hotelId, areaId, ct);
        var type = new RoomType(hotelId, areaId, request.Name, request.Description, request.BasePrice, request.Capacity, request.NumberOfBeds);
        await UniqueType(type, ct); repository.Add(type); await repository.SaveAsync(ct); return Map(type);
    }
    public async Task<RoomTypeDto> UpdateType(int hotelId, int id, RoomTypeRequest request, CancellationToken ct)
    {
        var type = await Type(hotelId, id, ct);
        await ValidateArea(hotelId, type.AreaId, ct);
        if (!type.IsActive) throw new ConflictException("Room type is inactive.");
        type.Update(request.Name, request.Description, request.BasePrice, request.Capacity, request.NumberOfBeds);
        await UniqueType(type, ct); await repository.SaveAsync(ct); return Map(type);
    }
    private async Task UniqueType(RoomType type, CancellationToken ct)
    {
        if (await repository.TypeNameExistsAsync(type.HotelId, type.AreaId, type.RoomTypeName, type.RoomTypeId, ct)) throw new ConflictException("Room type name already exists in this area.");
    }
    public async Task DeleteType(int hotelId, int id, CancellationToken ct)
    {
        var type = await Type(hotelId, id, ct);
        if (await repository.HasActiveRoomsAsync(id, ct)) throw new ConflictException("Deactivate rooms before deactivating their type.");
        type.Deactivate(); await repository.SaveAsync(ct);
    }
    public async Task<IReadOnlyList<RoomDto>> ListRooms(int hotelId, CancellationToken ct) => (await repository.ListRoomsAsync(hotelId, ct)).Select(Map).ToList();
    public async Task<RoomDto> GetRoom(int hotelId, long id, CancellationToken ct) => Map(await Room(hotelId, id, ct));
    private async Task<RoomType> ValidType(int hotelId, int areaId, int id, CancellationToken ct)
    {
        await ValidateArea(hotelId, areaId, ct);
        var type = await Type(hotelId, id, ct);
        if (type.AreaId != areaId || !type.IsActive) throw new ConflictException("Room type must be active and belong to the room area.");
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
        room.Update(request.RoomTypeId, request.RoomNumber, request.Floor, request.Status, request.Description);
        await UniqueRoom(room, ct); await repository.SaveAsync(ct); return Map(room, type);
    }
    private async Task UniqueRoom(Room room, CancellationToken ct)
    {
        if (await repository.RoomNumberExistsAsync(room.AreaId, room.RoomNumber, room.RoomId, ct)) throw new ConflictException("Room number already exists in this area.");
    }
    public async Task DeleteRoom(int hotelId, long id, CancellationToken ct)
    {
        var room = await Room(hotelId, id, ct); room.Deactivate(); await repository.SaveAsync(ct);
    }
    private static RoomTypeDto Map(RoomType t) => new(t.RoomTypeId, t.HotelId, t.AreaId, t.RoomTypeName, t.Description, t.BasePrice, t.Capacity, t.NumberOfBeds, t.IsActive);
    private static RoomDto Map(Room r) => Map(r, r.RoomType);
    private static RoomDto Map(Room r, RoomType t) => new(r.RoomId, t.HotelId, r.AreaId, r.RoomTypeId, r.RoomNumber, r.Floor, r.Status, r.Description, r.IsActive, t.BasePrice, t.Capacity);
}
