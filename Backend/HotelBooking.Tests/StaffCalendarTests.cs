using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;
using RoomDb = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;

namespace HotelBooking.Tests;

public sealed class StaffCalendarTests
{
    [Fact]
    public void MaintenanceAndOverlappingBookingLocksDoNotDoubleCountBusyRooms()
    {
        var day = new DateOnly(2026, 11, 20);
        var type = new CalendarType(1, 1, 1, "Building", "Deluxe", 2, 100,
            [new(1, true), new(2, true), new(3, false)]);
        var source = new StaffCalendarSource([type], [new(1, day, day.AddDays(1))],
            [new(1, day.ToDateTime(TimeOnly.MinValue), day.AddDays(1).ToDateTime(TimeOnly.MinValue))]);
        var result = Assert.Single(StaffCalendarService.Calculate(source, day, 2));
        Assert.Equal(1, result.Days[0].AvailableCount); // room 1 busy once; room 3 maintenance
        Assert.Equal(1, result.Days[0].LockedCount);
        Assert.Equal(2, result.Days[1].AvailableCount); // checkout/release boundary
        Assert.DoesNotContain(3L, result.RoomIds); // cannot select maintenance for emergency locking
    }

    [Fact]
    public async Task CalendarAndAvailabilityAgreeAfterCancellationHoldExpiryLocksAndTypeRename()
    {
        using var db = new HotelBookingDBContext(new DbContextOptionsBuilder<HotelBookingDBContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        using var rooms = new RoomDb(new DbContextOptionsBuilder<RoomDb>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        RoomInventoryTests.Seed(db);
        var hotel = new RoomHotel(); rooms.Add(hotel);
        rooms.Entry(hotel).Property(h => h.HotelId).CurrentValue = 1;
        rooms.Entry(hotel).Property(h => h.IsActive).CurrentValue = true;
        rooms.Add(new HotelArea { AreaId = 1, HotelId = 1, AreaName = "Building", IsActive = true });
        var type = new RoomType(1, 1, "Deluxe", null, 500000, 2, 1);
        rooms.Add(type); rooms.Entry(type).Property(t => t.RoomTypeId).CurrentValue = 1;
        for (var id = 1; id <= 3; id++)
        {
            var room = new Room(1, 1, id.ToString(), 1, id == 3 ? RoomStatus.Maintenance : RoomStatus.Available, null);
            rooms.Add(room); rooms.Entry(room).Property(r => r.RoomId).CurrentValue = (long)id;
        }
        await rooms.SaveChangesAsync();
        var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(2);
        var inventory = new RoomInventoryRepository(db);
        var repository = new StaffCalendarRepository(rooms, db);
        async Task Check(int expected)
        {
            var available = await inventory.Available(1, day, day.AddDays(1), default);
            var source = await repository.Load(1, true, 1, day, day.AddDays(1), default);
            var calendar = Assert.Single(StaffCalendarService.Calculate(source, day, 1));
            Assert.Equal(expected, available.Count);
            Assert.Equal(expected, calendar.Days[0].AvailableCount);
        }
        await Check(2);
        var booking = new Booking { BookingCode = "SYNC", CustomerId = 1, NumberOfGuests = 1,
            CheckInDate = day, CheckOutDate = day.AddDays(1), BookingStatus = BookingStatus.Pending,
            HoldExpiresAt = DateTime.UtcNow.AddMinutes(10), BookingDetails = [new() { RoomId = 1 }] };
        Assert.True(await inventory.Reserve(booking));
        await Check(1);
        booking.BookingStatus = BookingStatus.Cancelled; await db.SaveChangesAsync(); await Check(2);
        booking.BookingStatus = BookingStatus.Pending; booking.HoldExpiresAt = DateTime.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync(); await Check(2);
        var locks = await inventory.CreateLocks(1, new([2], new(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
            new(day.AddDays(1).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), "Repair"), 1, true, default);
        await Check(1);
        await inventory.Release(1, locks[0].LockId, 1, true, default); await Check(2);
        type.Update("Executive", null, 500000, 2, 1);
        await rooms.SaveChangesAsync();
        var projected = await db.Set<InventoryType>().SingleAsync(); projected.RoomTypeName = "Executive"; await db.SaveChangesAsync();
        Assert.All(await inventory.Available(1, day, day.AddDays(1), default), r => Assert.Equal("Executive", r.RoomTypeName));
        Assert.Equal("Executive", Assert.Single((await repository.Load(1, true, 1, day, day.AddDays(1), default)).Types).Name);
        Assert.Empty((await repository.Load(99, false, 1, day, day.AddDays(1), default)).Types);
        type.Deactivate(); await rooms.SaveChangesAsync();
        projected.IsActive = false; await db.SaveChangesAsync();
        Assert.Empty(await inventory.Available(1, day, day.AddDays(1), default));
        Assert.Empty((await repository.Load(1, true, 1, day, day.AddDays(1), default)).Types);
    }
}
