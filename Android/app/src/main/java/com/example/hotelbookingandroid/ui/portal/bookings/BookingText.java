package com.example.hotelbookingandroid.ui.portal.bookings;

import android.content.Context;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;

/** Ghép chuỗi hiển thị phòng: "P.402, P.403 · Deluxe · Tòa A". */
final class BookingText {
    private BookingText() {}

    static String rooms(Context ctx, PortalModels.PortalBooking b) {
        StringBuilder sb = new StringBuilder();
        if (b.roomNumbers != null && !b.roomNumbers.isEmpty())
            sb.append(ctx.getString(R.string.room_prefix, String.join(", ", b.roomNumbers)));
        appendJoined(sb, b.roomTypes);
        appendJoined(sb, b.areas);
        return sb.length() == 0 ? ctx.getString(R.string.no_room_assigned) : sb.toString();
    }

    private static void appendJoined(StringBuilder sb, java.util.List<String> parts) {
        if (parts == null || parts.isEmpty()) return;
        if (sb.length() > 0) sb.append(" · ");
        sb.append(String.join(", ", parts));
    }
}
