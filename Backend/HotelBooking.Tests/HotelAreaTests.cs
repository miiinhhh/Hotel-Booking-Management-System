using HotelBooking.Application.Areas;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Hotel = HotelBooking.Domain.Entities.RoomHotel;

namespace HotelBooking.Tests;

public sealed class HotelAreaTests
{
    private static readonly CancellationToken Ct = CancellationToken.None;

    [Fact]
    public async Task CreateZoneAndBuilding_PreservesHierarchyAndAreaFields()
    {
        await using var db = Database();
        var service = Service(db);

        var zone = await service.CreateAsync(1, Request(" Central Zone ", "zone", floorCount: null), Ct);
        var building = await service.CreateAsync(
            1,
            Request("Tower A", "Building", zone.AreaId, "Guest rooms", "North side", 12),
            Ct);

        Assert.Equal("Central Zone", zone.AreaName);
        Assert.Equal("Zone", zone.AreaType);
        Assert.Null(zone.ParentAreaId);
        Assert.Equal("Building", building.AreaType);
        Assert.Equal(zone.AreaId, building.ParentAreaId);
        Assert.Equal(12, building.FloorCount);

        db.ChangeTracker.Clear();
        var areas = await service.ListAsync(1, includeInactive: false, Ct);
        Assert.Collection(
            areas,
            item => Assert.Equal(zone.AreaId, item.AreaId),
            item => Assert.Equal(building.AreaId, item.AreaId));
        Assert.Equal("Central Zone", areas[1].ParentAreaName);
    }

    [Fact]
    public async Task Create_RejectsDuplicateNameWithinHotel()
    {
        await using var db = Database();
        var service = Service(db);
        await service.CreateAsync(1, Request("Zone A", "Zone"), Ct);

        await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateAsync(1, Request("Zone A", "Zone"), Ct));
    }

    [Fact]
    public async Task CreateBuilding_RejectsParentFromAnotherHotelOrBuildingParent()
    {
        await using var db = Database(includeSecondHotel: true);
        var service = Service(db);
        var firstHotelZone = await service.CreateAsync(1, Request("Zone A", "Zone"), Ct);
        var secondHotelZone = await service.CreateAsync(2, Request("Zone B", "Zone"), Ct);
        var building = await service.CreateAsync(1, Request("Tower A", "Building", firstHotelZone.AreaId), Ct);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            service.CreateAsync(1, Request("Wrong Hotel", "Building", secondHotelZone.AreaId), Ct));
        await Assert.ThrowsAsync<ConflictException>(() =>
            service.CreateAsync(1, Request("Nested Building", "Building", building.AreaId), Ct));
        await Assert.ThrowsAsync<DomainRuleException>(() =>
            service.CreateAsync(1, Request("Missing Parent", "Building"), Ct));
    }

    [Fact]
    public async Task DeactivateZone_RequiresActiveChildrenToBeDeactivatedFirst()
    {
        await using var db = Database();
        var service = Service(db);
        var zone = await service.CreateAsync(1, Request("Zone A", "Zone"), Ct);
        var building = await service.CreateAsync(1, Request("Tower A", "Building", zone.AreaId), Ct);

        await Assert.ThrowsAsync<ConflictException>(() => service.DeactivateAsync(1, zone.AreaId, Ct));

        await service.DeactivateAsync(1, building.AreaId, Ct);
        await service.DeactivateAsync(1, zone.AreaId, Ct);

        db.ChangeTracker.Clear();
        Assert.False((await service.GetAsync(1, zone.AreaId, Ct)).IsActive);
        Assert.Empty(await service.ListAsync(1, includeInactive: false, Ct));
        Assert.Equal(2, (await service.ListAsync(1, includeInactive: true, Ct)).Count);
    }

    [Fact]
    public async Task DeactivateArea_RejectsActiveRoomTypesRoomsAndStaffAssignments()
    {
        await using var db = Database();
        var service = Service(db);
        var area = await service.CreateAsync(1, Request("Zone A", "Zone"), Ct);

        var roomType = new RoomType(1, area.AreaId, "Deluxe", null, 500000, 2, 1);
        db.RoomTypes.Add(roomType);
        await db.SaveChangesAsync(Ct);
        await Assert.ThrowsAsync<ConflictException>(() => service.DeactivateAsync(1, area.AreaId, Ct));

        roomType.Deactivate();
        var room = new Room(roomType.RoomTypeId, area.AreaId, "101", 1, RoomStatus.Available, null);
        db.Rooms.Add(room);
        await db.SaveChangesAsync(Ct);
        await Assert.ThrowsAsync<ConflictException>(() => service.DeactivateAsync(1, area.AreaId, Ct));

        room.Deactivate();
        db.StaffAreaAssignments.Add(new StaffAreaAssignment { UserId = 99, AreaId = area.AreaId, IsActive = true });
        await db.SaveChangesAsync(Ct);
        await Assert.ThrowsAsync<ConflictException>(() => service.DeactivateAsync(1, area.AreaId, Ct));
    }

    [Theory]
    [InlineData("", "Zone", null, null)]
    [InlineData("Area", "Floor", null, null)]
    [InlineData("Area", "Zone", 1, null)]
    [InlineData("Area", "Building", null, null)]
    public void Entity_RejectsInvalidSchemaValues(string name, string type, int? parentId, int? floorCount)
    {
        Assert.Throws<DomainRuleException>(() =>
            new HotelArea(1, name, type, parentId, null, null, floorCount));
    }

    private static HotelAreaService Service(HotelBookingDbContext db) =>
        new(new HotelAreaRepository(db));

    private static HotelAreaRequest Request(
        string name,
        string type,
        int? parentAreaId = null,
        string? description = null,
        string? location = null,
        int? floorCount = null,
        bool isActive = true) =>
        new(name, type, parentAreaId, description, location, floorCount, isActive);

    private static HotelBookingDbContext Database(bool includeSecondHotel = false)
    {
        var options = new DbContextOptionsBuilder<HotelBookingDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new HotelBookingDbContext(options);

        AddHotel(db, 1);
        if (includeSecondHotel) AddHotel(db, 2);
        db.SaveChanges();
        return db;
    }

    private static void AddHotel(HotelBookingDbContext db, int hotelId)
    {
        var hotel = new Hotel();
        db.Hotels.Add(hotel);
        db.Entry(hotel).Property(item => item.HotelId).CurrentValue = hotelId;
        db.Entry(hotel).Property(item => item.IsActive).CurrentValue = true;
    }
}
