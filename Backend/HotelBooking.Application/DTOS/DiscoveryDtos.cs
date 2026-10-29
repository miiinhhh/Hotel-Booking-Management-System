using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.DTOs;

public sealed class HotelDiscoveryRequest
{
    [StringLength(100)] public string? Location { get; init; }
    [StringLength(100)] public string? RoomTypeName { get; init; }
    public DateOnly CheckIn { get; init; }
    public DateOnly CheckOut { get; init; }
    [Range(1, 100)] public int Adults { get; init; } = 2;
    [Range(0, 100)] public int Children { get; init; }
    [Range(1, 20)] public int Rooms { get; init; } = 1;
    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)] public decimal? MinPrice { get; init; }
    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)] public decimal? MaxPrice { get; init; }
    public string Sort { get; init; } = "price_asc";
    [Range(1, int.MaxValue)] public int Page { get; init; } = 1;
    [Range(1, 50)] public int PageSize { get; init; } = 12;
    public int? AmenityId { get; init; }
}
public sealed record HotelCardDto(int HotelId, string Name, string Address, string City, string? ImageUrl,
    string RoomTypeName, decimal PricePerNight, int AvailableRooms, int Capacity);
public sealed record DiscoveryPage(IReadOnlyList<HotelCardDto> Items, int TotalCount, int Page, int PageSize, int TotalPages, string? Message);
public sealed record DiscoveryRoom(long RoomId, int RoomTypeId, string Name, string RoomNumber, int Floor,
    decimal PricePerNight, int Capacity, string? ImageUrl, IReadOnlyList<AmenityDto> Amenities);
public sealed record HotelPolicyDto(string CheckInTime, string CheckOutTime, string? CancellationPolicy);
public sealed record HotelDiscoveryDetail(int HotelId, string Name, string Address, string City, string? Description,
    HotelPolicyDto Policies, IReadOnlyList<ImageDto> Images, IReadOnlyList<AmenityDto> Amenities,
    IReadOnlyList<DiscoveryRoom> Rooms, DateOnly CheckIn, DateOnly CheckOut);
public sealed record HotelPolicyRequest([StringLength(2000)] string? CancellationPolicy);
public sealed record ReportFilter(DateOnly From, DateOnly To, int? HotelId);
public sealed record ReportDay(DateOnly Date, decimal Revenue, int Bookings, int OccupiedRoomNights, int AvailableRoomNights);
public sealed record BusinessReport(DateOnly From, DateOnly To, int? HotelId, decimal Revenue,
    int BookingCount, int CancelledBookings, decimal CancellationRate, int OccupiedRoomNights,
    int AvailableRoomNights, decimal OccupancyRate, IReadOnlyList<ReportDay> Days);
public sealed record ReportBooking(DateTime CreatedAt, bool IsCancelled);
public sealed record ReportReceipt(DateTime PaidAt, decimal SignedAmount);
public sealed record ReportStay(long RoomId, DateOnly CheckIn, DateOnly CheckOut);
public sealed record ReportLock(long RoomId, DateTime StartsAt, DateTime EndsAt);
public sealed record ReportSource(IReadOnlyList<long> Rooms, IReadOnlyList<ReportBooking> Bookings,
    IReadOnlyList<ReportReceipt> Receipts, IReadOnlyList<ReportStay> Stays, IReadOnlyList<ReportLock> Locks);
