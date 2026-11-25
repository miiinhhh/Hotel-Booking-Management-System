package com.example.hotelbookingandroid.core.network;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Chạy Retrofit Call bất đồng bộ và đẩy kết quả vào LiveData<Resource>.
 * - {@link #raw}: endpoint trả DTO trực tiếp (discovery, auth, reviews...).
 * - {@link #wrapped}: endpoint trả ApiResponse { success, data, message } (bookings, payments).
 */
public final class CallExecutor {
    private CallExecutor() {}

    public static <T> LiveData<Resource<T>> raw(Call<T> call) {
        MutableLiveData<Resource<T>> live = new MutableLiveData<>(Resource.loading());
        call.enqueue(new Callback<T>() {
            @Override public void onResponse(Call<T> c, Response<T> r) {
                live.postValue(r.isSuccessful() ? Resource.success(r.body()) : Resource.error(ErrorParser.from(r)));
            }
            @Override public void onFailure(Call<T> c, Throwable t) {
                live.postValue(Resource.error(ErrorParser.from(t)));
            }
        });
        return live;
    }

    public static <T> LiveData<Resource<T>> wrapped(Call<ApiResponse<T>> call) {
        MutableLiveData<Resource<T>> live = new MutableLiveData<>(Resource.loading());
        call.enqueue(new Callback<ApiResponse<T>>() {
            @Override public void onResponse(Call<ApiResponse<T>> c, Response<ApiResponse<T>> r) {
                ApiResponse<T> body = r.body();
                if (!r.isSuccessful() || body == null) {
                    live.postValue(Resource.error(ErrorParser.from(r)));
                } else if (!body.success) {
                    String msg = body.message != null ? body.message
                            : (body.errors != null && !body.errors.isEmpty() ? body.errors.get(0) : "Yêu cầu thất bại.");
                    live.postValue(Resource.error(msg));
                } else {
                    live.postValue(Resource.success(body.data));
                }
            }
            @Override public void onFailure(Call<ApiResponse<T>> c, Throwable t) {
                live.postValue(Resource.error(ErrorParser.from(t)));
            }
        });
        return live;
    }
}
