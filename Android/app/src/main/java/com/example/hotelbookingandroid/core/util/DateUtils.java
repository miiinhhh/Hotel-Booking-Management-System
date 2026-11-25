package com.example.hotelbookingandroid.core.util;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

/** Backend dùng DateOnly dạng "yyyy-MM-dd" và DateTime ISO-8601. */
public final class DateUtils {
    private DateUtils() {}

    private static SimpleDateFormat utc(String pattern) {
        SimpleDateFormat f = new SimpleDateFormat(pattern, Locale.US);
        f.setTimeZone(TimeZone.getTimeZone("UTC"));
        return f;
    }

    /** Hôm nay + offset (giờ máy), dạng yyyy-MM-dd. */
    public static String today(int offsetDays) {
        Calendar c = Calendar.getInstance();
        c.add(Calendar.DAY_OF_MONTH, offsetDays);
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(c.getTime());
    }

    /** MaterialDatePicker trả về millis UTC. */
    public static String fromUtcMillis(long millis) {
        return utc("yyyy-MM-dd").format(new Date(millis));
    }

    public static long toUtcMillis(String date) {
        try { return utc("yyyy-MM-dd").parse(date).getTime(); } catch (Exception e) { return System.currentTimeMillis(); }
    }

    public static int nights(String checkIn, String checkOut) {
        try {
            long diff = utc("yyyy-MM-dd").parse(checkOut).getTime() - utc("yyyy-MM-dd").parse(checkIn).getTime();
            return (int) TimeUnit.MILLISECONDS.toDays(diff);
        } catch (Exception e) { return 0; }
    }

    /** "2026-11-20" hoặc "2026-11-20T10:00:00" -> "20/11/2026". */
    public static String display(String value) {
        if (value == null || value.length() < 10) return value == null ? "" : value;
        try {
            Date d = utc("yyyy-MM-dd").parse(value.substring(0, 10));
            return utc("dd/MM/yyyy").format(d);
        } catch (Exception e) { return value; }
    }

    /** Thời điểm local -> ISO-8601 UTC (gửi lên Backend). */
    public static String toIsoUtc(long localMillis) {
        return utc("yyyy-MM-dd'T'HH:mm:ss'Z'").format(new Date(localMillis));
    }

    /** ISO-8601 (UTC hoặc có offset) -> "20/11 14:30" theo giờ máy. */
    public static String displayDateTime(String iso) {
        long millis = parseIso(iso);
        if (millis < 0) return iso == null ? "" : iso;
        return new SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.US).format(new Date(millis));
    }

    /** ISO-8601 -> epoch millis; -1 nếu không đọc được. */
    public static long parseIso(String iso) {
        if (iso == null || iso.length() < 19) return -1;
        try {
            String base = iso.substring(0, 19);
            String zone = iso.substring(19).replaceAll("^\\.\\d+", "");
            if (zone.isEmpty() || zone.equals("Z")) return utc("yyyy-MM-dd'T'HH:mm:ss").parse(base).getTime();
            return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).parse(base + zone).getTime();
        } catch (Exception e) {
            return -1;
        }
    }

    /** So sánh thời điểm ISO-8601 (có/không múi giờ) với hiện tại. */
    public static boolean isPast(String iso) {
        if (iso == null || iso.length() < 19) return true;
        try {
            String base = iso.substring(0, 19);
            String zone = iso.substring(19).replaceAll("^\\.\\d+", "");
            if (zone.isEmpty() || zone.equals("Z")) {
                return utc("yyyy-MM-dd'T'HH:mm:ss").parse(base).getTime() < System.currentTimeMillis();
            }
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US);
            return f.parse(base + zone).getTime() < System.currentTimeMillis();
        } catch (Exception e) {
            return false;
        }
    }
}
