using HotelBooking.Application.Reviews;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class ReviewTests
{
    internal static void Seed(HotelBookingDBContext db)
    {
        db.AddRange(new InventoryHotel { HotelId = 1, IsActive = true }, new InventoryHotel { HotelId = 2, IsActive = true });
        db.AddRange(new InventoryType { RoomTypeId = 1, HotelId = 1, AreaId = 1 }, new InventoryType { RoomTypeId = 2, HotelId = 2, AreaId = 2 });
        db.AddRange(new InventoryRoom { RoomId = 1, RoomTypeId = 1, AreaId = 1 }, new InventoryRoom { RoomId = 2, RoomTypeId = 2, AreaId = 2 });
        db.Bookings.AddRange(Stay(10), Stay(11), Stay(12, roomId: 2)); db.SaveChanges();
    }
    internal static Booking Stay(long id, BookingStatus status = BookingStatus.Completed, long customerId = 4, long roomId = 1) => new()
    {
        BookingId = id, BookingCode = $"REVIEW-{id}", CustomerId = customerId, BookingStatus = status,
        CheckInDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-4), CheckOutDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-1), NumberOfGuests = 1,
        BookingDetails = [new BookingDetail { RoomId = roomId, NumberOfNights = 3 }]
    };
    private static HotelBookingDBContext Database()
    {
        var db = new HotelBookingDBContext(new DbContextOptionsBuilder<HotelBookingDBContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        Seed(db); return db;
    }
    private static ReviewService Service(HotelBookingDBContext db) => new(new ReviewRepository(db));

    [Theory]
    [InlineData(BookingStatus.Pending)]
    [InlineData(BookingStatus.Confirmed)]
    [InlineData(BookingStatus.CheckedIn)]
    [InlineData(BookingStatus.CheckedOut)]
    [InlineData(BookingStatus.Cancelled)]
    [InlineData(BookingStatus.Expired)]
    public async Task OnlyCompletedBookingCanBeReviewed(BookingStatus status)
    {
        using var db = Database(); db.Bookings.Add(Stay(20, status)); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<DomainRuleException>(() => Service(db).Create(20, 4, new(5, "Good"), default));
    }
    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    [InlineData(-1)]
    public async Task RejectsRatingOutsideOneToFive(int rating)
    {
        using var db = Database(); await Assert.ThrowsAsync<DomainRuleException>(() => Service(db).Create(10, 4, new(rating, null), default));
    }
    [Fact]
    public async Task OwnershipFutureCheckoutAndUnknownBookingAreRejected()
    {
        using var db = Database(); var service = Service(db);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.Create(10, 99, new(5, null), default));
        var future = Stay(20); future.CheckOutDate = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1); db.Add(future); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<DomainRuleException>(() => service.Create(20, 4, new(5, null), default));
        await Assert.ThrowsAsync<NotFoundException>(() => service.Create(999, 4, new(5, null), default));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.Create(10, 4, new(5, new string('a', 2001)), default));
    }
    [Fact]
    public async Task MixedHotelOrMissingRoomBookingCannotBeReviewed()
    {
        using var db = Database(); var mixed = Stay(20); mixed.BookingDetails.Add(new BookingDetail { RoomId = 2 });
        db.AddRange(mixed, Stay(21, roomId: 999)); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<ConflictException>(() => Service(db).Create(20, 4, new(5, null), default));
        await Assert.ThrowsAsync<ConflictException>(() => Service(db).Create(21, 4, new(5, null), default));
    }
    [Fact]
    public async Task NewReviewIsHiddenAndStatisticsUseOnlyPublishedReviews()
    {
        using var db = Database(); var service = Service(db);
        var first = await service.Create(10, 4, new(5, "  Great  "), default);
        Assert.Equal(ReviewStatus.Hidden, first.Status); Assert.Equal("Great", first.Comment); Assert.Equal(1, first.HotelId);
        Assert.Empty((await service.Public(1, 1, 20, default)).Items);
        Assert.Null((await service.Rating(1, default)).AverageRating);
        await service.Moderate(1, first.ReviewId, 1, new(ReviewStatus.Visible, null), default);
        var second = await service.Create(11, 4, new(2, null), default);
        await service.Moderate(1, second.ReviewId, 1, new(ReviewStatus.Visible, null), default);
        var otherHotel = await service.Create(12, 4, new(1, null), default);
        await service.Moderate(2, otherHotel.ReviewId, 1, new(ReviewStatus.Visible, null), default);
        var summary = await service.Rating(1, default);
        Assert.Equal(2, summary.TotalReviews); Assert.Equal(3.5m, summary.AverageRating);
        Assert.Equal(1, summary.Distribution.Single(x => x.Rating == 5).Count);
        Assert.Equal(1, summary.Distribution.Single(x => x.Rating == 2).Count);
        Assert.Equal(0, summary.Distribution.Single(x => x.Rating == 1).Count);
        await service.Moderate(1, second.ReviewId, 1, new(ReviewStatus.Hidden, "Contains private data"), default);
        Assert.Equal(5m, (await service.Rating(1, default)).AverageRating);
        await Assert.ThrowsAsync<ConflictException>(() => service.Create(10, 4, new(1, null), default));
    }
    [Fact]
    public async Task EditingPublishedReviewRequiresModerationAgainAndPreservesAudit()
    {
        using var db = Database(); var service = Service(db);
        var review = await service.Create(10, 4, new(5, "Good"), default);
        await service.Moderate(1, review.ReviewId, 1, new(ReviewStatus.Visible, null), default);
        var edited = await service.Edit(10, 4, new(3, "Updated"), default);
        Assert.Equal(ReviewStatus.Hidden, edited.Status); Assert.NotNull(edited.UpdatedAt);
        Assert.Equal(0, (await service.Rating(1, default)).TotalReviews);
        Assert.Equal(2, (await service.History(1, review.ReviewId, default)).Count);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.Edit(10, 99, new(1, null), default));
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.DeleteOwn(10, 99, default));
    }
    [Fact]
    public async Task ModerationCannotTargetWrongHotelOrRestoreDeletedReview()
    {
        using var db = Database(); var service = Service(db);
        var review = await service.Create(10, 4, new(5, null), default);
        await Assert.ThrowsAsync<NotFoundException>(() => service.Moderate(2, review.ReviewId, 1, new(ReviewStatus.Visible, null), default));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.Moderate(1, review.ReviewId, 1, new(ReviewStatus.Deleted, " "), default));
        await service.Moderate(1, review.ReviewId, 1, new(ReviewStatus.Deleted, "Spam"), default);
        await Assert.ThrowsAsync<ConflictException>(() => service.Moderate(1, review.ReviewId, 1, new(ReviewStatus.Visible, null), default));
        await Assert.ThrowsAsync<ConflictException>(() => service.Edit(10, 4, new(4, null), default));
        await Assert.ThrowsAsync<ConflictException>(() => service.Create(10, 4, new(4, null), default));
        Assert.Empty((await service.Public(1, 1, 20, default)).Items);
    }
    [Fact]
    public async Task PaginationAndAuthorDeleteAreConsistent()
    {
        using var db = Database(); var service = Service(db);
        await service.Create(10, 4, new(5, null), default); await service.Create(11, 4, new(4, null), default);
        var page = await service.Mine(4, 2, 1, default); Assert.Equal(2, page.Total); Assert.Single(page.Items);
        Assert.Empty((await service.Mine(99, 1, 20, default)).Items);
        await service.DeleteOwn(10, 4, default); await service.DeleteOwn(10, 4, default);
        Assert.Equal(ReviewStatus.Deleted, (await service.GetOwn(10, 4, default)).Status);
        Assert.Single(await service.History(1, (await service.GetOwn(10, 4, default)).ReviewId, default));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.Public(1, 0, 20, default));
        await Assert.ThrowsAsync<DomainRuleException>(() => service.ModerationList(1, (ReviewStatus)99, 1, 20, default));
    }
    [Fact]
    public void PublicVisibilityQueryTranslatesToSqlServer()
    {
        using var db = new HotelBookingDBContext(new DbContextOptionsBuilder<HotelBookingDBContext>().UseSqlServer("Server=localhost;Database=QueryOnly;Trusted_Connection=True;TrustServerCertificate=True").Options);
        var sql = new ReviewRepository(db).Visible(1).ToQueryString();
        Assert.Contains("Reviews", sql); Assert.Contains("BookingDetails", sql); Assert.Contains("NOT EXISTS", sql);
    }
}
