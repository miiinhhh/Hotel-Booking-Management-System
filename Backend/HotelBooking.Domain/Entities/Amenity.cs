namespace HotelBooking.Domain.Entities;

public sealed class Amenity
{
    public int AmenityId { get; private set; }
    public string AmenityName { get; private set; } = "";
    public string? Description { get; private set; }
    public bool IsActive { get; private set; } = true;
    private Amenity() { }
    public Amenity(string name, string? description) => Update(name, description);
    public void Update(string name, string? description)
    {
        name = name?.Trim() ?? "";
        description = description?.Trim();
        if (name.Length is < 1 or > 100 || description?.Length > 255)
            throw new DomainRuleException("Amenity name must contain 1-100 characters; description allows 255 characters.");
        AmenityName = name;
        Description = string.IsNullOrEmpty(description) ? null : description;
    }
    public void Deactivate() => IsActive = false;
}

public sealed class HotelAmenity
{
    public int HotelId { get; set; }
    public int AmenityId { get; set; }
    public Amenity Amenity { get; set; } = null!;
}

public sealed class RoomAmenity
{
    public long RoomId { get; set; }
    public int AmenityId { get; set; }
    public Amenity Amenity { get; set; } = null!;
}
