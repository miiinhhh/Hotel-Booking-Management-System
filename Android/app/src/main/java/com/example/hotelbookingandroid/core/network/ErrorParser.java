package com.example.hotelbookingandroid.core.network;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.io.IOException;
import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

import okhttp3.ResponseBody;
import retrofit2.Response;

/** Chuyển lỗi HTTP / ProblemDetails / ApiResponse của Backend thành thông báo hiển thị. */
public final class ErrorParser {
    private ErrorParser() {}

    public static String from(Response<?> response) {
        String fallback;
        switch (response.code()) {
            case 401: fallback = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."; break;
            case 403: fallback = "Bạn không có quyền thực hiện thao tác này."; break;
            case 404: fallback = "Không tìm thấy dữ liệu."; break;
            default: fallback = "Yêu cầu thất bại (" + response.code() + ").";
        }
        try (ResponseBody body = response.errorBody()) {
            if (body == null) return fallback;
            JsonObject json = ApiClient.gson().fromJson(body.string(), JsonObject.class);
            if (json == null) return fallback;
            for (String key : new String[]{"detail", "message"}) {
                if (json.has(key) && json.get(key).isJsonPrimitive()) return json.get(key).getAsString();
            }
            if (json.has("errors")) {
                JsonElement errors = json.get("errors");
                if (errors.isJsonArray() && errors.getAsJsonArray().size() > 0)
                    return errors.getAsJsonArray().get(0).getAsString();
                if (errors.isJsonObject()) {
                    for (String k : errors.getAsJsonObject().keySet()) {
                        JsonElement v = errors.getAsJsonObject().get(k);
                        if (v.isJsonArray() && v.getAsJsonArray().size() > 0)
                            return v.getAsJsonArray().get(0).getAsString();
                    }
                }
            }
            if (json.has("title") && json.get("title").isJsonPrimitive()) return json.get("title").getAsString();
        } catch (Exception ignored) {
            // giữ fallback
        }
        return fallback;
    }

    public static String from(Throwable t) {
        if (t instanceof ConnectException || t instanceof UnknownHostException)
            return "Không kết nối được máy chủ. Kiểm tra Backend và địa chỉ API.";
        if (t instanceof SocketTimeoutException) return "Máy chủ phản hồi quá lâu. Vui lòng thử lại.";
        if (t instanceof IOException) return "Lỗi mạng. Vui lòng thử lại.";
        return t.getMessage() != null ? t.getMessage() : "Đã có lỗi xảy ra.";
    }
}
