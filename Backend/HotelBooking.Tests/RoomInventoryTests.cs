using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class RoomInventoryTests
{
    private static readonly DateOnly Day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(10);
    internal static void Seed(HotelBookingDBContext db)
    {
        db.Add(new InventoryHotel { HotelId = 1, IsActive = true });
        db.Add(new InventoryArea { AreaId = 1, HotelId = 1, IsActive = true });
        db.Add(new InventoryType { RoomTypeId = 1, HotelId = 1, AreaId = 1, RoomTypeName = "Deluxe", BasePrice = 500000, Capacity = 2, IsActive = true });
        foreach (var id in new[] { 1L, 2L, 3L })
            db.Add(new InventoryRoom { RoomId = id, RoomTypeId = 1, AreaId = 1, RoomNumber = id.ToString(), Status = id == 3 ? "Maintenance" : "Available", IsActive = true });
        db.SaveChanges();
    }
    private static HotelBookingDBContext Database()
    {
        var db = new HotelBookingDBContext(new DbContextOptionsBuilder<HotelBookingDBContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        Seed(db); return db;
    }
    private static Booking Booking(long roomId, BookingStatus status = BookingStatus.Confirmed, DateTime? hold = null) => new()
    {
        BookingCode = Guid.NewGuid().ToString("N")[..20], CustomerId = 1, NumberOfGuests = 1,
        CheckInDate = Day, CheckOutDate = Day.AddDays(2), BookingStatus = status, HoldExpiresAt = hold,
        BookingDetails = [new BookingDetail { RoomId = roomId, NumberOfNights = 2, UnitPrice = 500000, SubTotal = 1000000 }]
    };
    private static CreateRoomLockRequest Lock(params long[] ids) => new(ids,
        new DateTimeOffset(Day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero),
        new DateTimeOffset(Day.AddDays(2).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), "Maintenance");

    [Theory]
    [InlineData(BookingStatus.Confirmed, true)]
    [InlineData(BookingStatus.CheckedIn, true)]
    [InlineData(BookingStatus.Cancelled, false)]
    [InlineData(BookingStatus.Expired, false)]
    [InlineData(BookingStatus.CheckedOut, false)]
    [InlineData(BookingStatus.Completed, false)]
    public async Task AvailabilityRespectsBookingState(BookingStatus status, bool blocks)
    {
        using var db = Database(); db.Bookings.Add(Booking(1, status)); await db.SaveChangesAsync();
        var result = await new RoomInventoryRepository(db).Available(1, Day, Day.AddDays(2), default);
        Assert.Equal(!blocks, result.Any(r => r.RoomId == 1)); Assert.DoesNotContain(result, r => r.RoomId == 3);
    }
    [Theory]
    [InlineData(-1, false)]
    [InlineData(10, true)]
    public async Task PendingOnlyBlocksWhileHoldIsValid(int minutes, bool blocks)
    {
        using var db = Database(); db.Bookings.Add(Booking(1, BookingStatus.Pending, DateTime.UtcNow.AddMinutes(minutes))); await db.SaveChangesAsync();
        var result = await new RoomInventoryRepository(db).Available(1, Day, Day.AddDays(2), default);
        Assert.Equal(!blocks, result.Any(r => r.RoomId == 1));
    }
    [Fact]
    public async Task AdjacentStayDoesNotOverlap()
    {
        using var db = Database(); db.Bookings.Add(Booking(1)); await db.SaveChangesAsync();
        Assert.Contains(await new RoomInventoryRepository(db).Available(1, Day.AddDays(2), Day.AddDays(3), default), r => r.RoomId == 1);
    }
    [Fact]
    public async Task LockReleasePreservesAuditAndRestoresAvailability()
    {
        using var db = Database(); var repo = new RoomInventoryRepository(db);
        var item = Assert.Single(await repo.CreateLocks(1, Lock(1), 10, true, default));
        Assert.Equal(10, item.CreatedByUserId);
        Assert.DoesNotContain(await repo.Available(1, Day, Day.AddDays(1), default), r => r.RoomId == 1);
        var released = await repo.Release(1, item.LockId, 11, true, default);
        var repeated = await repo.Release(1, item.LockId, 12, true, default);
        Assert.Equal("Released", released.Status); Assert.Equal(11, repeated.ReleasedByUserId);
        Assert.Contains(await repo.Available(1, Day, Day.AddDays(1), default), r => r.RoomId == 1);
        Assert.Single(await repo.ListLocks(1, 10, true, default));
    }
    [Fact]
    public async Task BatchIsAllOrNothingAndCannotOverwriteBookings()
    {
        using var db = Database(); var repo = new RoomInventoryRepository(db);
        db.Bookings.Add(Booking(2)); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<ConflictException>(() => repo.CreateLocks(1, Lock(1, 2), 10, true, default));
        Assert.Empty(await db.Set<RoomEmergencyLock>().ToListAsync());
        await Assert.ThrowsAsync<NotFoundException>(() => repo.CreateLocks(1, Lock(1, 999), 10, true, default));
        Assert.Empty(await db.Set<RoomEmergencyLock>().ToListAsync());
    }
    [Fact]
    public async Task StaffNeedsAssignmentForLockAndRelease()
    {
        using var db = Database(); var repo = new RoomInventoryRepository(db);
        await Assert.ThrowsAsync<InventoryAccessException>(() => repo.CreateLocks(1, Lock(1), 20, false, default));
        db.Add(new InventoryAssignment { UserId = 20, AreaId = 1, IsActive = true }); await db.SaveChangesAsync();
        var item = Assert.Single(await repo.CreateLocks(1, Lock(1), 20, false, default));
        await Assert.ThrowsAsync<InventoryAccessException>(() => repo.Release(1, item.LockId, 21, false, default));
        await repo.Release(1, item.LockId, 20, false, default);
        await Assert.ThrowsAsync<NotFoundException>(() => repo.Release(2, item.LockId, 20, true, default));
    }
    [Fact]
    public async Task BookingRechecksAvailabilityAndRejectsLockedOrTakenRooms()
    {
        using var db = Database(); var repo = new RoomInventoryRepository(db);
        await repo.CreateLocks(1, Lock(1), 10, true, default);
        Assert.False(await repo.Reserve(Booking(1)));
        Assert.True(await repo.Reserve(Booking(2)));
        Assert.False(await repo.Reserve(Booking(2)));
        Assert.Single(await db.Bookings.ToListAsync());
    }
    [Fact]
    public async Task LockBoundaryAndFutureLockOnlyAffectOverlappingDates()
    {
        using var db = Database(); var repo = new RoomInventoryRepository(db);
        await repo.CreateLocks(1, Lock(1), 10, true, default);
        Assert.Contains(await repo.Available(1, Day.AddDays(2), Day.AddDays(3), default), r => r.RoomId == 1);
    }
    [Fact]
    public async Task ServiceRejectsInvalidDatesAndDuplicateRoomIds()
    {
        using var db = Database(); var service = new RoomInventoryService(new RoomInventoryRepository(db));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.Available(1, new(Day, Day), default));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.CreateLocks(1, Lock(1, 1), 10, true, default));
    }
    [Fact]
    public void AvailabilityQueryTranslatesToSqlServer()
    {
        using var db = new HotelBookingDBContext(new DbContextOptionsBuilder<HotelBookingDBContext>().UseSqlServer("Server=localhost;Database=InventoryQueryTest;Trusted_Connection=True;TrustServerCertificate=True").Options);
        var sql = new RoomInventoryRepository(db).AvailabilityQuery(1, Day, Day.AddDays(2)).ToQueryString();
        Assert.Contains("RoomEmergencyLocks", sql); Assert.Contains("BookingDetails", sql); Assert.Contains("UNION", sql);
    }
    [Fact]
    public async Task UpdatingReservationExcludesItselfButNotOtherBookingsOrLocks()
    {
        using var db = Database(); var repo = new RoomInventoryRepository(db);
        var item = Booking(1);
        Assert.True(await repo.Reserve(item));
        Assert.True(await repo.Reserve(item, updating: true));
        var oversized = Booking(2); oversized.NumberOfGuests = 3;
        Assert.False(await repo.Reserve(oversized));
    }
}
