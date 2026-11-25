package com.example.hotelbookingandroid.ui.portal.admin;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;

/** Badge khoảng giá: đang áp dụng = xanh, bị chồng lấn = cam, sắp áp dụng = đất nung, đã kết thúc = xám. */
final class PeriodStyle {
    private PeriodStyle() {}

    static void apply(TextView v, PricingFragment.Period p, boolean isCurrent) {
        int bg, fg;
        if (p == PricingFragment.Period.ACTIVE && isCurrent) { bg = R.color.success_container; fg = R.color.success; }
        else if (p == PricingFragment.Period.ACTIVE) { bg = R.color.md_secondary_fixed; fg = R.color.md_on_secondary_container; }
        else if (p == PricingFragment.Period.UPCOMING) { bg = R.color.md_primary_fixed; fg = R.color.md_primary; }
        else { bg = R.color.md_surface_container_high; fg = R.color.md_on_surface_variant; }
        v.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(v.getContext(), bg)));
        v.setTextColor(ContextCompat.getColor(v.getContext(), fg));
    }
}
