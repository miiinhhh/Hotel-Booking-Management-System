package com.example.hotelbookingandroid.data.model.auth;

public class LoginRequest {
    public final String email;
    public final String password;
    public final boolean rememberMe;

    public LoginRequest(String email, String password, boolean rememberMe) {
        this.email = email;
        this.password = password;
        this.rememberMe = rememberMe;
    }
}
