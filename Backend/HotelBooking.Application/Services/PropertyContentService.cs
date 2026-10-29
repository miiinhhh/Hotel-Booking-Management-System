using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;

namespace HotelBooking.Application.Services;

public sealed class PropertyContentService(IPropertyContentRepository repository,
    IImageStorage storage, IContentAccess access) : IPropertyContentService
{
    private static AmenityDto Map(Amenity a) => new(a.AmenityId, a.AmenityName, a.Description, a.IsActive);
    private static ImageDto Map(IPropertyImage i) => new(i.ImageId, i.ImageUrl, i.AltText, i.DisplayOrder,
        i.IsPrimary, i.CreatedAt, i.OriginalFileName, i.ContentType, i.FileSize, i.Width, i.Height);
    private async Task<Amenity> Amenity(int id, CancellationToken ct) =>
        await repository.FindAmenityAsync(id, ct) ?? throw new NotFoundException("Amenity not found.");
    public async Task<IReadOnlyList<AmenityDto>> ListAmenitiesAsync(CancellationToken ct) =>
        (await repository.ListAmenitiesAsync(ct)).Select(Map).ToList();
    public async Task<AmenityDto> GetAmenityAsync(int id, CancellationToken ct)
    {
        var amenity = await Amenity(id, ct);
        if (!amenity.IsActive) throw new NotFoundException("Amenity not found.");
        return Map(amenity);
    }
    public async Task<AmenityDto> CreateAmenityAsync(long actor, AmenityRequest request, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        var amenity = new Amenity(request.Name, request.Description);
        if (await repository.AmenityNameExistsAsync(amenity.AmenityName, 0, ct))
            throw new ConflictException("Amenity name already exists.");
        repository.AddAmenity(amenity);
        await repository.SaveAsync(ct);
        return Map(amenity);
    }
    public async Task<AmenityDto> UpdateAmenityAsync(long actor, int id, AmenityRequest request, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        var amenity = await Amenity(id, ct);
        if (!amenity.IsActive) throw new ConflictException("Amenity is inactive.");
        amenity.Update(request.Name, request.Description);
        if (await repository.AmenityNameExistsAsync(amenity.AmenityName, id, ct))
            throw new ConflictException("Amenity name already exists.");
        await repository.SaveAsync(ct);
        return Map(amenity);
    }
    public async Task DeleteAmenityAsync(long actor, int id, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        (await Amenity(id, ct)).Deactivate(); // Keep existing associations/history.
        await repository.SaveAsync(ct);
    }
    public async Task<IReadOnlyList<AmenityDto>> LinkedAmenitiesAsync(ImageScope scope, CancellationToken ct)
    {
        await repository.EnsureScopeAsync(scope, true, ct);
        return (await repository.LinkedAmenitiesAsync(scope, ct)).Select(Map).ToList();
    }
    public async Task SetAmenityAsync(long actor, ImageScope scope, int amenityId, bool assigned, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        await repository.EnsureScopeAsync(scope, false, ct);
        var amenity = await Amenity(amenityId, ct);
        if (assigned && !amenity.IsActive) throw new ConflictException("Cannot assign an inactive amenity.");
        await repository.SetAmenityAsync(scope, amenityId, assigned, ct);
        await repository.SaveAsync(ct);
    }
    public async Task<IReadOnlyList<ImageDto>> ImagesAsync(ImageScope scope, CancellationToken ct)
    {
        await repository.EnsureScopeAsync(scope, true, ct);
        return (await repository.ImagesAsync(scope, ct)).Select(Map).ToList();
    }
    private static IPropertyImage Find(IReadOnlyList<IPropertyImage> gallery, long id) =>
        gallery.SingleOrDefault(x => x.ImageId == id) ?? throw new NotFoundException("Image not found in this gallery.");
    public async Task<ImageDto> UploadAsync(long actor, ImageScope scope, ImageUpload upload, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        await repository.EnsureScopeAsync(scope, false, ct);
        var altText = upload.AltText?.Trim();
        if (altText?.Length > 255) throw new DomainRuleException("Alt text allows at most 255 characters.");
        var stored = await storage.StoreAsync(upload, ct);
        try
        {
            return await repository.InGalleryTransactionAsync(scope, async () =>
            {
                var gallery = await repository.ImagesAsync(scope, ct);
                if (gallery.Count >= 100) throw new ConflictException("A gallery allows at most 100 images.");
                var order = gallery.Count == 0 ? 0 : checked(gallery.Max(x => x.DisplayOrder) + 1);
                // Clear old primary first, avoiding transient unique-index violations.
                if (upload.IsPrimary)
                {
                    foreach (var old in gallery) old.SetPrimary(false);
                    await repository.SaveAsync(ct);
                }
                var image = repository.AddImage(scope, stored, altText, order);
                image.SetPrimary(upload.IsPrimary || !gallery.Any(x => x.IsPrimary));
                await repository.SaveAsync(ct);
                return Map(image);
            }, ct);
        }
        catch
        {
            // Metadata did not commit. Never retain an unreferenced upload on normal failures.
            await storage.DeleteAsync(stored.Key, CancellationToken.None);
            throw;
        }
    }
    public async Task<ImageFile> OpenImageAsync(ImageScope scope, long id, CancellationToken ct)
    {
        await repository.EnsureScopeAsync(scope, true, ct);
        var image = Find(await repository.ImagesAsync(scope, ct), id);
        if (image.StorageKey is null || image.ContentType is null)
            throw new NotFoundException("This legacy image is available at its original URL only.");
        return await storage.OpenAsync(image.StorageKey, image.ContentType, ct);
    }
    public async Task DeleteImageAsync(long actor, ImageScope scope, long id, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        await repository.EnsureScopeAsync(scope, false, ct);
        await repository.InGalleryTransactionAsync(scope, async () =>
        {
            var gallery = await repository.ImagesAsync(scope, ct);
            var image = Find(gallery, id);
            repository.RemoveImage(image);
            if (image.StorageKey is { } key) repository.QueueFileDeletion(key);
            await repository.SaveAsync(ct);
            var remaining = gallery.Where(x => !ReferenceEquals(x, image)).ToList();
            if (remaining.Count > 0 && !remaining.Any(x => x.IsPrimary))
            {
                ImageRules.SelectPrimary(remaining, remaining[0]);
                await repository.SaveAsync(ct);
            }
            return true;
        }, ct);
        // Disk cleanup is durable and retried by Infrastructure; no loss of metadata on file IO errors.
    }
    public async Task SelectPrimaryAsync(long actor, ImageScope scope, long id, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        await repository.EnsureScopeAsync(scope, false, ct);
        await repository.InGalleryTransactionAsync(scope, async () =>
        {
            var gallery = await repository.ImagesAsync(scope, ct);
            var selected = Find(gallery, id);
            foreach (var image in gallery) image.SetPrimary(false);
            await repository.SaveAsync(ct);
            ImageRules.SelectPrimary(gallery, selected);
            await repository.SaveAsync(ct);
            return true;
        }, ct);
    }
    public async Task ReorderAsync(long actor, ImageScope scope, IReadOnlyList<long> ids, CancellationToken ct)
    {
        await access.EnsureAdminAsync(actor, ct);
        await repository.EnsureScopeAsync(scope, false, ct);
        if (ids is null || ids.Count > 100 || ids.Distinct().Count() != ids.Count)
            throw new DomainRuleException("Provide unique image IDs (at most 100).");
        await repository.InGalleryTransactionAsync(scope, async () =>
        {
            var gallery = await repository.ImagesAsync(scope, ct);
            if (ids.Count != gallery.Count || !ids.ToHashSet().SetEquals(gallery.Select(x => x.ImageId)))
                throw new DomainRuleException("Provide every image in this gallery exactly once.");
            var images = gallery.ToDictionary(x => x.ImageId);
            for (var index = 0; index < ids.Count; index++) images[ids[index]].SetOrder(index);
            await repository.SaveAsync(ct);
            return true;
        }, ct);
    }
}
