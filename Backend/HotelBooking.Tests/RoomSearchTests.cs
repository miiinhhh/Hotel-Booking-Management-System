using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class RoomSearchTests
{
    private static HotelBookingDbContext Database()
    {
        var db = new HotelBookingDbContext(new DbContextOptionsBuilder<HotelBookingDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var hotel = new RoomHotel();
        db.Hotels.Add(hotel);
        db.Entry(hotel).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;
        var area = new HotelArea();
        db.HotelAreas.Add(area);
        db.Entry(area).Property(x => x.AreaId).CurrentValue = 1;
        db.Entry(area).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(area).Property(x => x.IsActive).CurrentValue = true;
        db.SaveChanges();
        return db;
    }

    private static Room AddRoom(HotelBookingDbContext db, string name, decimal price,
        string number, RoomStatus status = RoomStatus.Available)
    {
        var type = new RoomType(1, 1, name, null, price, 2, 1);
        db.RoomTypes.Add(type);
        db.SaveChanges();
        var room = new Room(type.RoomTypeId, 1, number, 1, status, null);
        db.Rooms.Add(room);
        db.SaveChanges();
        return room;
    }

    private static RoomSearchService Service(HotelBookingDbContext db) => new(new RoomSearchRepository(db));

    [Fact]
    public async Task Search_combines_trimmed_case_insensitive_name_and_inclusive_price_before_paging()
    {
        using var db = Database();
        AddRoom(db, "Deluxe", 500000, "101");
        AddRoom(db, "Deluxe Garden", 700000, "102");
        AddRoom(db, "Deluxe Suite", 900000, "103");
        AddRoom(db, "Standard", 600000, "104");
        var result = await Service(db).SearchAsync(1, new RoomSearchRequest
        {
            RoomTypeName = " dELuXe ", MinPrice = 500000, MaxPrice = 700000, PageSize = 1, PageNumber = 2
        }, default);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        var item = Assert.Single(result.Items);
        Assert.Equal("Deluxe Garden", item.RoomTypeName);
        Assert.Equal(700000, item.Price);
        Assert.Null(result.Message);
    }

    [Theory]
    [InlineData("room")]
    [InlineData("type")]
    [InlineData("area")]
    [InlineData("hotel")]
    public async Task Inactive_entities_are_never_exposed(string inactiveEntity)
    {
        using var db = Database();
        var room = AddRoom(db, "Deluxe", 500000, "101");
        switch (inactiveEntity)
        {
            case "room": db.Entry(room).Property(x => x.IsActive).CurrentValue = false; break;
            case "type": room.RoomType.Deactivate(); break;
            case "area": db.Entry(room.Area).Property(x => x.IsActive).CurrentValue = false; break;
            case "hotel": db.Entry(room.RoomType.Hotel).Property(x => x.IsActive).CurrentValue = false; break;
        }
        db.SaveChanges();
        var result = await Service(db).SearchAsync(1, new(), default);
        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
    }

    [Theory]
    [InlineData(RoomStatus.Occupied)]
    [InlineData(RoomStatus.Maintenance)]
    [InlineData(RoomStatus.Inactive)]
    public async Task Unavailable_statuses_are_excluded(RoomStatus status)
    {
        using var db = Database();
        AddRoom(db, "Deluxe", 500000, "101", status);
        Assert.Empty((await Service(db).SearchAsync(1, new(), default)).Items);
    }

    [Fact]
    public async Task Pagination_is_stable_even_when_room_numbers_match_and_keeps_total_on_empty_page()
    {
        using var db = Database();
        var first = AddRoom(db, "Deluxe", 500000, "101");
        var second = AddRoom(db, "Suite", 700000, "101");
        var service = Service(db);
        var page1 = await service.SearchAsync(1, new() { PageSize = 1 }, default);
        var page2 = await service.SearchAsync(1, new() { PageSize = 1, PageNumber = 2 }, default);
        var page3 = await service.SearchAsync(1, new() { PageSize = 1, PageNumber = 3 }, default);
        Assert.Equal(first.RoomId, Assert.Single(page1.Items).RoomId);
        Assert.Equal(second.RoomId, Assert.Single(page2.Items).RoomId);
        Assert.Empty(page3.Items);
        Assert.Equal(2, page3.TotalCount);
        Assert.Equal(2, page3.TotalPages);
        Assert.NotNull(page3.Message);
    }

    [Fact]
    public async Task Empty_or_hidden_hotel_and_no_matching_name_return_empty_results()
    {
        using var db = Database();
        AddRoom(db, "Deluxe", 500000, "101");
        var service = Service(db);
        foreach (var result in new[]
        {
            await service.SearchAsync(999, new(), default),
            await service.SearchAsync(1, new() { RoomTypeName = "No match" }, default)
        })
        {
            Assert.Empty(result.Items);
            Assert.Equal(0, result.TotalCount);
            Assert.Equal(0, result.TotalPages);
            Assert.NotNull(result.Message);
        }
        Assert.Single((await service.SearchAsync(1, new() { RoomTypeName = "  " }, default)).Items);
    }

    [Theory]
    [InlineData(500000, null, 2)]
    [InlineData(null, 500000, 2)]
    [InlineData(500000, 500000, 1)]
    public async Task Open_ended_and_equal_price_bounds_are_supported(int? min, int? max, int expected)
    {
        using var db = Database();
        AddRoom(db, "Free", 0, "101");
        AddRoom(db, "Deluxe", 500000, "102");
        AddRoom(db, "Suite", 700000, "103");
        var result = await Service(db).SearchAsync(1, new()
        {
            MinPrice = min.HasValue ? (decimal)min : null,
            MaxPrice = max.HasValue ? (decimal)max : null
        }, default);
        Assert.Equal(expected, result.TotalCount);
    }

    [Fact]
    public async Task Invalid_filters_are_rejected_in_application_without_accessing_database()
    {
        var service = new RoomSearchService(new NeverCalledRepository());
        foreach (var request in new RoomSearchRequest[]
        {
            new() { MinPrice = -1 }, new() { MaxPrice = -1 },
            new() { MinPrice = 2, MaxPrice = 1 }, new() { PageNumber = 0 },
            new() { PageSize = 0 }, new() { PageSize = 101 },
            new() { PageNumber = int.MaxValue, PageSize = 100 },
            new() { RoomTypeName = new string('a', 101) }
        })
            await Assert.ThrowsAsync<DomainRuleException>(() => service.SearchAsync(1, request, default));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.SearchAsync(0, new(), default));
    }

    private sealed class NeverCalledRepository : IRoomSearchRepository
    {
        public Task<(IReadOnlyList<RoomSearchItem> Items, int TotalCount)> SearchAsync(
            RoomSearchCriteria criteria, CancellationToken ct) => throw new InvalidOperationException("Repository must not be called.");
    }
}
