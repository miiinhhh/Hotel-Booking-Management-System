package com.example.hotelbookingandroid;

import android.app.Application;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.session.SessionManager;

/** Khởi tạo các thành phần dùng chung toàn ứng dụng. */
public class HotelApp extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        SessionManager.init(this);
        ApiClient.init(SessionManager.get());
    }
}
