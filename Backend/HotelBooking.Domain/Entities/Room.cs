namespace HotelBooking.Domain.Entities;

public enum RoomStatus { Available, Occupied, Maintenance, Inactive }
public sealed class DomainRuleException(string message) : Exception(message);

public sealed class RoomHotel
{
    public int HotelId { get; private set; }
    public bool IsActive { get; private set; }
    public ICollection<RoomType> RoomTypes { get; private set; } = new List<RoomType>();
}

public sealed class HotelArea
{
    public int AreaId { get; set; }
    public int HotelId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string AreaType { get; set; } = "Zone"; // "Zone" | "Building"
    public int? ParentAreaId { get; set; }
    public string? Description { get; set; }
    public string? LocationDescription { get; set; }
    public int? FloorCount { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public RoomHotel Hotel { get; set; } = null!;
    public HotelArea? ParentArea { get; set; }
    public ICollection<HotelArea> SubAreas { get; set; } = new List<HotelArea>();
    public ICollection<RoomType> RoomTypes { get; set; } = new List<RoomType>();
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
    public ICollection<StaffAreaAssignment> StaffAssignments { get; set; } = new List<StaffAreaAssignment>();

    public HotelArea() { }

    public HotelArea(
        int hotelId,
        string areaName,
        string areaType,
        int? parentAreaId,
        string? description,
        string? locationDescription,
        int? floorCount,
        bool isActive = true)
    {
        if (hotelId <= 0) throw new DomainRuleException("Hotel ID must be positive.");

        HotelId = hotelId;
        Apply(areaName, areaType, parentAreaId, description, locationDescription, floorCount, isActive);
        CreatedAt = DateTime.UtcNow;
        UpdatedAt = null;
    }

    public void Update(
        string areaName,
        string areaType,
        int? parentAreaId,
        string? description,
        string? locationDescription,
        int? floorCount,
        bool isActive)
    {
        Apply(areaName, areaType, parentAreaId, description, locationDescription, floorCount, isActive);
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    private void Apply(
        string areaName,
        string areaType,
        int? parentAreaId,
        string? description,
        string? locationDescription,
        int? floorCount,
        bool isActive)
    {
        var normalizedName = areaName?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedName) || normalizedName.Length > 150)
            throw new DomainRuleException("Area name must contain 1 to 150 characters.");

        var normalizedType = areaType?.Trim();
        if (string.Equals(normalizedType, "Zone", StringComparison.OrdinalIgnoreCase))
            normalizedType = "Zone";
        else if (string.Equals(normalizedType, "Building", StringComparison.OrdinalIgnoreCase))
            normalizedType = "Building";
        else
            throw new DomainRuleException("Area type must be Zone or Building.");

        if (normalizedType == "Zone" && parentAreaId.HasValue)
            throw new DomainRuleException("A Zone cannot have a parent area.");
        if (normalizedType == "Building" && !parentAreaId.HasValue)
            throw new DomainRuleException("A Building must belong to a parent Zone.");
        if (parentAreaId <= 0)
            throw new DomainRuleException("Parent area ID must be positive.");
        if (description?.Trim().Length > 500)
            throw new DomainRuleException("Description cannot exceed 500 characters.");
        if (locationDescription?.Trim().Length > 500)
            throw new DomainRuleException("Location description cannot exceed 500 characters.");
        if (floorCount is <= 0)
            throw new DomainRuleException("Floor count must be positive when provided.");

        AreaName = normalizedName;
        AreaType = normalizedType;
        ParentAreaId = parentAreaId;
        Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        LocationDescription = string.IsNullOrWhiteSpace(locationDescription) ? null : locationDescription.Trim();
        FloorCount = floorCount;
        IsActive = isActive;
    }
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
