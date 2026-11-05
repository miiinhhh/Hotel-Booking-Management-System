using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Hotel = HotelBooking.Domain.Entities.RoomHotel;

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

    private class FakeRoomPriceHistoryRepository : HotelBooking.Application.Interfaces.IRoomPriceHistoryRepository
    {
        public List<RoomPriceHistory> Histories { get; } = new();

        public Task<IReadOnlyList<RoomPriceHistory>> GetHistoriesByRoomTypeAsync(int roomTypeId, CancellationToken ct = default)
        {
            var list = Histories.Where(h => h.RoomTypeId == roomTypeId).ToList();
            return Task.FromResult<IReadOnlyList<RoomPriceHistory>>(list);
        }

        public Task<RoomPriceHistory> AddHistoryAsync(RoomPriceHistory history, CancellationToken ct = default)
        {
            Histories.Add(history);
            return Task.FromResult(history);
        }

        public Task<Dictionary<long, (int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)>> GetRoomDetailsForPricingAsync(IEnumerable<long> roomIds, CancellationToken ct = default)
        {
            return Task.FromResult(new Dictionary<long, (int RoomTypeId, int HotelId, string RoomTypeName, decimal BasePrice)>());
        }

        public Task<(TimeOnly CheckInTime, TimeOnly CheckOutTime)?> GetHotelCheckInOutPolicyAsync(int hotelId, CancellationToken ct = default)
        {
            return Task.FromResult<(TimeOnly CheckInTime, TimeOnly CheckOutTime)?>(null);
        }
    }

    [Fact]
    public async Task TypeCanBeReactivatedButDeactivationWithActiveRoomsIsRejected()
    {
        using var db = Database(); var service = Service(db);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        Assert.False((await service.SetTypeStatus(1, type.RoomTypeId, false, Ct)).IsActive);
        Assert.True((await service.SetTypeStatus(1, type.RoomTypeId, true, Ct)).IsActive);
        await service.CreateRoom(1, 1, Request(type.RoomTypeId), Ct);
        await Assert.ThrowsAsync<ConflictException>(() => service.SetTypeStatus(1, type.RoomTypeId, false, Ct));
    }

    [Fact]
    public async Task TypeListDistinguishesMissingHotelFromEmptyHotel()
    {
        using var db = Database(); var service = Service(db);
        Assert.Empty(await service.ListTypes(1, Ct));
        await Assert.ThrowsAsync<NotFoundException>(() => service.ListTypes(999, Ct));
    }

    [Fact]
    public async Task TypeCrudPreservesHotelAndAreaAndUpdatesAllEditableFields()
    {
        using var db = Database(); var service = Service(db);
        var created = await service.CreateType(1, 1, TypeRequest with { Name = " Deluxe ", Description = "Original" }, Ct);
        var updated = await service.UpdateType(1, created.RoomTypeId,
            new RoomTypeRequest(" Suite ", "Updated description", 1250000.50m, 4, 2), Ct);
        db.ChangeTracker.Clear();
        var loaded = await service.GetType(1, created.RoomTypeId, Ct);
        Assert.Equal(updated, loaded);
        Assert.Equal(1, loaded.HotelId);
        Assert.Equal(1, loaded.AreaId);
        Assert.Equal("Suite", loaded.Name);
        Assert.Equal("Updated description", loaded.Description);
        Assert.Equal(1250000.50m, loaded.BasePrice);
        Assert.Equal(4, loaded.Capacity);
        Assert.Equal(2, loaded.NumberOfBeds);
        Assert.Single(await service.ListTypes(1, Ct));
    }

    [Fact]
    public async Task TypeCannotBeReadUpdatedOrDeletedThroughAnotherHotel()
    {
        using var db = Database(); var service = Service(db);
        var otherHotel = new Hotel(); db.Hotels.Add(otherHotel);
        db.Entry(otherHotel).Property(x => x.HotelId).CurrentValue = 2;
        db.Entry(otherHotel).Property(x => x.IsActive).CurrentValue = true;
        await db.SaveChangesAsync(Ct);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        await Assert.ThrowsAsync<NotFoundException>(() => service.GetType(2, type.RoomTypeId, Ct));
        await Assert.ThrowsAsync<NotFoundException>(() => service.UpdateType(2, type.RoomTypeId, TypeRequest, Ct));
        await Assert.ThrowsAsync<NotFoundException>(() => service.DeleteType(2, type.RoomTypeId, Ct));
        await Assert.ThrowsAsync<NotFoundException>(() => service.CreateType(2, 1, TypeRequest, Ct));
        Assert.Empty(await service.ListTypes(2, Ct));
        db.ChangeTracker.Clear();
        Assert.True((await service.GetType(1, type.RoomTypeId, Ct)).IsActive);
    }

    [Fact]
    public async Task DeactivatedTypeIsRetainedButCannotBeUpdatedOrAssignedToRooms()
    {
        using var db = Database(); var service = Service(db);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        await service.DeleteType(1, type.RoomTypeId, Ct);
        await service.DeleteType(1, type.RoomTypeId, Ct);
        db.ChangeTracker.Clear();
        Assert.False((await service.GetType(1, type.RoomTypeId, Ct)).IsActive);
        Assert.Single(await service.ListTypes(1, Ct));
        await Assert.ThrowsAsync<ConflictException>(() => service.UpdateType(1, type.RoomTypeId, TypeRequest, Ct));
        await Assert.ThrowsAsync<ConflictException>(() => service.CreateRoom(1, 1, Request(type.RoomTypeId), Ct));
    }

    [Fact]
    public async Task FailedTypeDeletionLeavesExistingRoomsAndTypeActive()
    {
        using var db = Database(); var service = Service(db);
        var type = await service.CreateType(1, 1, TypeRequest, Ct);
        var room = await service.CreateRoom(1, 1, Request(type.RoomTypeId), Ct);
        await Assert.ThrowsAsync<ConflictException>(() => service.DeleteType(1, type.RoomTypeId, Ct));
        db.ChangeTracker.Clear();
        Assert.True((await service.GetType(1, type.RoomTypeId, Ct)).IsActive);
        Assert.True((await service.GetRoom(1, room.RoomId, Ct)).IsActive);
    }

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

    [Fact]
    public async Task CreateType_AutomaticallyLogsInitialBasePriceToRoomPriceHistory()
    {
        using var db = Database();
        var fakePriceHistory = new FakeRoomPriceHistoryRepository();
        var service = new RoomService(new RoomRepository(db), fakePriceHistory);

        var created = await service.CreateType(1, 1, new RoomTypeRequest("Executive Suite", null, 800000, 2, 1), Ct, changedByUserId: 42);

        Assert.Single(fakePriceHistory.Histories);
        var entry = fakePriceHistory.Histories[0];
        Assert.Equal(created.RoomTypeId, entry.RoomTypeId);
        Assert.Equal(800000m, entry.Price);
        Assert.Equal(42, entry.ChangedByUserId);
        Assert.Null(entry.EffectiveTo);
        Assert.True(entry.EffectiveFrom <= DateTime.UtcNow);
    }

    [Fact]
    public async Task UpdateType_WhenBasePriceChanges_AutomaticallyLogsToRoomPriceHistory()
    {
        using var db = Database();
        var fakePriceHistory = new FakeRoomPriceHistoryRepository();
        var service = new RoomService(new RoomRepository(db), fakePriceHistory);

        var created = await service.CreateType(1, 1, new RoomTypeRequest("Executive Suite", null, 800000, 2, 1), Ct, changedByUserId: 42);
        fakePriceHistory.Histories.Clear(); // clear creation log

        var updated = await service.UpdateType(1, created.RoomTypeId,
            new RoomTypeRequest("Executive Suite", "Updated desc", 950000, 2, 1), Ct, changedByUserId: 99);

        Assert.Equal(950000m, updated.BasePrice);
        Assert.Single(fakePriceHistory.Histories);
        var entry = fakePriceHistory.Histories[0];
        Assert.Equal(created.RoomTypeId, entry.RoomTypeId);
        Assert.Equal(950000m, entry.Price);
        Assert.Equal(99, entry.ChangedByUserId);
        Assert.Null(entry.EffectiveTo);
        Assert.True(entry.EffectiveFrom <= DateTime.UtcNow);
    }

    [Fact]
    public async Task UpdateType_WhenBasePriceDoesNotChange_DoesNotLogToRoomPriceHistory()
    {
        using var db = Database();
        var fakePriceHistory = new FakeRoomPriceHistoryRepository();
        var service = new RoomService(new RoomRepository(db), fakePriceHistory);

        var created = await service.CreateType(1, 1, new RoomTypeRequest("Executive Suite", null, 800000, 2, 1), Ct, changedByUserId: 42);
        fakePriceHistory.Histories.Clear();

        // Only updating description and beds, but BasePrice remains 800000
        var updated = await service.UpdateType(1, created.RoomTypeId,
            new RoomTypeRequest("Executive Suite VIP", "New desc", 800000, 3, 2), Ct, changedByUserId: 99);

        Assert.Equal(800000m, updated.BasePrice);
        Assert.Empty(fakePriceHistory.Histories);
    }
}
