package com.example.hotelbookingandroid.ui.auth;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;
import com.example.hotelbookingandroid.data.model.auth.RegisterRequest;
import com.example.hotelbookingandroid.data.repository.AuthRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

public class AuthViewModel extends BaseViewModel {
    private final AuthRepository repository = new AuthRepository();

    public LiveData<Resource<AuthResponse>> login(String portal, String email, String password) {
        return repository.login(portal, email.trim(), password);
    }

    public LiveData<Resource<AuthResponse>> register(String fullName, String email, String phone, String password) {
        return repository.register(new RegisterRequest(fullName.trim(), email.trim(), password,
                phone.trim().isEmpty() ? null : phone.trim(), null));
    }
}
