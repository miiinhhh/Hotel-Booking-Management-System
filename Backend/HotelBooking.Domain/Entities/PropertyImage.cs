namespace HotelBooking.Domain.Entities;

public interface IPropertyImage
{
    long ImageId { get; }
    string ImageUrl { get; }
    string? AltText { get; }
    int DisplayOrder { get; }
    bool IsPrimary { get; }
    DateTime CreatedAt { get; }
    string? StorageKey { get; }
    string? OriginalFileName { get; }
    string? ContentType { get; }
    long? FileSize { get; }
    int? Width { get; }
    int? Height { get; }
    void SetPrimary(bool value);
    void SetOrder(int value);
}

public static class ImageRules
{
    public static void ValidateOrder(int value)
    {
        if (value < 0) throw new DomainRuleException("Image order cannot be negative.");
    }
    public static void SelectPrimary(IReadOnlyList<IPropertyImage> gallery, IPropertyImage selected)
    {
        if (!gallery.Contains(selected)) throw new DomainRuleException("Image does not belong to this gallery.");
        foreach (var image in gallery) image.SetPrimary(ReferenceEquals(image, selected));
    }
}

public sealed class HotelImage : IPropertyImage
{
    public long ImageId { get; set; }
    public int HotelId { get; set; }
    public string ImageUrl { get; set; } = "";
    public string? AltText { get; set; }
    public int DisplayOrder { get; private set; }
    public bool IsPrimary { get; private set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? StorageKey { get; set; }
    public string? OriginalFileName { get; set; }
    public string? ContentType { get; set; }
    public long? FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public void SetPrimary(bool value) => IsPrimary = value;
    public void SetOrder(int value) { ImageRules.ValidateOrder(value); DisplayOrder = value; }
}

public sealed class RoomImage : IPropertyImage
{
    public long ImageId { get; set; }
    public long RoomId { get; set; }
    public string ImageUrl { get; set; } = "";
    public string? AltText { get; set; }
    public int DisplayOrder { get; private set; }
    public bool IsPrimary { get; private set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? StorageKey { get; set; }
    public string? OriginalFileName { get; set; }
    public string? ContentType { get; set; }
    public long? FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public void SetPrimary(bool value) => IsPrimary = value;
    public void SetOrder(int value) { ImageRules.ValidateOrder(value); DisplayOrder = value; }
}
