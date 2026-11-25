package com.example.hotelbookingandroid.ui.portal;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;

/** Màu badge riêng của Portal (hạng khách, trạng thái bật/tắt, đánh giá). */
public final class PortalStyle {
    private PortalStyle() {}

    public static void tier(TextView v, String tier) {
        if ("PLATINUM".equals(tier)) apply(v, R.color.md_inverse_surface, R.color.white);
        else if ("GOLD".equals(tier)) apply(v, R.color.md_secondary_fixed, R.color.md_on_secondary_container);
        else if ("SILVER".equals(tier)) apply(v, R.color.md_surface_container_high, R.color.md_on_surface);
        else apply(v, R.color.md_surface_container, R.color.md_on_surface_variant);
    }

    public static void active(TextView v, boolean active) {
        if (active) apply(v, R.color.success_container, R.color.success);
        else apply(v, R.color.md_surface_container_high, R.color.md_on_surface_variant);
    }

    public static void review(TextView v, String status) {
        if ("Visible".equals(status)) apply(v, R.color.success_container, R.color.success);
        else if ("Hidden".equals(status)) apply(v, R.color.md_secondary_fixed, R.color.md_on_secondary_container);
        else apply(v, R.color.md_error_container, R.color.md_error);
    }

    public static void severity(TextView v, boolean action) {
        if (action) apply(v, R.color.md_error_container, R.color.md_error);
        else apply(v, R.color.md_primary_fixed, R.color.md_primary);
    }

    private static void apply(TextView v, int bg, int fg) {
        v.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(v.getContext(), bg)));
        v.setTextColor(ContextCompat.getColor(v.getContext(), fg));
    }
}
