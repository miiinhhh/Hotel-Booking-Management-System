package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.core.network.ApiResponse;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

/** BookingController — mọi phản hồi đều bọc ApiResponse. */
public interface BookingApi {
    @POST("api/bookings/calculate-price")
    Call<ApiResponse<BookingModels.PriceCalculationResult>> calculatePrice(@Body BookingModels.CalculatePriceRequest request);

    @POST("api/bookings")
    Call<ApiResponse<BookingModels.BookingDetail>> create(@Body BookingModels.CreateBookingRequest request);

    @GET("api/bookings")
    Call<ApiResponse<List<BookingModels.BookingListItem>>> myBookings(@Query("status") String status,
                                                                      @Query("pageIndex") int pageIndex,
                                                                      @Query("pageSize") int pageSize);

    @GET("api/bookings/{id}")
    Call<ApiResponse<BookingModels.BookingDetail>> detail(@Path("id") long bookingId);

    @GET("api/bookings/{id}/preview-cancel")
    Call<ApiResponse<BookingModels.CancellationPreview>> previewCancel(@Path("id") long bookingId);

    @POST("api/bookings/{id}/cancel")
    Call<ApiResponse<Boolean>> cancel(@Path("id") long bookingId, @Body BookingModels.CancelRequest request);
}
