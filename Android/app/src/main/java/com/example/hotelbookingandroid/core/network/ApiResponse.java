package com.example.hotelbookingandroid.core.network;

import java.util.List;

/** Khớp với ApiResponse<T> của Backend: { success, message, data, errors }. */
public class ApiResponse<T> {
    public boolean success;
    public String message;
    public T data;
    public List<String> errors;
}
