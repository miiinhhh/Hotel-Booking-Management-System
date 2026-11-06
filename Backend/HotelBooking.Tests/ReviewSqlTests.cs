using HotelBooking.Application.Reviews;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class ReviewSqlFactAttribute : FactAttribute
{
    public ReviewSqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HOTEL_REVIEW_SQLSERVER")))
            Skip = "Set HOTEL_REVIEW_SQLSERVER; this test creates and deletes a separate HotelReviewTests_<GUID> database.";
    }
}
public sealed class ReviewSqlTests
{
    [ReviewSqlFact]
    public async Task SchemaUpgradeUniqueBookingConcurrencyAndRatingWorkOnSqlServer()
    {
        var source = Environment.GetEnvironmentVariable("HOTEL_REVIEW_SQLSERVER")!;
        var name = "HotelReviewTests_" + Guid.NewGuid().ToString("N");
        await using var master = new SqlConnection(new SqlConnectionStringBuilder(source) { InitialCatalog = "master" }.ConnectionString);
        await master.OpenAsync();
        await using (var command = master.CreateCommand()) { command.CommandText = $"CREATE DATABASE [{name}]"; await command.ExecuteNonQueryAsync(); }
        var options = new DbContextOptionsBuilder<HotelBookingDBContext>().UseSqlServer(new SqlConnectionStringBuilder(source) { InitialCatalog = name }.ConnectionString).Options;
        try
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            await using (var setup = new HotelBookingDBContext(options))
            {
                await setup.Database.EnsureCreatedAsync();
                await setup.Database.ExecuteSqlRawAsync("""
                    DROP TABLE ReviewModerationHistory;
                    DROP TABLE Reviews;
                    IF OBJECT_ID('Users') IS NULL CREATE TABLE Users(UserId bigint PRIMARY KEY);
                    INSERT Users(UserId) VALUES(1),(4);
                    IF OBJECT_ID('Hotels') IS NULL CREATE TABLE Hotels(HotelId int PRIMARY KEY, IsActive bit NOT NULL);
                    IF OBJECT_ID('RoomTypes') IS NULL CREATE TABLE RoomTypes(RoomTypeId int PRIMARY KEY, HotelId int NOT NULL, AreaId int NOT NULL, RoomTypeName nvarchar(100) NOT NULL, BasePrice decimal(18,2) NOT NULL, Capacity int NOT NULL, IsActive bit NOT NULL);
                    IF OBJECT_ID('Rooms') IS NULL CREATE TABLE Rooms(RoomId bigint PRIMARY KEY, RoomTypeId int NOT NULL, AreaId int NOT NULL, RoomNumber varchar(20) NOT NULL, Floor int NOT NULL, Status varchar(20) NOT NULL, IsActive bit NOT NULL);
                    INSERT Hotels VALUES(1,1);
                    INSERT RoomTypes VALUES(1,1,1,N'Deluxe',500000,2,1);
                    INSERT Rooms VALUES(1,1,1,'101',1,'Available',1);
                    CREATE TABLE Reviews(
                        ReviewId bigint IDENTITY(1,1) PRIMARY KEY,
                        BookingId bigint NOT NULL UNIQUE REFERENCES Bookings(BookingId),
                        CustomerId bigint NOT NULL REFERENCES Users(UserId),
                        Rating tinyint NOT NULL CHECK(Rating BETWEEN 1 AND 5),
                        Comment nvarchar(2000) NULL,
                        Status varchar(20) NOT NULL DEFAULT 'Visible' CHECK(Status IN ('Visible','Hidden','Deleted')),
                        CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(), UpdatedAt datetime2 NULL);
                    """);
                for (var i = 0; i < 3; i++)
                    setup.Bookings.Add(new Booking { CustomerId = 4, BookingCode = $"REVIEW-SQL-{i}", BookingStatus = BookingStatus.Completed,
                        CheckInDate = today.AddDays(-3), CheckOutDate = today.AddDays(-1), NumberOfGuests = 1,
                        BookingDetails = [new BookingDetail { RoomId = 1, NumberOfNights = 2 }] });
                await setup.SaveChangesAsync();
                await setup.Database.ExecuteSqlRawAsync("INSERT Reviews(BookingId,CustomerId,Rating,Comment) VALUES(1,4,5,N'Legacy visible');");
                var path = Path.Combine(AppContext.BaseDirectory, "Reviews.sql");
                var script = await File.ReadAllTextAsync(path);
                await setup.Database.ExecuteSqlRawAsync(script); await setup.Database.ExecuteSqlRawAsync(script);
                Assert.Equal(ReviewStatus.Visible, (await setup.Set<Review>().SingleAsync(x => x.BookingId == 1)).Status);
                await setup.Database.ExecuteSqlRawAsync("INSERT Reviews(BookingId,CustomerId,Rating) VALUES(3,4,1);");
                Assert.Equal(ReviewStatus.Hidden, (await setup.Set<Review>().SingleAsync(x => x.BookingId == 3)).Status);
            }
            await using var first = new HotelBookingDBContext(options); await using var second = new HotelBookingDBContext(options);
            var repo1 = new ReviewRepository(first); var repo2 = new ReviewRepository(second);
            repo1.Add(new Review(2, 4, BookingStatus.Completed, today.AddDays(-1), today, 4, "First"));
            repo2.Add(new Review(2, 4, BookingStatus.Completed, today.AddDays(-1), today, 2, "Second"));
            static async Task<bool> Save(ReviewRepository repository) { try { await repository.Save(default); return true; } catch (ConflictException) { return false; } }
            var results = await Task.WhenAll(Save(repo1), Save(repo2)); Assert.Single(results, success => success);
            await using var a = new HotelBookingDBContext(options); await using var b = new HotelBookingDBContext(options);
            var aRepo = new ReviewRepository(a); var bRepo = new ReviewRepository(b);
            var aReview = (await aRepo.ForBooking(2, default))!; var bReview = (await bRepo.ForBooking(2, default))!;
            aReview.ChangeStatus(ReviewStatus.Visible); aRepo.Audit(new(aReview.ReviewId, 1, ReviewStatus.Hidden, ReviewStatus.Visible, "Moderation", null));
            bReview.ChangeStatus(ReviewStatus.Deleted); bRepo.Audit(new(bReview.ReviewId, 1, ReviewStatus.Hidden, ReviewStatus.Deleted, "Moderation", "Spam"));
            await aRepo.Save(default);
            await Assert.ThrowsAsync<ConflictException>(() => bRepo.Save(default));
            await using var verify = new HotelBookingDBContext(options); var verifyRepo = new ReviewRepository(verify);
            Assert.Single(await verifyRepo.History(aReview.ReviewId, default));
            Assert.Equal(ReviewStatus.Visible, (await verifyRepo.ForBooking(2, default))!.Status);
            Assert.Equal(2, (await verifyRepo.Public(1, 1, 20, default)).Total);
            Assert.Equal(2, (await verifyRepo.Rating(1, default)).TotalReviews);
            Assert.Equal((5m + aReview.Rating) / 2, (await verifyRepo.Rating(1, default)).AverageRating);
        }
        finally
        {
            if (!name.StartsWith("HotelReviewTests_", StringComparison.Ordinal)) throw new InvalidOperationException("Unexpected test database name.");
            SqlConnection.ClearAllPools();
            await using var command = master.CreateCommand(); command.CommandText = $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];"; await command.ExecuteNonQueryAsync();
        }
    }
}
