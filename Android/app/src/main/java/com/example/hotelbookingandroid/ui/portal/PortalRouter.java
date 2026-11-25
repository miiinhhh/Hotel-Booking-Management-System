package com.example.hotelbookingandroid.ui.portal;

import android.content.Context;
import android.content.Intent;

import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.ui.main.MainActivity;

/** Chọn màn hình gốc theo vai trò: Admin/Staff -> Portal, còn lại -> giao diện khách hàng. */
public final class PortalRouter {
    private PortalRouter() {}

    public static void openHome(Context context) {
        Class<?> target = SessionManager.get().isPortalUser() ? PortalActivity.class : MainActivity.class;
        context.startActivity(new Intent(context, target)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK));
    }

    /** "Về cổng khách hàng" như sidebar web: mở giao diện khách mà không tự chuyển lại Portal. */
    public static void openCustomerView(Context context) {
        context.startActivity(new Intent(context, MainActivity.class)
                .putExtra(MainActivity.EXTRA_STAY_CUSTOMER, true));
    }
}
