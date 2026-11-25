package com.example.hotelbookingandroid.ui.common;

import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.Observer;

import com.example.hotelbookingandroid.core.network.Resource;

/** Quan sát một thao tác một lần (submit form, hủy đơn...) và tự gỡ khi có kết quả cuối. */
public final class SingleObserver {
    private SingleObserver() {}

    public static <T> void observe(LifecycleOwner owner, LiveData<Resource<T>> live, Observer<Resource<T>> observer) {
        live.observe(owner, new Observer<Resource<T>>() {
            @Override
            public void onChanged(Resource<T> value) {
                observer.onChanged(value);
                if (value != null && !value.isLoading()) live.removeObserver(this);
            }
        });
    }
}
