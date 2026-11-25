package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.data.model.auth.AccountProfile;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;
import com.example.hotelbookingandroid.data.model.auth.LoginRequest;
import com.example.hotelbookingandroid.data.model.auth.RefreshTokenRequest;
import com.example.hotelbookingandroid.data.model.auth.RegisterRequest;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;

/** AuthController + AccountController (phần khách hàng). */
public interface AuthApi {
    /** portal = "customer" | "staff" | "admin" (giống LoginPortal của web). */
    @POST("api/auth/{portal}/login")
    Call<AuthResponse> login(@Path("portal") String portal, @Body LoginRequest request);

    @POST("api/auth/register")
    Call<AuthResponse> register(@Body RegisterRequest request);

    @POST("api/auth/refresh")
    Call<AuthResponse> refresh(@Body RefreshTokenRequest request);

    @POST("api/auth/logout")
    Call<Void> logout(@Body RefreshTokenRequest request);

    @GET("api/me")
    Call<AccountProfile> me();
}
