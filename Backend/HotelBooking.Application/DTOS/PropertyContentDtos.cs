using System.ComponentModel.DataAnnotations;

namespace HotelBooking.Application.DTOs;

public sealed record AmenityRequest([Required, StringLength(100)] string Name, [StringLength(255)] string? Description);
public sealed record AmenityDto(int AmenityId, string Name, string? Description, bool IsActive);
public sealed record ImageDto(long ImageId, string Url, string? AltText, int DisplayOrder, bool IsPrimary,
    DateTime CreatedAt, string? OriginalFileName, string? ContentType, long? FileSize, int? Width, int? Height);
public sealed record ImageOrderRequest([Required, MinLength(1)] long[] ImageIds);
public sealed record ImageUpload(Stream Content, string FileName, string ContentType, long Length,
    string? AltText, bool IsPrimary);
public sealed record ImageScope(int HotelId, long? RoomId = null);
public sealed record StoredImage(string Key, string Url, string OriginalFileName,
    string ContentType, long FileSize, int Width, int Height);
public sealed record ImageFile(Stream Content, string ContentType);
