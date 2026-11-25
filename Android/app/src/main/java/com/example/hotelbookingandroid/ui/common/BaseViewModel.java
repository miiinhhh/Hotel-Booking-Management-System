package com.example.hotelbookingandroid.ui.common;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;
import androidx.lifecycle.ViewModel;

import com.example.hotelbookingandroid.core.network.Resource;

/** Cho phép ViewModel "đổ" kết quả của một LiveData từ repository vào LiveData cố định mà UI đang quan sát. */
public abstract class BaseViewModel extends ViewModel {

    protected <T> void bind(MediatorLiveData<Resource<T>> target, LiveData<Resource<T>> source) {
        target.addSource(source, value -> {
            target.setValue(value);
            if (value != null && !value.isLoading()) target.removeSource(source);
        });
    }
}
