using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class RoomTests
{
    private static readonly CancellationToken Ct = CancellationToken.None;
    private static HotelBookingDbContext Database()
    {
        var db = new HotelBookingDbContext(new DbContextOptionsBuilder<HotelBookingDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var hotel = new Hotel();
        db.Hotels.Add(hotel);
        db.Entry(hotel).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;
        foreach (var id in new[] { 1, 2 })
        {
            var area = new HotelArea(); db.HotelAreas.Add(area);
            db.Entry(area).Property(x => x.AreaId).CurrentValue = id;
            db.Entry(area).Property(x => x.HotelId).CurrentValue = 1;
            db.Entry(area).Property(x => x.IsActive).CurrentValue = true;
        }
        db.SaveChanges(); return db;
    }
    private static RoomService Service(HotelBookingDbContext db) => new(new RoomRepository(db));
    private static RoomTypeRequest TypeRequest => new("Deluxe", null, 500000, 2, 1);
    private static RoomRequest Request(int type, string number = "101", RoomStatus status = RoomStatus.Available) => new(type, number, 1, status, null);

    [Theory]
    [InlineData(-1, 2, 1)]
    [InlineData(10, 0, 1)]
    [InlineData(10, 2, 0)]
    [InlineData(1.001, 2, 1)]
    public void RejectsInvalidType(decimal price, int capacity, int beds) => Assert.Throws<DomainRuleException>(() => new RoomType(1, 1, "Deluxe", null, price, capacity, beds));

    [Fact]
    public void OccupiedRoomCannotBeDeactivatedOrRenumbered()
    {
        var room = new Room(1, 1, "101", 1, RoomStatus.Occupied, null);
        Assert.Throws<DomainRuleException>(room.Deactivate);
        Assert.Throws<DomainRuleException>(() => room.Update(1, "101", 1, RoomStatus.Inactive, null));
        Assert.Throws<DomainRuleException>(() => room.Update(1, "102", 1, RoomStatus.Occupied, null));
    }
    [Fact]
    public async Task CrudPersistsPriceCapacityAndSoftDeletion()
    {
        using var db = Database(); var service = Service(db);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        var room = await service.CreateRoom(1, 1, Request(type.RoomTypeId), Ct);
        await service.UpdateType(1, type.RoomTypeId, TypeRequest with { BasePrice = 750000, Capacity = 3 }, Ct);
        db.ChangeTracker.Clear();
        var loaded = await service.GetRoom(1, room.RoomId, Ct);
        Assert.Equal(750000m, loaded.Price); Assert.Equal(3, loaded.Capacity);
        await service.UpdateRoom(1, room.RoomId, Request(type.RoomTypeId, "102", RoomStatus.Maintenance), Ct);
        await service.DeleteRoom(1, room.RoomId, Ct);
        await service.DeleteType(1, type.RoomTypeId, Ct);
        db.ChangeTracker.Clear();
        Assert.False((await service.GetRoom(1, room.RoomId, Ct)).IsActive);
        Assert.Equal(RoomStatus.Inactive, (await service.GetRoom(1, room.RoomId, Ct)).Status);
        Assert.False((await service.GetType(1, type.RoomTypeId, Ct)).IsActive);
    }
    [Fact]
    public async Task RejectsDuplicateNumbersIncludingInactiveRooms()
    {
        using var db = Database(); var service = Service(db);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        var room = await service.CreateRoom(1, 1, Request(type.RoomTypeId), Ct);
        await service.DeleteRoom(1, room.RoomId, Ct);
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateRoom(1, 1, Request(type.RoomTypeId, " 101 "), Ct));
    }
    [Fact]
    public async Task NumberCanRepeatAcrossAreasButTypeMustMatchArea()
    {
        using var db = Database(); var service = Service(db);
        var first = await service.CreateType(1, 1, TypeRequest, Ct);
        var second = await service.CreateType(1, 2, TypeRequest, Ct);
        await service.CreateRoom(1, 1, Request(first.RoomTypeId), Ct);
        await service.CreateRoom(1, 2, Request(second.RoomTypeId), Ct);
        Assert.Equal(2, (await service.ListRooms(1, Ct)).Count);
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateRoom(1, 2, Request(first.RoomTypeId, "102"), Ct));
    }
    [Fact]
    public async Task RejectsWrongHotelAndTypeDeletionWithActiveRooms()
    {
        using var db = Database(); var service = Service(db);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        var room = await service.CreateRoom(1, 1, Request(type.RoomTypeId), Ct);
        await Assert.ThrowsAsync<NotFoundException>(() => service.GetRoom(2, room.RoomId, Ct));
        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateType(2, type.RoomTypeId, TypeRequest, Ct));
        await Assert.ThrowsAsync<ConflictException>(() => service.DeleteType(1, type.RoomTypeId, Ct));
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateType(1, 1, TypeRequest with { Name = " Deluxe " }, Ct));
    }
}
