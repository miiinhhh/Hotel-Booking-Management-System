package com.example.hotelbookingandroid.data.model.hotel;

import java.io.Serializable;
import java.util.List;

/** DTO cho tìm kiếm & chi tiết khách sạn (DiscoveryController, ReviewsController). */
public final class HotelModels {
    private HotelModels() {}

    /** Một thẻ khách sạn trong kết quả tìm kiếm. */
    public static class HotelCard {
        public int hotelId;
        public String name;
        public String address;
        public String city;
        public String imageUrl;
        public String roomTypeName;
        public double pricePerNight;
        public int availableRooms;
        public int capacity;
    }

    /** GET /api/discovery/hotels */
    public static class DiscoveryPage {
        public List<HotelCard> items;
        public int totalCount;
        public int page;
        public int pageSize;
        public int totalPages;
        public String message;
    }

    public static class Amenity {
        public int amenityId;
        public String name;
        public String description;
    }

    public static class HotelImage {
        public String url;
        public String altText;
        public boolean isPrimary;
    }

    public static class HotelPolicy {
        public String checkInTime;
        public String checkOutTime;
        public String cancellationPolicy;
    }

    public static class DiscoveryRoom {
        public long roomId;
        public int roomTypeId;
        public String name;
        public String roomNumber;
        public int floor;
        public double pricePerNight;
        public int capacity;
        public String imageUrl;
        public List<Amenity> amenities;
    }

    /** GET /api/discovery/hotels/{id} */
    public static class HotelDetail {
        public int hotelId;
        public String name;
        public String address;
        public String city;
        public String description;
        public HotelPolicy policies;
        public List<HotelImage> images;
        public List<Amenity> amenities;
        public List<DiscoveryRoom> rooms;
        public String checkIn;
        public String checkOut;
    }

    /** GET /api/hotels/{id}/rating */
    public static class HotelRating {
        public int hotelId;
        public int totalReviews;
        public Double averageRating;
    }

    /** Tiêu chí tìm kiếm truyền giữa các màn hình. */
    public static class SearchCriteria implements Serializable {
        public String location = "";
        public String checkIn;
        public String checkOut;
        public int adults = 2;
        public int children = 0;
        public int rooms = 1;

        public int totalGuests() { return adults + children; }
    }
}
