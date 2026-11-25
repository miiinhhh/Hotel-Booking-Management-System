package com.example.hotelbookingandroid.data.model.auth;

import java.util.List;

/** POST /api/auth/customer/login, /register, /refresh. */
public class AuthResponse {
    public long userId;
    public String fullName;
    public String email;
    public List<String> roles;
    public List<String> permissions;
    public String accessToken;
    public String expiresAt;
    public String refreshToken;
    public String refreshExpiresAt;
    public String tokenType;
}
