using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Persistence;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;
using BookingDb = HotelBooking.Infrastructure.Data.HotelBookingDBContext;
using ContentDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Tests;

public sealed class DiscoveryTests
{
    private sealed class Fixture : IDisposable
    {
        public HotelDbContext Hotels { get; } = new(new DbContextOptionsBuilder<HotelDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public ContentDb Content { get; } = new(new DbContextOptionsBuilder<ContentDb>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public BookingDb Bookings { get; } = new(new DbContextOptionsBuilder<BookingDb>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public DateOnly Start { get; } = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3);
        public DiscoveryRepository Repository => new(Hotels, Content, Bookings);
        public DiscoveryService Service => new(Repository, new Access());
        public HotelDiscoveryRequest Request => new() { CheckIn = Start, CheckOut = Start.AddDays(2), Adults = 2 };
        public Fixture()
        {
            for (var id = 1; id <= 3; id++)
            {
                var hotel = Hotel.Create(new($"Hotel {id}", "Description", "Address", id == 3 ? "Hue" : "Da Nang", "Vietnam", "0900000000", $"hotel{id}@example.com", null, new(14, 0), new(12, 0), true));
                Hotels.Hotels.Add(hotel); Hotels.Entry(hotel).Property(x => x.HotelId).CurrentValue = id;
                Bookings.Add(new InventoryHotel { HotelId = id, IsActive = true });
                Bookings.Add(new InventoryArea { AreaId = id, HotelId = id, IsActive = true });
                Bookings.Add(new InventoryType { RoomTypeId = id, HotelId = id, AreaId = id, RoomTypeName = id == 3 ? "Suite" : "Deluxe", Capacity = 2, BasePrice = id * 100, IsActive = true });
                for (var room = 1; room <= 2; room++) Bookings.Add(new InventoryRoom { RoomId = id * 10 + room, AreaId = id, RoomTypeId = id, RoomNumber = $"{id}0{room}", Status = "Available", IsActive = true });
                var projection = new RoomHotel(); Content.Hotels.Add(projection);
                Content.Entry(projection).Property(x => x.HotelId).CurrentValue = id;
                Content.Entry(projection).Property(x => x.IsActive).CurrentValue = true;
            }
            Hotels.SaveChanges(); Content.SaveChanges(); Bookings.SaveChanges();
        }
        public void AddBooking(long id, long[] rooms, BookingStatus status, DateOnly? checkIn = null, DateOnly? checkOut = null, DateTime? expires = null)
        {
            Bookings.Bookings.Add(new Booking { BookingId = id, BookingCode = "B" + id, CustomerId = 1,
                CheckInDate = checkIn ?? Start, CheckOutDate = checkOut ?? Start.AddDays(2), CreatedAt = Start.ToDateTime(TimeOnly.MinValue),
                BookingStatus = status, HoldExpiresAt = expires, NumberOfGuests = 2,
                BookingDetails = rooms.Select(r => new BookingDetail { RoomId = r, UnitPrice = 100, NumberOfNights = 2, SubTotal = 200 }).ToList() });
            Bookings.SaveChanges();
        }
        public void Dispose() { Hotels.Dispose(); Content.Dispose(); Bookings.Dispose(); }
    }
    private sealed class Access : IContentAccess
    { public Task EnsureAdminAsync(long userId, CancellationToken ct) => userId == 1 ? Task.CompletedTask : Task.FromException(new ContentAccessDeniedException()); }

    [Fact]
    public async Task Search_combines_region_dates_capacity_price_name_and_paging_before_returning_cards()
    {
        using var f = new Fixture();
        var first = await f.Service.SearchAsync(new() { Location = " da nang ", RoomTypeName = " dELuXe ", CheckIn = f.Start, CheckOut = f.Start.AddDays(2), Adults = 4, Rooms = 2, MinPrice = 100, MaxPrice = 200, PageSize = 1 }, default);
        Assert.Equal(2, first.TotalCount); Assert.Equal(2, first.TotalPages); Assert.Equal(1, Assert.Single(first.Items).HotelId);
        var second = await f.Service.SearchAsync(new() { Location = "Da Nang", CheckIn = f.Start, CheckOut = f.Start.AddDays(2), Adults = 4, Rooms = 2, PageSize = 1, Page = 2 }, default);
        Assert.Equal(2, Assert.Single(second.Items).HotelId);
        var noCapacity = await f.Service.SearchAsync(new() { CheckIn = f.Start, CheckOut = f.Start.AddDays(2), Adults = 5, Rooms = 2 }, default);
        Assert.Empty(noCapacity.Items); Assert.NotNull(noCapacity.Message);
    }
    [Theory]
    [InlineData(BookingStatus.Confirmed, false)]
    [InlineData(BookingStatus.CheckedIn, false)]
    [InlineData(BookingStatus.Cancelled, true)]
    [InlineData(BookingStatus.Expired, true)]
    public async Task Availability_respects_booking_status(BookingStatus status, bool stillListed)
    {
        using var f = new Fixture(); f.AddBooking(1, [11, 12], status);
        var result = await f.Service.SearchAsync(f.Request, default);
        Assert.Equal(stillListed, result.Items.Any(x => x.HotelId == 1));
    }
    [Fact]
    public async Task Expired_hold_adjacent_checkout_hidden_inventory_and_emergency_locks_are_handled()
    {
        using var f = new Fixture();
        f.AddBooking(1, [11], BookingStatus.Pending, expires: DateTime.UtcNow.AddMinutes(-1));
        f.AddBooking(2, [12], BookingStatus.Confirmed, checkIn: f.Start.AddDays(-2), checkOut: f.Start);
        Assert.Contains((await f.Service.SearchAsync(f.Request, default)).Items, x => x.HotelId == 1);
        f.Bookings.Add(new RoomEmergencyLock(Guid.NewGuid(), 1, 11, new(f.Start.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), new(f.Start.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), "Repair", 1));
        (await f.Bookings.Set<InventoryRoom>().SingleAsync(r => r.RoomId == 12)).IsActive = false;
        await f.Bookings.SaveChangesAsync();
        Assert.DoesNotContain((await f.Service.SearchAsync(f.Request, default)).Items, x => x.HotelId == 1);
    }
    [Fact]
    public async Task Detail_includes_saved_amenities_media_and_policy_but_hides_inactive_hotels()
    {
        using var f = new Fixture();
        var amenity = new Amenity("Pool", "Outdoor pool"); f.Content.Amenities.Add(amenity); await f.Content.SaveChangesAsync();
        f.Content.HotelAmenities.Add(new() { HotelId = 1, AmenityId = amenity.AmenityId });
        var image = new HotelImage { HotelId = 1, ImageUrl = "/test.png" }; image.SetPrimary(true); f.Content.Add(image);
        await f.Content.SaveChangesAsync();
        await f.Service.SetPolicyAsync(1, 1, new("Hotel policy"), default);
        var detail = await f.Service.DetailAsync(1, f.Request, default);
        Assert.Equal("Pool", Assert.Single(detail.Amenities).Name); Assert.Single(detail.Images);
        Assert.Equal("Hotel policy", detail.Policies.CancellationPolicy); Assert.Equal(2, detail.Rooms.Count);
        f.Hotels.Entry(await f.Hotels.Hotels.SingleAsync(h => h.HotelId == 1)).Property(h => h.IsActive).CurrentValue = false;
        await f.Hotels.SaveChangesAsync();
        await Assert.ThrowsAsync<HotelBooking.Application.Rooms.NotFoundException>(() => f.Service.DetailAsync(1, f.Request, default));
    }
    [Fact]
    public async Task Wishlist_is_idempotent_and_scoped_to_current_user()
    {
        using var f = new Fixture();
        await f.Service.SetWishlistAsync(7, 1, true, default); await f.Service.SetWishlistAsync(7, 1, true, default);
        Assert.Single(await f.Service.WishlistAsync(7, default)); Assert.Empty(await f.Service.WishlistAsync(8, default));
        await f.Service.SetWishlistAsync(8, 1, false, default); Assert.Single(await f.Service.WishlistAsync(7, default));
        await f.Service.SetWishlistAsync(7, 1, false, default); Assert.Empty(await f.Service.WishlistAsync(7, default));
    }
    [Fact]
    public async Task Reporting_counts_payments_once_per_booking_deducts_refunds_and_scopes_by_hotel()
    {
        using var f = new Fixture(); f.AddBooking(1, [11, 12], BookingStatus.Confirmed);
        f.Bookings.AddRange(new ReportPayment { PaymentId = 1, BookingId = 1, Amount = 80, PaymentType = "Payment", Status = "Paid", PaidAt = f.Start.ToDateTime(new(10, 0)) },
            new ReportPayment { PaymentId = 2, BookingId = 1, Amount = 20, PaymentType = "Refund", Status = "Paid", PaidAt = f.Start.ToDateTime(new(11, 0)) },
            new ReportPayment { PaymentId = 3, BookingId = 1, Amount = 900, PaymentType = "Payment", Status = "Pending", PaidAt = f.Start.ToDateTime(new(10, 0)) });
        await f.Bookings.SaveChangesAsync();
        var report = await f.Service.ReportAsync(1, new(f.Start, f.Start.AddDays(2), 1), default);
        Assert.Equal(60, report.Revenue); Assert.Equal(1, report.BookingCount); Assert.Equal(4, report.OccupiedRoomNights); Assert.Equal(100, report.OccupancyRate);
        var other = await f.Service.ReportAsync(1, new(f.Start, f.Start.AddDays(2), 2), default);
        Assert.Equal(0, other.Revenue); Assert.Equal(0, other.BookingCount);
        await Assert.ThrowsAsync<ContentAccessDeniedException>(() => f.Service.ReportAsync(2, new(f.Start, f.Start.AddDays(2), null), default));
    }
    [Fact]
    public async Task Invalid_search_or_report_intervals_are_rejected()
    {
        using var f = new Fixture();
        foreach (var request in new HotelDiscoveryRequest[] { new(), new() { CheckIn = f.Start, CheckOut = f.Start }, new() { CheckIn = f.Start, CheckOut = f.Start.AddDays(1), MinPrice = 2, MaxPrice = 1 }, new() { CheckIn = f.Start, CheckOut = f.Start.AddDays(1), Page = int.MaxValue } })
            await Assert.ThrowsAsync<DomainRuleException>(() => f.Service.SearchAsync(request, default));
        await Assert.ThrowsAsync<DomainRuleException>(() => f.Service.ReportAsync(1, new(f.Start, f.Start, null), default));
    }
    [Fact]
    public void Empty_report_and_duplicate_stays_do_not_divide_by_zero_or_exceed_capacity()
    {
        var start = new DateOnly(2026, 11, 1);
        var source = new ReportSource([1], [], [], [new(1, start, start.AddDays(1)), new(1, start, start.AddDays(1))], []);
        Assert.Equal(100, BusinessReportCalculator.Calculate(new(start, start.AddDays(1), null), source).OccupancyRate);
        var empty = BusinessReportCalculator.Calculate(new(start, start.AddDays(1), null), new([], [], [], [], []));
        Assert.Equal(0, empty.OccupancyRate); Assert.Equal(0, empty.CancellationRate);
    }
}
