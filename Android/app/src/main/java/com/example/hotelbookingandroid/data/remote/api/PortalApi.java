package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.core.network.ApiResponse;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.DELETE;
import retrofit2.http.PUT;
import retrofit2.http.GET;
import retrofit2.http.PATCH;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Query;

/** Endpoint dành cho tài khoản nội bộ (Hotel Staff / Admin). */
public interface PortalApi {
    // --- Đặt phòng ---
    @GET("api/staff/portal/bookings")
    Call<ApiResponse<PortalModels.StaffDashboard>> dashboard();

    @PATCH("api/bookings/{id}/status")
    Call<ApiResponse<Boolean>> updateStatus(@Path("id") long bookingId, @Body PortalModels.UpdateStatusRequest request);

    @POST("api/bookings/{id}/no-show")
    Call<ApiResponse<Boolean>> noShow(@Path("id") long bookingId, @Body PortalModels.NoteRequest request);

    @POST("api/payments/cash-collect/{bookingId}")
    Call<ApiResponse<Object>> collectCash(@Path("bookingId") long bookingId);

    @POST("api/payments/refund/confirm/{bookingId}")
    Call<ApiResponse<Object>> confirmRefund(@Path("bookingId") long bookingId);

    // --- Khách hàng & thông báo ---
    @GET("api/staff/portal/customers")
    Call<ApiResponse<List<PortalModels.Customer>>> customers();

    @GET("api/staff/portal/notifications")
    Call<ApiResponse<List<PortalModels.Notification>>> staffNotifications();

    @GET("api/admin/notifications")
    Call<ApiResponse<List<PortalModels.Notification>>> adminNotifications();

    @POST("api/notifications/read")
    Call<Void> markRead(@Body PortalModels.MarkReadRequest request);

    // --- Báo cáo ---
    @GET("api/admin/reports/overview")
    Call<PortalModels.BusinessReport> report(@Query("from") String from, @Query("to") String to);

    // --- Voucher ---
    @GET("api/vouchers")
    Call<PortalModels.Paged<PortalModels.AdminVoucher>> vouchers(@Query("page") int page, @Query("pageSize") int pageSize);

    @PATCH("api/vouchers/{id}/toggle-status")
    Call<PortalModels.ToggleResult> toggleVoucher(@Path("id") long voucherId);

    // --- Nhân viên ---
    @GET("api/staff")
    Call<PortalModels.StaffPage> staff(@Query("page") int page, @Query("pageSize") int pageSize);

    @PATCH("api/staff/{id}/status")
    Call<PortalModels.StaffAccount> setStaffActive(@Path("id") long userId, @Body PortalModels.ActiveRequest request);

    // --- Lịch phòng & khóa bán ---
    @GET("api/staff/portal/calendar")
    Call<ApiResponse<List<PortalModels.RoomSchedule>>> calendar(@Query("days") int days);

    @GET("api/hotels/{hotelId}/rooms")
    Call<List<PortalModels.Room>> rooms(@Path("hotelId") int hotelId);

    @GET("api/hotels/{hotelId}/rooms/emergency-locks")
    Call<List<PortalModels.RoomLock>> locks(@Path("hotelId") int hotelId);

    @POST("api/hotels/{hotelId}/rooms/emergency-locks")
    Call<List<PortalModels.RoomLock>> lock(@Path("hotelId") int hotelId, @Body PortalModels.LockRequest request);

    @PATCH("api/hotels/{hotelId}/rooms/emergency-locks/{lockId}/release")
    Call<PortalModels.RoomLock> release(@Path("hotelId") int hotelId, @Path("lockId") long lockId);

    // --- Phân khu ---
    @GET("api/hotels/{hotelId}/areas")
    Call<List<PortalModels.HotelArea>> areas(@Path("hotelId") int hotelId, @Query("includeInactive") boolean includeInactive);

    @POST("api/hotels/{hotelId}/areas")
    Call<PortalModels.HotelArea> createArea(@Path("hotelId") int hotelId, @Body PortalModels.AreaInput input);

    @PUT("api/hotels/{hotelId}/areas/{areaId}")
    Call<PortalModels.HotelArea> updateArea(@Path("hotelId") int hotelId, @Path("areaId") int areaId, @Body PortalModels.AreaInput input);

    /** Backend vô hiệu hóa (soft delete) chứ không xóa hẳn. */
    @DELETE("api/hotels/{hotelId}/areas/{areaId}")
    Call<Void> deactivateArea(@Path("hotelId") int hotelId, @Path("areaId") int areaId);

    // --- Hạng phòng ---
    @GET("api/hotels/{hotelId}/room-types")
    Call<List<PortalModels.RoomType>> roomTypes(@Path("hotelId") int hotelId);

    @POST("api/hotels/{hotelId}/areas/{areaId}/room-types")
    Call<PortalModels.RoomType> createRoomType(@Path("hotelId") int hotelId, @Path("areaId") int areaId, @Body PortalModels.RoomTypeInput input);

    @PUT("api/hotels/{hotelId}/room-types/{id}")
    Call<PortalModels.RoomType> updateRoomType(@Path("hotelId") int hotelId, @Path("id") int roomTypeId, @Body PortalModels.RoomTypeInput input);

    @PATCH("api/hotels/{hotelId}/room-types/{id}/status")
    Call<PortalModels.RoomType> setRoomTypeActive(@Path("hotelId") int hotelId, @Path("id") int roomTypeId, @Body PortalModels.ActiveRequest request);

    // --- Giá phòng ---
    @GET("api/hotels/{hotelId}/room-types/{roomTypeId}/prices")
    Call<List<PortalModels.PriceHistory>> priceHistories(@Path("hotelId") int hotelId, @Path("roomTypeId") int roomTypeId);

    @POST("api/hotels/{hotelId}/room-types/{roomTypeId}/prices")
    Call<PortalModels.PriceHistory> createPriceHistory(@Path("hotelId") int hotelId, @Path("roomTypeId") int roomTypeId,
                                                      @Body PortalModels.PriceHistoryRequest request);

    // --- Phòng vật lý ---
    @POST("api/hotels/{hotelId}/areas/{areaId}/rooms")
    Call<PortalModels.Room> createRoom(@Path("hotelId") int hotelId, @Path("areaId") int areaId, @Body PortalModels.RoomInput input);

    @PUT("api/hotels/{hotelId}/rooms/{roomId}")
    Call<PortalModels.Room> updateRoom(@Path("hotelId") int hotelId, @Path("roomId") long roomId, @Body PortalModels.RoomInput input);

    @DELETE("api/hotels/{hotelId}/rooms/{roomId}")
    Call<Void> deactivateRoom(@Path("hotelId") int hotelId, @Path("roomId") long roomId);

    // --- Đánh giá ---
    @GET("api/hotels")
    Call<PortalModels.HotelPage> hotels(@Query("pageNumber") int page, @Query("pageSize") int pageSize);

    @GET("api/admin/hotels/{hotelId}/reviews")
    Call<PortalModels.ReviewPage> reviews(@Path("hotelId") int hotelId, @Query("status") String status,
                                          @Query("page") int page, @Query("pageSize") int pageSize);

    @PATCH("api/admin/hotels/{hotelId}/reviews/{reviewId}/moderation")
    Call<PortalModels.AdminReview> moderate(@Path("hotelId") int hotelId, @Path("reviewId") long reviewId,
                                            @Body PortalModels.ModerateRequest request);
}
