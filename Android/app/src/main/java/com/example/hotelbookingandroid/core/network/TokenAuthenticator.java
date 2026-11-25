package com.example.hotelbookingandroid.core.network;

import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;
import com.example.hotelbookingandroid.data.model.auth.RefreshTokenRequest;
import com.example.hotelbookingandroid.data.remote.api.AuthApi;

import okhttp3.Authenticator;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.Route;
import retrofit2.Retrofit;

/** Khi gặp 401: dùng refresh token lấy access token mới rồi gửi lại request một lần. */
public class TokenAuthenticator implements Authenticator {
    private final SessionManager session;
    private final AuthApi refreshApi;

    public TokenAuthenticator(SessionManager session, Retrofit refreshRetrofit) {
        this.session = session;
        this.refreshApi = refreshRetrofit.create(AuthApi.class);
    }

    @Override
    public synchronized Request authenticate(Route route, Response response) {
        if (response.priorResponse() != null) return null; // đã thử lại một lần
        String refreshToken = session.getRefreshToken();
        if (refreshToken == null) return null;

        String failedHeader = response.request().header("Authorization");
        String current = session.getAccessToken();
        // Luồng khác vừa refresh xong -> chỉ cần dùng token mới.
        if (current != null && failedHeader != null && !failedHeader.equals("Bearer " + current)) {
            return response.request().newBuilder().header("Authorization", "Bearer " + current).build();
        }
        try {
            retrofit2.Response<AuthResponse> refreshed =
                    refreshApi.refresh(new RefreshTokenRequest(refreshToken)).execute();
            if (refreshed.isSuccessful() && refreshed.body() != null) {
                session.save(refreshed.body());
                return response.request().newBuilder()
                        .header("Authorization", "Bearer " + refreshed.body().accessToken).build();
            }
        } catch (Exception ignored) {
            // rơi xuống xóa phiên
        }
        session.clear();
        return null;
    }
}
