package com.example.hotelbookingandroid.ui.portal.admin;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.SessionManager;

import java.util.List;

/** Màu badge vai trò: Admin = đất nung đậm, Hotel Staff = cam nhạt, khách / khác = xám. */
final class RoleStyle {
    private RoleStyle() {}

    static void apply(TextView v, List<String> roles) {
        int bg, fg;
        if (roles != null && roles.contains(SessionManager.ROLE_ADMIN)) { bg = R.color.md_primary; fg = R.color.md_on_primary; }
        else if (roles != null && roles.contains(SessionManager.ROLE_STAFF)) { bg = R.color.md_secondary_fixed; fg = R.color.md_on_secondary_container; }
        else { bg = R.color.md_surface_container_high; fg = R.color.md_on_surface_variant; }
        v.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(v.getContext(), bg)));
        v.setTextColor(ContextCompat.getColor(v.getContext(), fg));
    }
}
