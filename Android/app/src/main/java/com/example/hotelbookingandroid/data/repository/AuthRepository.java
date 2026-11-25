package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.data.model.auth.AccountProfile;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;
import com.example.hotelbookingandroid.data.model.auth.LoginRequest;
import com.example.hotelbookingandroid.data.model.auth.RefreshTokenRequest;
import com.example.hotelbookingandroid.data.model.auth.RegisterRequest;
import com.example.hotelbookingandroid.data.remote.api.AuthApi;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class AuthRepository {
    private final AuthApi api = ApiClient.create(AuthApi.class);
    private final SessionManager session = SessionManager.get();

    public static final String PORTAL_CUSTOMER = "customer";
    public static final String PORTAL_STAFF = "staff";
    public static final String PORTAL_ADMIN = "admin";

    public LiveData<Resource<AuthResponse>> login(String portal, String email, String password) {
        return saveOnSuccess(CallExecutor.raw(api.login(portal, new LoginRequest(email, password, true))));
    }

    public LiveData<Resource<AuthResponse>> register(RegisterRequest request) {
        return saveOnSuccess(CallExecutor.raw(api.register(request)));
    }

    public LiveData<Resource<AccountProfile>> profile() {
        return CallExecutor.raw(api.me());
    }

    /** Thu hồi refresh token trên server (bỏ qua lỗi) rồi xóa phiên cục bộ. */
    public void logout() {
        String refresh = session.getRefreshToken();
        session.clear();
        if (refresh == null) return;
        api.logout(new RefreshTokenRequest(refresh)).enqueue(new Callback<Void>() {
            @Override public void onResponse(Call<Void> call, Response<Void> response) { }
            @Override public void onFailure(Call<Void> call, Throwable t) { }
        });
    }

    private LiveData<Resource<AuthResponse>> saveOnSuccess(LiveData<Resource<AuthResponse>> source) {
        MediatorLiveData<Resource<AuthResponse>> result = new MediatorLiveData<>();
        result.addSource(source, res -> {
            if (res.isSuccess() && res.data != null) session.save(res.data);
            result.setValue(res);
        });
        return result;
    }
}
