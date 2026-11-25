package com.example.hotelbookingandroid.core.network;

import com.example.hotelbookingandroid.core.session.SessionManager;

import java.io.IOException;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;

/** Tự gắn header Authorization: Bearer cho mọi request khi đã đăng nhập. */
public class AuthInterceptor implements Interceptor {
    private final SessionManager session;

    public AuthInterceptor(SessionManager session) {
        this.session = session;
    }

    @Override
    public Response intercept(Chain chain) throws IOException {
        Request original = chain.request();
        String token = session.getAccessToken();
        if (token == null || original.header("Authorization") != null) {
            return chain.proceed(original);
        }
        return chain.proceed(original.newBuilder().header("Authorization", "Bearer " + token).build());
    }
}
