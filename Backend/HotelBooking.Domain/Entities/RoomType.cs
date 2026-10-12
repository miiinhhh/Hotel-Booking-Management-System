namespace HotelBooking.Domain.Entities;

public sealed class RoomType
{
    public int RoomTypeId { get; private set; }
    public int HotelId { get; private set; }
    public int AreaId { get; private set; }
    public string RoomTypeName { get; private set; } = "";
    public string? Description { get; private set; }
    public decimal BasePrice { get; private set; }
    public int Capacity { get; private set; }
    public int NumberOfBeds { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; private set; }
    public RoomHotel Hotel { get; private set; } = null!;
    public HotelArea Area { get; private set; } = null!;
    public ICollection<Room> Rooms { get; private set; } = new List<Room>();
    private RoomType() { }
    public RoomType(int hotelId, int areaId, string name, string? description, decimal price, int capacity, int beds)
    {
        if (hotelId <= 0 || areaId <= 0) throw new DomainRuleException("Hotel and area IDs must be positive.");
        HotelId = hotelId; AreaId = areaId;
        Update(name, description, price, capacity, beds); UpdatedAt = null;
    }
    public void Update(string name, string? description, decimal price, int capacity, int beds)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 100) throw new DomainRuleException("Room type name must contain 1 to 100 characters.");
        if (price < 0 || price > 9999999999999999.99m || decimal.Round(price, 2) != price) throw new DomainRuleException("Price must be nonnegative with at most two decimal places.");
        if (capacity <= 0 || beds <= 0) throw new DomainRuleException("Capacity and bed count must be positive.");
        RoomTypeName = name.Trim(); Description = description; BasePrice = price; Capacity = capacity; NumberOfBeds = beds; UpdatedAt = DateTime.UtcNow;
    }
    public void Deactivate() { IsActive = false; UpdatedAt = DateTime.UtcNow; }
}
