package com.example.hotelbookingandroid.ui.common;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.annotation.ColorRes;
import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;
import com.google.android.material.chip.Chip;

/** Màu badge theo trạng thái đơn / thanh toán, dùng chung cho danh sách và chi tiết đơn. */
public final class StatusStyle {
    private StatusStyle() {}

    /** [nền, chữ] */
    private static int[] bookingColors(String status) {
        if (status == null) return neutral();
        switch (status) {
            case "Pending": return new int[]{R.color.md_secondary_fixed, R.color.md_on_secondary_container};
            case "Confirmed": return new int[]{R.color.success_container, R.color.success};
            case "CheckedIn": return new int[]{R.color.md_primary_fixed, R.color.md_primary};
            case "Cancelled":
            case "NoShow": return new int[]{R.color.md_error_container, R.color.md_error};
            default: return neutral(); // CheckedOut, Completed
        }
    }

    private static int[] paymentColors(String status) {
        if (status == null) return neutral();
        switch (status) {
            case "Paid": return new int[]{R.color.success_container, R.color.success};
            case "PartiallyPaid": return new int[]{R.color.md_primary_fixed, R.color.md_primary};
            case "Unpaid": return new int[]{R.color.md_secondary_fixed, R.color.md_on_secondary_container};
            default: return neutral(); // RefundPending, Refunded
        }
    }

    private static int[] neutral() {
        return new int[]{R.color.md_surface_container_high, R.color.md_on_surface_variant};
    }

    public static void booking(TextView view, String status) { apply(view, bookingColors(status)); }
    public static void payment(TextView view, String status) { apply(view, paymentColors(status)); }

    private static void apply(TextView view, int[] colors) {
        apply(view, colors[0], colors[1]);
    }

    private static void apply(TextView view, @ColorRes int bg, @ColorRes int fg) {
        int bgColor = ContextCompat.getColor(view.getContext(), bg);
        int fgColor = ContextCompat.getColor(view.getContext(), fg);
        view.setTextColor(fgColor);
        if (view instanceof Chip) {
            Chip chip = (Chip) view;
            chip.setChipBackgroundColor(ColorStateList.valueOf(bgColor));
            chip.setChipStrokeWidth(0f);
        } else {
            view.setBackgroundTintList(ColorStateList.valueOf(bgColor));
        }
    }
}
