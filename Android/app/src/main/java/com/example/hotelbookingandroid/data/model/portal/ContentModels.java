package com.example.hotelbookingandroid.data.model.portal;

import java.util.List;

/** DTO cho AmenitiesController và PropertyImagesController (Tiện ích & hình ảnh). */
public final class ContentModels {
    private ContentModels() {}

    /** Phạm vi nội dung: toàn khách sạn (roomId = null) hoặc một phòng cụ thể. */
    public static final class Scope {
        public final int hotelId;
        public final Long roomId;

        public Scope(int hotelId, Long roomId) {
            this.hotelId = hotelId;
            this.roomId = roomId;
        }

        /** Đường dẫn gốc tương đối, vd "api/hotels/1" hoặc "api/hotels/1/rooms/12". */
        public String path() {
            return roomId == null ? "api/hotels/" + hotelId : "api/hotels/" + hotelId + "/rooms/" + roomId;
        }
    }

    public static class Amenity {
        public int amenityId;
        public String name;
        public String description;
        public boolean isActive;
    }

    public static class AmenityInput {
        public final String name;
        public final String description;
        public AmenityInput(String name, String description) { this.name = name; this.description = description; }
    }

    public static class Image {
        public long imageId;
        public String url;
        public String altText;
        public int displayOrder;
        public boolean isPrimary;
        public String createdAt;
        public String originalFileName;
        public Long fileSize;
        public Integer width;
        public Integer height;
    }

    public static class ImageOrderRequest {
        public final List<Long> imageIds;
        public ImageOrderRequest(List<Long> imageIds) { this.imageIds = imageIds; }
    }
}
