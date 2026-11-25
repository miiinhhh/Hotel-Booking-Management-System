package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.remote.api.PortalApi;

import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PortalRepository {
    private final PortalApi api = ApiClient.create(PortalApi.class);

    // --- Đặt phòng ---
    public LiveData<Resource<PortalModels.StaffDashboard>> dashboard() {
        return CallExecutor.wrapped(api.dashboard());
    }

    public LiveData<Resource<Boolean>> updateStatus(long bookingId, String newStatus, String note) {
        return CallExecutor.wrapped(api.updateStatus(bookingId, new PortalModels.UpdateStatusRequest(newStatus, note)));
    }

    public LiveData<Resource<Boolean>> noShow(long bookingId, String note) {
        return CallExecutor.wrapped(api.noShow(bookingId, new PortalModels.NoteRequest(note)));
    }

    public LiveData<Resource<Object>> collectCash(long bookingId) {
        return CallExecutor.wrapped(api.collectCash(bookingId));
    }

    public LiveData<Resource<Object>> confirmRefund(long bookingId) {
        return CallExecutor.wrapped(api.confirmRefund(bookingId));
    }

    // --- Khách hàng & thông báo ---
    public LiveData<Resource<List<PortalModels.Customer>>> customers() {
        return CallExecutor.wrapped(api.customers());
    }

    /** Admin và Staff có nguồn thông báo khác nhau, giống web. */
    public LiveData<Resource<List<PortalModels.Notification>>> notifications() {
        return CallExecutor.wrapped(SessionManager.get().isAdmin() ? api.adminNotifications() : api.staffNotifications());
    }

    public void markRead(List<String> keys) {
        if (keys.isEmpty()) return;
        api.markRead(new PortalModels.MarkReadRequest(keys)).enqueue(new Callback<Void>() {
            @Override public void onResponse(Call<Void> c, Response<Void> r) { }
            @Override public void onFailure(Call<Void> c, Throwable t) { }
        });
    }

    // --- Báo cáo ---
    public LiveData<Resource<PortalModels.BusinessReport>> report(String from, String to) {
        return CallExecutor.raw(api.report(from, to));
    }

    // --- Voucher ---
    public LiveData<Resource<PortalModels.Paged<PortalModels.AdminVoucher>>> vouchers() {
        return CallExecutor.raw(api.vouchers(1, 100));
    }

    public LiveData<Resource<PortalModels.ToggleResult>> toggleVoucher(long voucherId) {
        return CallExecutor.raw(api.toggleVoucher(voucherId));
    }

    // --- Nhân viên ---
    public LiveData<Resource<PortalModels.StaffPage>> staff() {
        return CallExecutor.raw(api.staff(1, 100));
    }

    public LiveData<Resource<PortalModels.StaffAccount>> setStaffActive(long userId, boolean active) {
        return CallExecutor.raw(api.setStaffActive(userId, new PortalModels.ActiveRequest(active)));
    }

    // --- Lịch phòng & khóa bán ---
    public LiveData<Resource<List<PortalModels.RoomSchedule>>> calendar(int days) {
        return CallExecutor.wrapped(api.calendar(days));
    }

    public LiveData<Resource<List<PortalModels.Room>>> rooms(int hotelId) {
        return CallExecutor.raw(api.rooms(hotelId));
    }

    /** Gộp lệnh khóa của nhiều khách sạn (Admin có thể quản lý nhiều khách sạn). */
    public LiveData<Resource<List<PortalModels.RoomLock>>> locks(java.util.Collection<Integer> hotelIds) {
        androidx.lifecycle.MutableLiveData<Resource<List<PortalModels.RoomLock>>> live =
                new androidx.lifecycle.MutableLiveData<>(Resource.loading());
        if (hotelIds.isEmpty()) { live.setValue(Resource.success(new java.util.ArrayList<>())); return live; }
        List<PortalModels.RoomLock> merged = java.util.Collections.synchronizedList(new java.util.ArrayList<>());
        java.util.concurrent.atomic.AtomicInteger pending = new java.util.concurrent.atomic.AtomicInteger(hotelIds.size());
        java.util.concurrent.atomic.AtomicReference<String> error = new java.util.concurrent.atomic.AtomicReference<>();
        for (int hotelId : hotelIds) {
            api.locks(hotelId).enqueue(new Callback<List<PortalModels.RoomLock>>() {
                @Override public void onResponse(Call<List<PortalModels.RoomLock>> c, Response<List<PortalModels.RoomLock>> r) {
                    if (r.isSuccessful() && r.body() != null) merged.addAll(r.body());
                    else error.compareAndSet(null, com.example.hotelbookingandroid.core.network.ErrorParser.from(r));
                    done();
                }
                @Override public void onFailure(Call<List<PortalModels.RoomLock>> c, Throwable t) {
                    error.compareAndSet(null, com.example.hotelbookingandroid.core.network.ErrorParser.from(t));
                    done();
                }
                private void done() {
                    if (pending.decrementAndGet() > 0) return;
                    live.postValue(error.get() != null && merged.isEmpty()
                            ? Resource.error(error.get()) : Resource.success(new java.util.ArrayList<>(merged)));
                }
            });
        }
        return live;
    }

    public LiveData<Resource<List<PortalModels.RoomLock>>> lock(int hotelId, PortalModels.LockRequest request) {
        return CallExecutor.raw(api.lock(hotelId, request));
    }

    public LiveData<Resource<PortalModels.RoomLock>> release(int hotelId, long lockId) {
        return CallExecutor.raw(api.release(hotelId, lockId));
    }

    // --- Phân khu & hạng phòng & phòng ---
    public LiveData<Resource<List<PortalModels.HotelArea>>> areas(int hotelId) {
        return CallExecutor.raw(api.areas(hotelId, true));
    }

    public LiveData<Resource<PortalModels.HotelArea>> saveArea(int hotelId, Integer areaId, PortalModels.AreaInput input) {
        return CallExecutor.raw(areaId == null ? api.createArea(hotelId, input) : api.updateArea(hotelId, areaId, input));
    }

    public LiveData<Resource<Void>> deactivateArea(int hotelId, int areaId) {
        return CallExecutor.raw(api.deactivateArea(hotelId, areaId));
    }

    public LiveData<Resource<List<PortalModels.RoomType>>> roomTypes(int hotelId) {
        return CallExecutor.raw(api.roomTypes(hotelId));
    }

    public LiveData<Resource<PortalModels.RoomType>> saveRoomType(int hotelId, int areaId, Integer roomTypeId,
                                                                  PortalModels.RoomTypeInput input) {
        return CallExecutor.raw(roomTypeId == null ? api.createRoomType(hotelId, areaId, input)
                : api.updateRoomType(hotelId, roomTypeId, input));
    }

    public LiveData<Resource<PortalModels.RoomType>> setRoomTypeActive(int hotelId, int roomTypeId, boolean active) {
        return CallExecutor.raw(api.setRoomTypeActive(hotelId, roomTypeId, new PortalModels.ActiveRequest(active)));
    }

    public LiveData<Resource<List<PortalModels.PriceHistory>>> priceHistories(int hotelId, int roomTypeId) {
        return CallExecutor.raw(api.priceHistories(hotelId, roomTypeId));
    }

    public LiveData<Resource<PortalModels.PriceHistory>> createPriceHistory(int hotelId, int roomTypeId,
                                                                            PortalModels.PriceHistoryRequest request) {
        return CallExecutor.raw(api.createPriceHistory(hotelId, roomTypeId, request));
    }

    public LiveData<Resource<PortalModels.Room>> saveRoom(int hotelId, int areaId, Long roomId, PortalModels.RoomInput input) {
        return CallExecutor.raw(roomId == null ? api.createRoom(hotelId, areaId, input) : api.updateRoom(hotelId, roomId, input));
    }

    public LiveData<Resource<Void>> deactivateRoom(int hotelId, long roomId) {
        return CallExecutor.raw(api.deactivateRoom(hotelId, roomId));
    }

    // --- Đánh giá ---
    public LiveData<Resource<PortalModels.HotelPage>> hotels() {
        return CallExecutor.raw(api.hotels(1, 100));
    }

    public LiveData<Resource<PortalModels.ReviewPage>> reviews(int hotelId, String status) {
        return CallExecutor.raw(api.reviews(hotelId, status, 1, 50));
    }

    public LiveData<Resource<PortalModels.AdminReview>> moderate(int hotelId, long reviewId, String status, String reason) {
        return CallExecutor.raw(api.moderate(hotelId, reviewId, new PortalModels.ModerateRequest(status, reason)));
    }
}
