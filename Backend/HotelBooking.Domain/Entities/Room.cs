namespace HotelBooking.Domain.Entities;

public enum RoomStatus { Available, Occupied, Maintenance, Inactive }
public sealed class DomainRuleException(string message) : Exception(message);

public sealed class Hotel
{
    public int HotelId { get; private set; }
    public bool IsActive { get; private set; }
    public ICollection<RoomType> RoomTypes { get; private set; } = new List<RoomType>();
}

public sealed class HotelArea
{
    public int AreaId { get; private set; }
    public int HotelId { get; private set; }
    public bool IsActive { get; private set; }
    public Hotel Hotel { get; private set; } = null!;
    public ICollection<Room> Rooms { get; private set; } = new List<Room>();
}

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
    public Hotel Hotel { get; private set; } = null!;
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

public sealed class Room
{
    public long RoomId { get; private set; }
    public int RoomTypeId { get; private set; }
    public int AreaId { get; private set; }
    public string RoomNumber { get; private set; } = "";
    public int Floor { get; private set; }
    public RoomStatus Status { get; private set; }
    public string? Description { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; private set; }
    public RoomType RoomType { get; private set; } = null!;
    public HotelArea Area { get; private set; } = null!;
    private Room() { }
    public Room(int typeId, int areaId, string number, int floor, RoomStatus status, string? description)
    {
        AreaId = areaId; Update(typeId, number, floor, status, description); UpdatedAt = null;
    }
    public void Update(int typeId, string number, int floor, RoomStatus status, string? description)
    {
        if (typeId <= 0 || AreaId <= 0) throw new DomainRuleException("Room type and area IDs must be positive.");
        if (string.IsNullOrWhiteSpace(number) || number.Trim().Length > 20 || number.Any(c => c > 127)) throw new DomainRuleException("Room number must contain 1 to 20 ASCII characters.");
        if (floor < 0 || !Enum.IsDefined(status)) throw new DomainRuleException("Invalid floor or room status.");
        if (description?.Length > 500) throw new DomainRuleException("Description cannot exceed 500 characters.");
        if (Status == RoomStatus.Occupied && status == RoomStatus.Inactive) throw new DomainRuleException("Cannot deactivate an occupied room.");
        if (Status == RoomStatus.Occupied && (typeId != RoomTypeId || number.Trim() != RoomNumber || floor != Floor)) throw new DomainRuleException("Cannot change the identity of an occupied room.");
        RoomTypeId = typeId; RoomNumber = number.Trim(); Floor = floor; Status = status; Description = description;
        IsActive = status != RoomStatus.Inactive; UpdatedAt = DateTime.UtcNow;
    }
    public void Deactivate()
    {
        if (Status == RoomStatus.Occupied) throw new DomainRuleException("Cannot deactivate an occupied room.");
        Status = RoomStatus.Inactive; IsActive = false; UpdatedAt = DateTime.UtcNow;
    }
}
