package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.data.model.hotel.HotelModels;

import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.PUT;
import retrofit2.http.Path;
import retrofit2.http.QueryMap;

/** DiscoveryController + rating của ReviewsController. */
public interface HotelApi {
    @GET("api/discovery/hotels")
    Call<HotelModels.DiscoveryPage> search(@QueryMap Map<String, String> query);

    @GET("api/discovery/hotels/{hotelId}")
    Call<HotelModels.HotelDetail> detail(@Path("hotelId") int hotelId, @QueryMap Map<String, String> query);

    @GET("api/hotels/{hotelId}/rating")
    Call<HotelModels.HotelRating> rating(@Path("hotelId") int hotelId);

    @GET("api/me/wishlist")
    Call<List<HotelModels.HotelCard>> wishlist();

    @PUT("api/me/wishlist/{hotelId}")
    Call<Void> addWishlist(@Path("hotelId") int hotelId);

    @DELETE("api/me/wishlist/{hotelId}")
    Call<Void> removeWishlist(@Path("hotelId") int hotelId);
}
