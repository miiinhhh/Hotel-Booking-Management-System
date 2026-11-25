package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.ErrorParser;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.portal.ContentModels;
import com.example.hotelbookingandroid.data.model.portal.ContentModels.Scope;
import com.example.hotelbookingandroid.data.remote.api.ContentApi;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Function;

import okhttp3.MediaType;
import okhttp3.MultipartBody;
import okhttp3.RequestBody;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ContentRepository {
    private final ContentApi api = ApiClient.create(ContentApi.class);

    // --- Danh mục ---
    public LiveData<Resource<List<ContentModels.Amenity>>> catalog() {
        return CallExecutor.raw(api.catalog());
    }

    public LiveData<Resource<ContentModels.Amenity>> saveAmenity(Integer id, String name, String description) {
        ContentModels.AmenityInput input = new ContentModels.AmenityInput(name, description);
        return CallExecutor.raw(id == null ? api.createAmenity(input) : api.updateAmenity(id, input));
    }

    public LiveData<Resource<Void>> deleteAmenity(int id) {
        return CallExecutor.raw(api.deleteAmenity(id));
    }

    // --- Theo phạm vi ---
    public LiveData<Resource<List<ContentModels.Amenity>>> linkedAmenities(Scope scope) {
        return CallExecutor.raw(api.linkedAmenities(scope.path() + "/amenities"));
    }

    /** Gán / bỏ gán một tiện ích cho nhiều phạm vi cùng lúc (vd. mọi phòng cùng hạng). */
    public LiveData<Resource<Integer>> setAmenity(List<Scope> targets, int amenityId, boolean assigned) {
        return all(targets, s -> {
            String url = s.path() + "/amenities/" + amenityId;
            return assigned ? api.assignAmenity(url) : api.unassignAmenity(url);
        });
    }

    public LiveData<Resource<List<ContentModels.Image>>> images(Scope scope) {
        return CallExecutor.raw(api.images(scope.path() + "/images"));
    }

    /** Tải một ảnh lên nhiều phạm vi; trả về số phạm vi thành công. */
    public LiveData<Resource<Integer>> upload(List<Scope> targets, byte[] bytes, String fileName, String mimeType,
                                              String altText, boolean isPrimary) {
        MediaType type = MediaType.parse(mimeType != null ? mimeType : "image/jpeg");
        return all(targets, s -> api.upload(s.path() + "/images",
                MultipartBody.Part.createFormData("file", fileName, RequestBody.create(bytes, type)),
                RequestBody.create(altText != null ? altText : "", MediaType.parse("text/plain")),
                RequestBody.create(String.valueOf(isPrimary), MediaType.parse("text/plain"))));
    }

    public LiveData<Resource<Void>> deleteImage(Scope scope, long imageId) {
        return CallExecutor.raw(api.deleteImage(scope.path() + "/images/" + imageId));
    }

    public LiveData<Resource<Void>> setPrimary(Scope scope, long imageId) {
        return CallExecutor.raw(api.setPrimary(scope.path() + "/images/" + imageId + "/primary"));
    }

    public LiveData<Resource<Void>> reorder(Scope scope, List<Long> imageIds) {
        return CallExecutor.raw(api.reorder(scope.path() + "/images/order", new ContentModels.ImageOrderRequest(imageIds)));
    }

    /**
     * Chạy cùng một thao tác cho nhiều phạm vi song song. Thành công nếu ít nhất một phạm vi thành công;
     * kết quả là số phạm vi thành công (để báo "đã áp dụng cho 8/10 phòng").
     */
    private <T> LiveData<Resource<Integer>> all(List<Scope> targets, Function<Scope, Call<T>> call) {
        MutableLiveData<Resource<Integer>> live = new MutableLiveData<>(Resource.loading());
        if (targets.isEmpty()) { live.setValue(Resource.success(0)); return live; }
        AtomicInteger pending = new AtomicInteger(targets.size());
        AtomicInteger ok = new AtomicInteger();
        AtomicReference<String> error = new AtomicReference<>();
        for (Scope s : new ArrayList<>(targets)) {
            call.apply(s).enqueue(new Callback<T>() {
                @Override public void onResponse(Call<T> c, Response<T> r) {
                    if (r.isSuccessful()) ok.incrementAndGet();
                    else error.compareAndSet(null, ErrorParser.from(r));
                    done();
                }
                @Override public void onFailure(Call<T> c, Throwable t) {
                    error.compareAndSet(null, ErrorParser.from(t));
                    done();
                }
                private void done() {
                    if (pending.decrementAndGet() > 0) return;
                    live.postValue(ok.get() > 0 ? Resource.success(ok.get()) : Resource.error(error.get()));
                }
            });
        }
        return live;
    }
}
