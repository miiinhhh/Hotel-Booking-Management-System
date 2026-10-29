using System.Data;
using HotelBooking.Application.Auth;
using HotelBooking.Application.DTOs;
using HotelBooking.Application.Interfaces;
using HotelBooking.Application.Rooms;
using HotelBooking.Domain.Entities;
using HotelBooking.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Repositories;

public sealed class ContentAccess(IUserRepository users) : IContentAccess
{
    public async Task EnsureAdminAsync(long userId, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId, ct);
        if (user is null || !user.IsActive || !user.UserRoles.Any(x => x.Role.RoleName == SystemRoles.Admin))
            throw new ContentAccessDeniedException();
    }
}

public sealed class PropertyContentRepository(HotelBookingDbContext db) : IPropertyContentRepository
{
    public async Task<IReadOnlyList<Amenity>> ListAmenitiesAsync(CancellationToken ct) =>
        await db.Amenities.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.AmenityName).ThenBy(x => x.AmenityId).ToListAsync(ct);
    public Task<Amenity?> FindAmenityAsync(int id, CancellationToken ct) => db.Amenities.SingleOrDefaultAsync(x => x.AmenityId == id, ct);
    public Task<bool> AmenityNameExistsAsync(string name, int exceptId, CancellationToken ct) =>
        db.Amenities.AnyAsync(x => x.AmenityId != exceptId && x.AmenityName.ToUpper() == name.ToUpper(), ct);
    public void AddAmenity(Amenity amenity) => db.Amenities.Add(amenity);
    public async Task EnsureScopeAsync(ImageScope scope, bool publicRead, CancellationToken ct)
    {
        var hotelExists = await db.Hotels.AnyAsync(x => x.HotelId == scope.HotelId && (!publicRead || x.IsActive), ct);
        if (!hotelExists) throw new NotFoundException("Hotel not found.");
        if (scope.RoomId is { } id && !await db.Rooms.AnyAsync(x => x.RoomId == id &&
            x.RoomType.HotelId == scope.HotelId && (!publicRead || (x.IsActive && x.RoomType.IsActive && x.Area.IsActive)), ct))
            throw new NotFoundException("Room not found in this hotel.");
    }
    public async Task<IReadOnlyList<Amenity>> LinkedAmenitiesAsync(ImageScope scope, CancellationToken ct) =>
        scope.RoomId is { } id
            ? await db.RoomAmenities.Where(x => x.RoomId == id && x.Amenity.IsActive).Select(x => x.Amenity).OrderBy(x => x.AmenityName).ToListAsync(ct)
            : await db.HotelAmenities.Where(x => x.HotelId == scope.HotelId && x.Amenity.IsActive).Select(x => x.Amenity).OrderBy(x => x.AmenityName).ToListAsync(ct);
    public async Task SetAmenityAsync(ImageScope scope, int amenityId, bool assigned, CancellationToken ct)
    {
        if (scope.RoomId is { } roomId)
        {
            var link = await db.RoomAmenities.FindAsync([roomId, amenityId], ct);
            if (assigned && link is null) db.RoomAmenities.Add(new() { RoomId = roomId, AmenityId = amenityId });
            if (!assigned && link is not null) db.RoomAmenities.Remove(link);
        }
        else
        {
            var link = await db.HotelAmenities.FindAsync([scope.HotelId, amenityId], ct);
            if (assigned && link is null) db.HotelAmenities.Add(new() { HotelId = scope.HotelId, AmenityId = amenityId });
            if (!assigned && link is not null) db.HotelAmenities.Remove(link);
        }
    }
    public async Task<IReadOnlyList<IPropertyImage>> ImagesAsync(ImageScope scope, CancellationToken ct) =>
        scope.RoomId is { } id
            ? (await db.RoomImages.Where(x => x.RoomId == id).OrderBy(x => x.DisplayOrder).ThenBy(x => x.ImageId).ToListAsync(ct)).Cast<IPropertyImage>().ToList()
            : (await db.HotelImages.Where(x => x.HotelId == scope.HotelId).OrderBy(x => x.DisplayOrder).ThenBy(x => x.ImageId).ToListAsync(ct)).Cast<IPropertyImage>().ToList();
    public IPropertyImage AddImage(ImageScope scope, StoredImage stored, string? altText, int order)
    {
        IPropertyImage image;
        if (scope.RoomId is { } roomId)
        {
            var roomImage = new RoomImage { RoomId = roomId, ImageUrl = stored.Url, StorageKey = stored.Key,
                AltText = altText, OriginalFileName = stored.OriginalFileName, ContentType = stored.ContentType,
                FileSize = stored.FileSize, Width = stored.Width, Height = stored.Height };
            db.RoomImages.Add(roomImage); image = roomImage;
        }
        else
        {
            var hotelImage = new HotelImage { HotelId = scope.HotelId, ImageUrl = stored.Url, StorageKey = stored.Key,
                AltText = altText, OriginalFileName = stored.OriginalFileName, ContentType = stored.ContentType,
                FileSize = stored.FileSize, Width = stored.Width, Height = stored.Height };
            db.HotelImages.Add(hotelImage); image = hotelImage;
        }
        image.SetOrder(order);
        return image;
    }
    public void RemoveImage(IPropertyImage image)
    {
        if (image is RoomImage roomImage) db.RoomImages.Remove(roomImage);
        else db.HotelImages.Remove((HotelImage)image);
    }
    public void QueueFileDeletion(string key) => db.ImageFileDeletions.Add(new() { StorageKey = key });
    public async Task SaveAsync(CancellationToken ct)
    {
        try
        {
            var addedHotelImages = db.ChangeTracker.Entries<HotelImage>().Where(x => x.State == EntityState.Added).Select(x => x.Entity).ToList();
            var addedRoomImages = db.ChangeTracker.Entries<RoomImage>().Where(x => x.State == EntityState.Added).Select(x => x.Entity).ToList();
            await db.SaveChangesAsync(ct);
            foreach (var image in addedHotelImages)
                image.ImageUrl = $"/api/hotels/{image.HotelId}/images/{image.ImageId}/content";
            foreach (var image in addedRoomImages)
            {
                var hotelId = await db.Rooms.Where(x => x.RoomId == image.RoomId).Select(x => x.RoomType.HotelId).SingleAsync(ct);
                image.ImageUrl = $"/api/hotels/{hotelId}/rooms/{image.RoomId}/images/{image.ImageId}/content";
            }
            if (addedHotelImages.Count + addedRoomImages.Count > 0) await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        { throw new ConflictException("Duplicate amenity, association or primary image. Reload and retry."); }
    }
    public async Task<T> InGalleryTransactionAsync<T>(ImageScope scope, Func<Task<T>> operation, CancellationToken ct)
    {
        if (!db.Database.IsRelational()) return await operation();
        await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct);
        // Serialize every change in a gallery, including concurrent first uploads.
        if (db.Database.IsSqlServer())
        {
            if (scope.RoomId is { } roomId)
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT RoomId FROM Rooms WITH (UPDLOCK, HOLDLOCK) WHERE RoomId = {roomId}", ct);
            else
                await db.Database.ExecuteSqlInterpolatedAsync($"SELECT HotelId FROM Hotels WITH (UPDLOCK, HOLDLOCK) WHERE HotelId = {scope.HotelId}", ct);
        }
        try
        {
            var result = await operation();
            await transaction.CommitAsync(ct);
            return result;
        }
        catch
        {
            await transaction.RollbackAsync(CancellationToken.None);
            db.ChangeTracker.Clear();
            throw;
        }
    }
}
