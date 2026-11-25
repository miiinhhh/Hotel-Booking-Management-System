package com.example.hotelbookingandroid.ui.portal.calendar;

import android.content.Context;
import android.content.res.ColorStateList;

import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.CalendarDay;
import com.example.hotelbookingandroid.databinding.ItemCalendarDayBinding;

/** Màu ô ngày giống web: khóa = đỏ, hết phòng = xám đậm, sắp hết = cam nhạt, còn trống = xanh. */
final class DayStyle {
    private DayStyle() {}

    static void apply(ItemCalendarDayBinding b, CalendarDay d) {
        Context c = b.getRoot().getContext();
        int bg, accent, text;
        if (d.isEmergencyLocked || "locked".equals(d.status)) {
            bg = R.color.md_error_container; accent = R.color.md_error; text = R.color.md_error;
        } else if ("full".equals(d.status)) {
            bg = R.color.md_surface_container_highest; accent = R.color.md_inverse_surface; text = R.color.md_on_surface;
        } else if ("low".equals(d.status)) {
            bg = R.color.md_secondary_fixed; accent = R.color.md_secondary; text = R.color.md_on_secondary_container;
        } else {
            bg = R.color.success_container; accent = R.color.success; text = R.color.success;
        }
        b.card.setCardBackgroundColor(ContextCompat.getColor(c, bg));
        b.card.setStrokeWidth(d.isToday ? (int) (2 * c.getResources().getDisplayMetrics().density) : 0);
        b.card.setStrokeColor(ColorStateList.valueOf(ContextCompat.getColor(c, R.color.md_primary)));
        b.progress.setIndicatorColor(ContextCompat.getColor(c, accent));
        b.tvAvailable.setTextColor(ContextCompat.getColor(c, text));
        int onSurface = ContextCompat.getColor(c, R.color.md_on_surface);
        b.tvDow.setTextColor(d.isToday ? ContextCompat.getColor(c, R.color.md_primary) : onSurface);
        b.tvDate.setTextColor(ContextCompat.getColor(c, R.color.md_on_surface_variant));
    }
}
