package com.example.hotelbookingandroid.data.model.auth;

public class RegisterRequest {
    public final String fullName;
    public final String email;
    public final String password;
    public final String phone;
    /** "yyyy-MM-ddT00:00:00" hoặc null. */
    public final String dateOfBirth;

    public RegisterRequest(String fullName, String email, String password, String phone, String dateOfBirth) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.phone = phone;
        this.dateOfBirth = dateOfBirth;
    }
}
