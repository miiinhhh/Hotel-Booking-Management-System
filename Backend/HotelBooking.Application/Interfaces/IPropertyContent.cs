using HotelBooking.Application.DTOs;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Interfaces;

public sealed class ContentAccessDeniedException() : Exception("Administrator permission is required.");
public interface IContentAccess
{
    Task EnsureAdminAsync(long userId, CancellationToken ct);
}
public interface IImageStorage
{
    Task<StoredImage> StoreAsync(ImageUpload upload, CancellationToken ct);
    Task<ImageFile> OpenAsync(string key, string contentType, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
}
public interface IPropertyContentRepository
{
    Task<IReadOnlyList<Amenity>> ListAmenitiesAsync(CancellationToken ct);
    Task<Amenity?> FindAmenityAsync(int id, CancellationToken ct);
    Task<bool> AmenityNameExistsAsync(string name, int exceptId, CancellationToken ct);
    void AddAmenity(Amenity amenity);
    Task EnsureScopeAsync(ImageScope scope, bool publicRead, CancellationToken ct);
    Task<IReadOnlyList<Amenity>> LinkedAmenitiesAsync(ImageScope scope, CancellationToken ct);
    Task SetAmenityAsync(ImageScope scope, int amenityId, bool assigned, CancellationToken ct);
    Task<IReadOnlyList<IPropertyImage>> ImagesAsync(ImageScope scope, CancellationToken ct);
    IPropertyImage AddImage(ImageScope scope, StoredImage stored, string? altText, int order);
    void RemoveImage(IPropertyImage image);
    Task SaveAsync(CancellationToken ct);
    Task<T> InGalleryTransactionAsync<T>(ImageScope scope, Func<Task<T>> operation, CancellationToken ct);
    void QueueFileDeletion(string key);
}
public interface IPropertyContentService
{
    Task<IReadOnlyList<AmenityDto>> ListAmenitiesAsync(CancellationToken ct);
    Task<AmenityDto> GetAmenityAsync(int id, CancellationToken ct);
    Task<AmenityDto> CreateAmenityAsync(long actor, AmenityRequest request, CancellationToken ct);
    Task<AmenityDto> UpdateAmenityAsync(long actor, int id, AmenityRequest request, CancellationToken ct);
    Task DeleteAmenityAsync(long actor, int id, CancellationToken ct);
    Task<IReadOnlyList<AmenityDto>> LinkedAmenitiesAsync(ImageScope scope, CancellationToken ct);
    Task SetAmenityAsync(long actor, ImageScope scope, int amenityId, bool assigned, CancellationToken ct);
    Task<IReadOnlyList<ImageDto>> ImagesAsync(ImageScope scope, CancellationToken ct);
    Task<ImageDto> UploadAsync(long actor, ImageScope scope, ImageUpload upload, CancellationToken ct);
    Task<ImageFile> OpenImageAsync(ImageScope scope, long id, CancellationToken ct);
    Task DeleteImageAsync(long actor, ImageScope scope, long id, CancellationToken ct);
    Task SelectPrimaryAsync(long actor, ImageScope scope, long id, CancellationToken ct);
    Task ReorderAsync(long actor, ImageScope scope, IReadOnlyList<long> ids, CancellationToken ct);
}
