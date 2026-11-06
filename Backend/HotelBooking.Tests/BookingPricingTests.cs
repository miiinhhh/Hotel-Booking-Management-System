using HotelBooking.Application.DTOs.Booking;
using HotelBooking.Application.Services;
using HotelBooking.Domain.Entities;
using HotelBooking.Domain.Enums;
using HotelBooking.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;
using RoomDbContext = HotelBooking.Infrastructure.Persistence.HotelBookingDbContext;
using BookingDbContext = HotelBooking.Infrastructure.Data.HotelBookingDBContext;
using RoomRepository = HotelBooking.Infrastructure.Persistence.RoomRepository;
using Hotel = HotelBooking.Domain.Entities.RoomHotel;

namespace HotelBooking.Tests;

public sealed class BookingPricingTests
{
    private static readonly CancellationToken Ct = CancellationToken.None;

    private static (RoomDbContext RoomDb, BookingDbContext BookingDb) CreateDatabases()
    {
        var dbName = Guid.NewGuid().ToString();
        var roomDb = new RoomDbContext(
            new DbContextOptionsBuilder<RoomDbContext>()
                .UseInMemoryDatabase(dbName)
                .Options);

        var bookingDb = new BookingDbContext(
            new DbContextOptionsBuilder<BookingDbContext>()
                .UseInMemoryDatabase(dbName + "_booking")
                .Options);

        return (roomDb, bookingDb);
    }

    private static BookingPricingService CreateService(RoomDbContext roomDb, BookingDbContext bookingDb)
    {
        return new BookingPricingService(
            new RoomRepository(roomDb),
            new VoucherRepository(bookingDb));
    }

    private static (long RoomId, decimal BasePrice) SeedRoom(RoomDbContext db, decimal basePrice = 1_000_000m)
    {
        var hotel = new Hotel();
        db.Hotels.Add(hotel);
        db.Entry(hotel).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(hotel).Property(x => x.IsActive).CurrentValue = true;

        var area = new HotelArea();
        db.HotelAreas.Add(area);
        db.Entry(area).Property(x => x.AreaId).CurrentValue = 1;
        db.Entry(area).Property(x => x.HotelId).CurrentValue = 1;
        db.Entry(area).Property(x => x.IsActive).CurrentValue = true;

        var roomType = new RoomType(1, 1, "Deluxe Ocean View", "Sang trọng", basePrice, 2, 1);
        db.RoomTypes.Add(roomType);
        db.SaveChanges();

        var room = new Room(roomType.RoomTypeId, 1, "101", 1, RoomStatus.Available, "Tầng 1");
        db.Rooms.Add(room);
        db.SaveChanges();

        return (room.RoomId, basePrice);
    }

    [Fact]
    public async Task CalculatePrice_WhenCheckOutBeforeOrEqualToCheckIn_ReturnsFailure()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 5),
            RoomIds = new List<long> { 1 }
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.False(result.Success);
        Assert.Contains("sau ngày nhận phòng", result.Message);
    }

    [Fact]
    public async Task CalculatePrice_WhenRoomIdsEmpty_ReturnsFailure()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7),
            RoomIds = new List<long>()
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.False(result.Success);
        Assert.Contains("ít nhất 1 phòng", result.Message);
    }

    [Fact]
    public async Task CalculatePrice_StandardStay_CalculatesSubTotalTaxFeeDepositCorrectly()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);
        var (roomId, pricePerNight) = SeedRoom(roomDb, 1_000_000m);

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7), // 2 đêm
            RoomIds = new List<long> { roomId },
            PaymentMethod = "Deposit"
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.True(result.Success);
        var data = result.Data!;
        Assert.Equal(2, data.NumberOfNights);

        // 2 đêm x 1.000.000đ = 2.000.000đ
        Assert.Equal(2_000_000m, data.SubTotal);
        Assert.Equal(0m, data.DiscountAmount);

        // Phí phục vụ 5% = 100.000đ
        Assert.Equal(0m, data.FeeAmount);

        // VAT 10% trên (2.000.000 + 100.000) = 210.000đ
        Assert.Equal(0m, data.TaxAmount);

        // Tổng cộng = 2.000.000 + 100.000 + 210.000 = 2.310.000đ
        Assert.Equal(2_000_000m, data.TotalAmount);

        // Đặt cọc 30% = 693.000đ
        Assert.Equal(70m, data.DepositPercentage);
        Assert.Equal(1_400_000m, data.DepositAmount);

        // Còn lại = 1.617.000đ
        Assert.Equal(600_000m, data.RemainingAmount);
    }

    [Fact]
    public async Task CalculatePrice_WithPercentageVoucher_AppliesDiscountAccurately()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);
        var (roomId, _) = SeedRoom(roomDb, 1_000_000m);

        // Tạo Voucher giảm 10%
        bookingDb.Vouchers.Add(new Voucher
        {
            Code = "LUXE10",
            VoucherType = VoucherType.Percentage,
            DiscountValue = 10m,
            MinimumOrderAmount = 500_000m,
            StartAt = DateTime.UtcNow.AddDays(-1),
            EndAt = DateTime.UtcNow.AddDays(10),
            IsActive = true
        });
        await bookingDb.SaveChangesAsync();

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7), // 2 đêm: 2.000.000đ
            RoomIds = new List<long> { roomId },
            VoucherCode = "luxe10", // Test case-insensitive
            PaymentMethod = "Deposit"
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.True(result.Success);
        var data = result.Data!;

        // Giảm 10% của 2.000.000 = 200.000đ
        Assert.Equal(200_000m, data.DiscountAmount);
        Assert.Equal(1_800_000m, data.SubTotalAfterDiscount);

        // Fee 5% của 1.800.000 = 90.000đ
        Assert.Equal(0m, data.FeeAmount);

        // Tax 10% của (1.800.000 + 90.000) = 189.000đ
        Assert.Equal(0m, data.TaxAmount);

        // Total = 1.800.000 + 90.000 + 189.000 = 2.079.000đ
        Assert.Equal(1_800_000m, data.TotalAmount);
    }

    [Fact]
    public async Task CalculatePrice_WithFixedAmountVoucher_AppliesDiscountAccurately()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);
        var (roomId, _) = SeedRoom(roomDb, 1_000_000m);

        // Tạo Voucher giảm 500.000đ
        bookingDb.Vouchers.Add(new Voucher
        {
            Code = "MINUS500",
            VoucherType = VoucherType.FixedAmount,
            DiscountValue = 500_000m,
            MinimumOrderAmount = 1_000_000m,
            StartAt = DateTime.UtcNow.AddDays(-1),
            EndAt = DateTime.UtcNow.AddDays(10),
            IsActive = true
        });
        await bookingDb.SaveChangesAsync();

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7), // 2 đêm: 2.000.000đ
            RoomIds = new List<long> { roomId },
            VoucherCode = "MINUS500",
            PaymentMethod = "Deposit"
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.True(result.Success);
        var data = result.Data!;

        Assert.Equal(500_000m, data.DiscountAmount);
        Assert.Equal(1_500_000m, data.SubTotalAfterDiscount);
    }

    [Fact]
    public async Task CalculatePrice_WithExpiredVoucher_KeepsZeroDiscountAndExplainsReason()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);
        var (roomId, _) = SeedRoom(roomDb, 1_000_000m);

        bookingDb.Vouchers.Add(new Voucher
        {
            Code = "EXPIRED",
            VoucherType = VoucherType.Percentage,
            DiscountValue = 20m,
            StartAt = DateTime.UtcNow.AddDays(-10),
            EndAt = DateTime.UtcNow.AddDays(-1), // Đã hết hạn
            IsActive = true
        });
        await bookingDb.SaveChangesAsync();

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7),
            RoomIds = new List<long> { roomId },
            VoucherCode = "EXPIRED"
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.True(result.Success);
        var data = result.Data!;
        Assert.Equal(0m, data.DiscountAmount);
        Assert.NotNull(data.VoucherMessage);
        Assert.Contains("hết hạn", data.VoucherMessage);
    }

    [Fact]
    public async Task CalculatePrice_CashPayment_SetsZeroDeposit()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var service = CreateService(roomDb, bookingDb);
        var (roomId, _) = SeedRoom(roomDb, 1_000_000m);

        var request = new CalculatePriceRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7),
            RoomIds = new List<long> { roomId },
            PaymentMethod = "Cash"
        };

        var result = await service.CalculatePriceAsync(request, Ct);

        Assert.True(result.Success);
        var data = result.Data!;
        Assert.Equal(0m, data.DepositPercentage);
        Assert.Equal(0m, data.DepositAmount);
        Assert.Equal(data.TotalAmount, data.RemainingAmount);
    }

    [Fact]
    public async Task CreateBookingAsync_UsesAuthoritativePricing_AndIncrementsVoucherUsedCount()
    {
        var (roomDb, bookingDb) = CreateDatabases();
        var pricingService = CreateService(roomDb, bookingDb);
        var (roomId, pricePerNight) = SeedRoom(roomDb, 1_000_000m);

        var voucher = new Voucher
        {
            Code = "WELCOME10",
            VoucherType = VoucherType.Percentage,
            DiscountValue = 10m,
            MinimumOrderAmount = 500_000m,
            StartAt = DateTime.UtcNow.AddDays(-1),
            EndAt = DateTime.UtcNow.AddDays(10),
            UsageLimit = 10,
            UsedCount = 0,
            IsActive = true
        };
        bookingDb.Vouchers.Add(voucher);
        await bookingDb.SaveChangesAsync();

        var voucherRepo = new VoucherRepository(bookingDb);
        var bookingRepo = new BookingRepository(bookingDb);
        // InMemory contexts do not share SQL tables; seed inventory projections explicitly.
        bookingDb.Add(new HotelBooking.Infrastructure.Data.InventoryHotel { HotelId = 1, IsActive = true });
        bookingDb.Add(new HotelBooking.Infrastructure.Data.InventoryArea { AreaId = 1, HotelId = 1, IsActive = true });
        bookingDb.Add(new HotelBooking.Infrastructure.Data.InventoryType { RoomTypeId = 1, HotelId = 1, AreaId = 1, IsActive = true, Capacity = 2, BasePrice = pricePerNight, RoomTypeName = "Deluxe" });
        bookingDb.Add(new HotelBooking.Infrastructure.Data.InventoryRoom { RoomId = roomId, RoomTypeId = 1, AreaId = 1, RoomNumber = "101", Status = "Available", IsActive = true });
        await bookingDb.SaveChangesAsync();
        var bookingService = new BookingServices(bookingRepo, pricingService, voucherRepo);

        var request = new CreateBookingRequest
        {
            CheckInDate = new DateOnly(2026, 11, 5),
            CheckOutDate = new DateOnly(2026, 11, 7), // 2 đêm
            NumberOfGuests = 2,
            PaymentMethod = "Deposit",
            VoucherCode = "WELCOME10",
            Rooms = new List<BookingRoomItemRequest>
            {
                new BookingRoomItemRequest
                {
                    RoomId = roomId,
                    UnitPrice = 1000m // Hack attempt: Client cố tình truyền 1000đ thay vì 1.000.000đ
                }
            }
        };

        var response = await bookingService.CreateBookingAsync(customerId: 99, request);

        Assert.True(response.Success);
        var booking = response.Data!;

        // Đảm bảo UnitPrice được lấy chuẩn từ DB (1.000.000đ) chứ KHÔNG PHẢI 1.000đ từ client
        Assert.Single(booking.Details);
        Assert.Equal(1_000_000m, booking.Details[0].UnitPrice);
        Assert.Equal(2_000_000m, booking.Details[0].SubTotal);

        // Đảm bảo voucher 10% được áp dụng: giảm 200.000đ
        Assert.Equal(200_000m, booking.DiscountAmount);
        Assert.Equal(1_800_000m, booking.TotalAmount);

        // Đảm bảo UsedCount của voucher được tăng lên 1
        var updatedVoucher = await bookingDb.Vouchers.FindAsync(voucher.VoucherId);
        Assert.NotNull(updatedVoucher);
        Assert.Equal(1, updatedVoucher.UsedCount);
    }
}
