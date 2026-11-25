package com.example.hotelbookingandroid.ui.portal.calendar;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;

/** Badge trạng thái lệnh khóa: đang hiệu lực = đỏ, đã lên lịch = cam, đã gỡ / hết hạn = xám. */
final class LockStyle {
    private LockStyle() {}

    static void apply(TextView v, String status) {
        int bg, fg;
        if ("Active".equals(status)) { bg = R.color.md_error_container; fg = R.color.md_error; }
        else if ("Scheduled".equals(status)) { bg = R.color.md_secondary_fixed; fg = R.color.md_on_secondary_container; }
        else { bg = R.color.md_surface_container_high; fg = R.color.md_on_surface_variant; }
        v.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(v.getContext(), bg)));
        v.setTextColor(ContextCompat.getColor(v.getContext(), fg));
    }
}
