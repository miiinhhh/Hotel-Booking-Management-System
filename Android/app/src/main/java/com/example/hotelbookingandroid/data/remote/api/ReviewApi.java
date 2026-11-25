package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.data.model.review.ReviewModels;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.PUT;
import retrofit2.http.Path;

/** ReviewsController (phần khách hàng). */
public interface ReviewApi {
    @GET("api/bookings/{bookingId}/review")
    Call<ReviewModels.Review> forBooking(@Path("bookingId") long bookingId);

    @POST("api/bookings/{bookingId}/review")
    Call<ReviewModels.Review> create(@Path("bookingId") long bookingId, @Body ReviewModels.ReviewRequest request);

    @PUT("api/bookings/{bookingId}/review")
    Call<ReviewModels.Review> update(@Path("bookingId") long bookingId, @Body ReviewModels.ReviewRequest request);
}
