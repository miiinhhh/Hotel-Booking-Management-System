using HotelBooking.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.Infrastructure.Persistence;

public static class PropertyContentMapping
{
    public static void ConfigurePropertyContent(this ModelBuilder model)
    {
        var settings = model.Entity<HotelDiscoverySettings>();
        settings.ToTable("HotelDiscoverySettings"); settings.HasKey(x => x.HotelId);
        settings.Property(x => x.CancellationPolicy).HasMaxLength(2000);
        settings.HasOne<RoomHotel>().WithMany().HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Cascade);
        var wishlist = model.Entity<HotelWishlist>();
        wishlist.ToTable("HotelWishlists"); wishlist.HasKey(x => new { x.UserId, x.HotelId });
        wishlist.HasOne<RoomHotel>().WithMany().HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Cascade);
        wishlist.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        var amenity = model.Entity<Amenity>();
        amenity.ToTable("Amenities");
        amenity.HasKey(x => x.AmenityId);
        amenity.Property(x => x.AmenityName).HasMaxLength(100).IsRequired();
        amenity.Property(x => x.Description).HasMaxLength(255);
        amenity.HasIndex(x => x.AmenityName).IsUnique().HasDatabaseName("UQ_Amenities_Name");
        var hotelLink = model.Entity<HotelAmenity>();
        hotelLink.ToTable("HotelAmenities");
        hotelLink.HasKey(x => new { x.HotelId, x.AmenityId });
        hotelLink.HasOne<RoomHotel>().WithMany().HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Cascade);
        hotelLink.HasOne(x => x.Amenity).WithMany().HasForeignKey(x => x.AmenityId).OnDelete(DeleteBehavior.Cascade);
        var roomLink = model.Entity<RoomAmenity>();
        roomLink.ToTable("RoomAmenities");
        roomLink.HasKey(x => new { x.RoomId, x.AmenityId });
        roomLink.HasOne<Room>().WithMany().HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Cascade);
        roomLink.HasOne(x => x.Amenity).WithMany().HasForeignKey(x => x.AmenityId).OnDelete(DeleteBehavior.Cascade);

        var hotelImage = model.Entity<HotelImage>();
        hotelImage.ToTable("HotelImages", t => t.HasCheckConstraint("CK_HotelImages_DisplayOrder", "[DisplayOrder] >= 0"));
        hotelImage.HasKey(x => x.ImageId);
        hotelImage.Property(x => x.ImageId).HasColumnName("HotelImageId");
        hotelImage.HasOne<RoomHotel>().WithMany().HasForeignKey(x => x.HotelId).OnDelete(DeleteBehavior.Cascade);
        hotelImage.HasIndex(x => x.HotelId).IsUnique().HasFilter("[IsPrimary] = 1").HasDatabaseName("UX_HotelImages_Primary");
        var roomImage = model.Entity<RoomImage>();
        roomImage.ToTable("RoomImages", t => t.HasCheckConstraint("CK_RoomImages_DisplayOrder", "[DisplayOrder] >= 0"));
        roomImage.HasKey(x => x.ImageId);
        roomImage.Property(x => x.ImageId).HasColumnName("RoomImageId");
        roomImage.HasOne<Room>().WithMany().HasForeignKey(x => x.RoomId).OnDelete(DeleteBehavior.Cascade);
        roomImage.HasIndex(x => x.RoomId).IsUnique().HasFilter("[IsPrimary] = 1").HasDatabaseName("UX_RoomImages_Primary");
        foreach (var type in new[] { typeof(HotelImage), typeof(RoomImage) })
        {
            var entity = model.Entity(type);
            entity.Property(nameof(IPropertyImage.ImageUrl)).HasMaxLength(1000).IsUnicode(false).IsRequired();
            entity.Property(nameof(IPropertyImage.AltText)).HasMaxLength(255);
            entity.Property(nameof(IPropertyImage.StorageKey)).HasMaxLength(100).IsUnicode(false);
            entity.Property(nameof(IPropertyImage.OriginalFileName)).HasMaxLength(255);
            entity.Property(nameof(IPropertyImage.ContentType)).HasMaxLength(50).IsUnicode(false);
        }
        var deletion = model.Entity<ImageFileDeletion>();
        deletion.ToTable("ImageFileDeletions");
        deletion.HasKey(x => x.Id);
        deletion.Property(x => x.StorageKey).HasMaxLength(100).IsUnicode(false).IsRequired();
    }
}
