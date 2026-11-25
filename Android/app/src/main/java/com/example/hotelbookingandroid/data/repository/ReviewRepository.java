package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.ErrorParser;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.review.ReviewModels;
import com.example.hotelbookingandroid.data.remote.api.ReviewApi;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReviewRepository {
    private final ReviewApi api = ApiClient.create(ReviewApi.class);

    /** Trả về success(null) nếu đơn chưa có đánh giá (404) hoặc đánh giá đã bị xóa. */
    public LiveData<Resource<ReviewModels.Review>> forBooking(long bookingId) {
        MutableLiveData<Resource<ReviewModels.Review>> live = new MutableLiveData<>(Resource.loading());
        api.forBooking(bookingId).enqueue(new Callback<ReviewModels.Review>() {
            @Override public void onResponse(Call<ReviewModels.Review> c, Response<ReviewModels.Review> r) {
                if (r.code() == 404) { live.postValue(Resource.success(null)); return; }
                if (!r.isSuccessful()) { live.postValue(Resource.error(ErrorParser.from(r))); return; }
                ReviewModels.Review review = r.body();
                live.postValue(Resource.success(review != null && "Deleted".equals(review.status) ? null : review));
            }
            @Override public void onFailure(Call<ReviewModels.Review> c, Throwable t) {
                live.postValue(Resource.error(ErrorParser.from(t)));
            }
        });
        return live;
    }

    public LiveData<Resource<ReviewModels.Review>> save(long bookingId, boolean isUpdate, int rating, String comment) {
        ReviewModels.ReviewRequest body = new ReviewModels.ReviewRequest(rating, comment);
        return CallExecutor.raw(isUpdate ? api.update(bookingId, body) : api.create(bookingId, body));
    }
}
