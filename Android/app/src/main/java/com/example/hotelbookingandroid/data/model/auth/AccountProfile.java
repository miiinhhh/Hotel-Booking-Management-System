package com.example.hotelbookingandroid.data.model.auth;

import java.util.List;

/** GET /api/me */
public class AccountProfile {
    public long userId;
    public String fullName;
    public String email;
    public String phone;
    public String dateOfBirth;
    public boolean isActive;
    public String createdAt;
    public List<String> roles;
    public String avatarUrl;
}
