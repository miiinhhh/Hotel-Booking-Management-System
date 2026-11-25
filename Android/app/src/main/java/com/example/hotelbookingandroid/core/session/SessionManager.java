package com.example.hotelbookingandroid.core.session;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MutableLiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;

/** Lưu phiên đăng nhập (AuthResponse) vào SharedPreferences và phát trạng thái đăng nhập. */
public final class SessionManager {
    private static final String PREFS = "stayluxe.session";
    private static final String KEY_AUTH = "auth";
    private static SessionManager instance;

    private final SharedPreferences prefs;
    private final MutableLiveData<Boolean> loggedIn = new MutableLiveData<>();
    private AuthResponse cached;

    private SessionManager(Context context) {
        prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = prefs.getString(KEY_AUTH, null);
        if (raw != null) {
            try { cached = ApiClient.gson().fromJson(raw, AuthResponse.class); } catch (Exception e) { cached = null; }
        }
        if (cached != null && DateUtils.isPast(cached.refreshExpiresAt)) cached = null;
        loggedIn.setValue(cached != null);
    }

    public static void init(Context context) {
        if (instance == null) instance = new SessionManager(context);
    }

    public static SessionManager get() {
        return instance;
    }

    public synchronized void save(AuthResponse auth) {
        cached = auth;
        prefs.edit().putString(KEY_AUTH, ApiClient.gson().toJson(auth)).apply();
        loggedIn.postValue(true);
    }

    public synchronized void clear() {
        cached = null;
        prefs.edit().remove(KEY_AUTH).apply();
        loggedIn.postValue(false);
    }

    public synchronized AuthResponse getAuth() { return cached; }
    public synchronized String getAccessToken() { return cached != null ? cached.accessToken : null; }
    public synchronized String getRefreshToken() { return cached != null ? cached.refreshToken : null; }
    public boolean isLoggedIn() { return getAuth() != null; }

    // ===== Vai trò & quyền (khớp SystemRoles / SystemPermissions của Backend) =====
    public static final String ROLE_ADMIN = "Admin";
    public static final String ROLE_STAFF = "Hotel Staff";

    public synchronized boolean hasRole(String role) {
        return cached != null && cached.roles != null && cached.roles.contains(role);
    }

    public boolean isAdmin() { return hasRole(ROLE_ADMIN); }
    public boolean isStaff() { return hasRole(ROLE_STAFF); }
    /** Tài khoản nội bộ dùng Portal thay cho giao diện khách hàng. */
    public boolean isPortalUser() { return isAdmin() || isStaff(); }

    /** Admin luôn có toàn quyền; các vai trò khác xét theo danh sách permissions trong token. */
    public synchronized boolean hasAnyPermission(String... permissions) {
        if (cached == null) return false;
        if (permissions.length == 0 || isAdmin()) return true;
        if (cached.permissions == null) return false;
        for (String p : permissions) if (cached.permissions.contains(p)) return true;
        return false;
    }
    public LiveData<Boolean> loggedInState() { return loggedIn; }
}
