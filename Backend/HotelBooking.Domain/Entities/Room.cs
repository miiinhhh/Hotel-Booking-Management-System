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
