package com.example.hotelbookingandroid.ui.common;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;

/**
 * ViewModel tải-một-nguồn dùng chung cho các màn danh sách đơn giản.
 * Dữ liệu sống qua xoay màn hình; Fragment gọi {@link #load} khi cần làm mới.
 */
public class LoadViewModel<T> extends BaseViewModel {
    private final MediatorLiveData<Resource<T>> data = new MediatorLiveData<>();
    private boolean started;

    public LiveData<Resource<T>> data() { return data; }

    public void load(LiveData<Resource<T>> source) {
        started = true;
        bind(data, source);
    }

    /** Chỉ tải lần đầu (tránh gọi lại API khi xoay màn hình). */
    public boolean needsInitialLoad() { return !started; }
}
