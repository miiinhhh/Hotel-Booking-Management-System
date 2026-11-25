package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.data.model.portal.ContentModels;

import java.util.List;

import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.GET;
import retrofit2.http.Multipart;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Part;
import retrofit2.http.Path;
import retrofit2.http.Url;

/**
 * Tiện ích & hình ảnh. Các endpoint theo phạm vi dùng @Url vì có hai dạng đường dẫn
 * (khách sạn / phòng) — xem {@link ContentModels.Scope#path()}.
 */
public interface ContentApi {
    // --- Danh mục tiện ích ---
    @GET("api/amenities")
    Call<List<ContentModels.Amenity>> catalog();

    @POST("api/amenities")
    Call<ContentModels.Amenity> createAmenity(@Body ContentModels.AmenityInput input);

    @PUT("api/amenities/{id}")
    Call<ContentModels.Amenity> updateAmenity(@Path("id") int amenityId, @Body ContentModels.AmenityInput input);

    @DELETE("api/amenities/{id}")
    Call<Void> deleteAmenity(@Path("id") int amenityId);

    // --- Gán tiện ích theo phạm vi ---
    @GET
    Call<List<ContentModels.Amenity>> linkedAmenities(@Url String url);

    @PUT
    Call<Void> assignAmenity(@Url String url);

    @DELETE
    Call<Void> unassignAmenity(@Url String url);

    // --- Hình ảnh theo phạm vi ---
    @GET
    Call<List<ContentModels.Image>> images(@Url String url);

    @Multipart
    @POST
    Call<ContentModels.Image> upload(@Url String url, @Part MultipartBody.Part file,
                                     @Part("altText") RequestBody altText, @Part("isPrimary") RequestBody isPrimary);

    @DELETE
    Call<Void> deleteImage(@Url String url);

    @PUT
    Call<Void> setPrimary(@Url String url);

    @PUT
    Call<Void> reorder(@Url String url, @Body ContentModels.ImageOrderRequest request);
}
