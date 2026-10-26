using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Data;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HotelBooking.Tests;

public sealed class InventorySqlFactAttribute : FactAttribute
{
    public InventorySqlFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HOTEL_INVENTORY_SQLSERVER")))
            Skip = "Set HOTEL_INVENTORY_SQLSERVER to run concurrency tests in a newly created isolated test database.";
    }
}
public sealed class RoomInventorySqlTests
{
    [InventorySqlFact]
    public async Task ConcurrentBookingsAndLocksCannotBothClaimTheSameRoom()
    {
        var source = Environment.GetEnvironmentVariable("HOTEL_INVENTORY_SQLSERVER")!;
        var name = "HotelBookingInventoryTests_" + Guid.NewGuid().ToString("N");
        var masterString = new SqlConnectionStringBuilder(source) { InitialCatalog = "master" }.ConnectionString;
        await using var master = new SqlConnection(masterString); await master.OpenAsync();
        await using (var create = master.CreateCommand()) { create.CommandText = $"CREATE DATABASE [{name}]"; await create.ExecuteNonQueryAsync(); }
        var options = new DbContextOptionsBuilder<HotelBookingDBContext>().UseSqlServer(new SqlConnectionStringBuilder(source) { InitialCatalog = name }.ConnectionString).Options;
        try
        {
            await using (var setup = new HotelBookingDBContext(options))
            {
                await setup.Database.EnsureCreatedAsync();
                // Booking owns its own schema; provision the existing read-only inventory tables for this test only.
                await setup.Database.ExecuteSqlRawAsync("""
                    IF OBJECT_ID('Hotels') IS NULL CREATE TABLE Hotels(HotelId int IDENTITY(1,1) PRIMARY KEY, IsActive bit NOT NULL);
                    IF OBJECT_ID('HotelAreas') IS NULL CREATE TABLE HotelAreas(AreaId int IDENTITY(1,1) PRIMARY KEY, HotelId int NOT NULL, ParentAreaId int NULL, IsActive bit NOT NULL);
                    IF OBJECT_ID('RoomTypes') IS NULL CREATE TABLE RoomTypes(RoomTypeId int IDENTITY(1,1) PRIMARY KEY, HotelId int NOT NULL, AreaId int NOT NULL, RoomTypeName nvarchar(100) NOT NULL, BasePrice decimal(18,2) NOT NULL, Capacity int NOT NULL, IsActive bit NOT NULL);
                    IF OBJECT_ID('Rooms') IS NULL CREATE TABLE Rooms(RoomId bigint IDENTITY(1,1) PRIMARY KEY, RoomTypeId int NOT NULL, AreaId int NOT NULL, RoomNumber varchar(20) NOT NULL, Floor int NOT NULL, Status varchar(20) NOT NULL, IsActive bit NOT NULL);
                    IF OBJECT_ID('StaffAreaAssignments') IS NULL CREATE TABLE StaffAreaAssignments(AssignmentId bigint IDENTITY(1,1) PRIMARY KEY, UserId bigint NOT NULL, AreaId int NOT NULL, IsActive bit NOT NULL);
                    SET IDENTITY_INSERT Hotels ON;
                    INSERT Hotels(HotelId, IsActive) VALUES (1, 1);
                    SET IDENTITY_INSERT Hotels OFF;
                    SET IDENTITY_INSERT HotelAreas ON;
                    INSERT HotelAreas(AreaId, HotelId, IsActive) VALUES (1, 1, 1);
                    SET IDENTITY_INSERT HotelAreas OFF;
                    SET IDENTITY_INSERT RoomTypes ON;
                    INSERT RoomTypes(RoomTypeId, HotelId, AreaId, RoomTypeName, BasePrice, Capacity, IsActive) VALUES (1, 1, 1, N'Deluxe', 500000, 2, 1);
                    SET IDENTITY_INSERT RoomTypes OFF;
                    SET IDENTITY_INSERT Rooms ON;
                    INSERT Rooms(RoomId, RoomTypeId, AreaId, RoomNumber, Floor, Status, IsActive) VALUES (1, 1, 1, '101', 1, 'Available', 1), (2, 1, 1, '102', 1, 'Available', 1);
                    SET IDENTITY_INSERT Rooms OFF;
                    """);
            }
            var day = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(10);
            Booking Booking(long room) => new() { BookingCode = Guid.NewGuid().ToString("N")[..20], CustomerId = 1, NumberOfGuests = 1, CheckInDate = day, CheckOutDate = day.AddDays(2), BookingStatus = BookingStatus.Pending, HoldExpiresAt = DateTime.UtcNow.AddMinutes(15), BookingDetails = [new BookingDetail { RoomId = room, NumberOfNights = 2, UnitPrice = 1, SubTotal = 2 }] };
            await using var first = new HotelBookingDBContext(options); await using var second = new HotelBookingDBContext(options);
            var results = await Task.WhenAll(new RoomInventoryRepository(first).Reserve(Booking(1)), new RoomInventoryRepository(second).Reserve(Booking(1)));
            Assert.Single(results, success => success);
            await using var third = new HotelBookingDBContext(options); await using var fourth = new HotelBookingDBContext(options);
            async Task<bool> Lock()
            {
                try { await new RoomInventoryRepository(third).CreateLocks(1, new([2], new(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), new(day.AddDays(2).ToDateTime(TimeOnly.MinValue), TimeSpan.Zero), "SQL test"), 1, true, default); return true; }
                catch (ConflictException) { return false; }
            }
            var mixed = await Task.WhenAll(Lock(), new RoomInventoryRepository(fourth).Reserve(Booking(2)));
            Assert.Single(mixed, success => success);
        }
        finally
        {
            // Only this test-created, randomly named database is removed.
            if (!name.StartsWith("HotelBookingInventoryTests_", StringComparison.Ordinal)) throw new InvalidOperationException("Unexpected test database name.");
            SqlConnection.ClearAllPools();
            await using var drop = master.CreateCommand(); drop.CommandText = $"ALTER DATABASE [{name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{name}];"; await drop.ExecuteNonQueryAsync();
        }
    }
}
