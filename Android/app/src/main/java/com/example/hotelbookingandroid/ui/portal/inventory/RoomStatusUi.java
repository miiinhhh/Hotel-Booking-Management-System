package com.example.hotelbookingandroid.ui.portal.inventory;

import android.content.res.ColorStateList;
import android.widget.TextView;

import androidx.annotation.StringRes;
import androidx.core.content.ContextCompat;

import com.example.hotelbookingandroid.R;

/** Nhãn + màu trạng thái vận hành của phòng (Available / Occupied / Maintenance / Inactive). */
final class RoomStatusUi {
    private RoomStatusUi() {}

    /** Trạng thái có thể chọn trong form (Inactive đặt qua nút vô hiệu hóa). */
    static final String[] EDITABLE = {"Available", "Occupied", "Maintenance"};
    /** Bộ lọc ở danh sách phòng: null = tất cả. */
    static final String[] FILTERS = {null, "Available", "Occupied", "Maintenance", "Inactive"};

    @StringRes
    static int label(String status) {
        if (status == null) return R.string.status_all;
        switch (status) {
            case "Available": return R.string.room_available;
            case "Occupied": return R.string.room_occupied;
            case "Maintenance": return R.string.room_maintenance;
            default: return R.string.room_inactive;
        }
    }

    static void apply(TextView v, String status) {
        int bg, fg;
        if ("Available".equals(status)) { bg = R.color.success_container; fg = R.color.success; }
        else if ("Occupied".equals(status)) { bg = R.color.md_primary_fixed; fg = R.color.md_primary; }
        else if ("Maintenance".equals(status)) { bg = R.color.md_secondary_fixed; fg = R.color.md_on_secondary_container; }
        else { bg = R.color.md_surface_container_high; fg = R.color.md_on_surface_variant; }
        v.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(v.getContext(), bg)));
        v.setTextColor(ContextCompat.getColor(v.getContext(), fg));
    }
}
