package com.example.hotelbookingandroid.core.util;

import java.text.NumberFormat;
import java.util.Locale;

public final class Formatters {
    private Formatters() {}

    public static String vnd(double amount) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        nf.setMaximumFractionDigits(0);
        return nf.format(amount) + " ₫";
    }

    /** "Nguyễn Văn An" -> "VA" (2 chữ cuối, giống avatar chữ của web). */
    public static String initials(String name, String fallback) {
        if (name == null || name.trim().isEmpty()) return fallback;
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (int i = Math.max(0, parts.length - 2); i < parts.length; i++) sb.append(parts[i].charAt(0));
        return sb.toString().toUpperCase(Locale.ROOT);
    }

    /** 50000 -> "50K", 1500000 -> "1,5TR" — dùng cho chỗ hẹp như khối voucher. */
    public static String compactVnd(double amount) {
        NumberFormat nf = NumberFormat.getInstance(new Locale("vi", "VN"));
        nf.setMaximumFractionDigits(1);
        if (amount >= 1_000_000) return nf.format(amount / 1_000_000) + "TR";
        if (amount >= 1_000) return nf.format(amount / 1_000) + "K";
        return nf.format(amount) + "₫";
    }

    public static String bookingStatus(String s) {
        if (s == null) return "";
        switch (s) {
            case "Pending": return "Chờ thanh toán";
            case "Confirmed": return "Đã xác nhận";
            case "CheckedIn": return "Đã nhận phòng";
            case "CheckedOut": return "Đã trả phòng";
            case "Completed": return "Hoàn tất";
            case "Cancelled": return "Đã hủy";
            case "NoShow": return "Không đến";
            default: return s;
        }
    }

    public static String paymentStatus(String s) {
        if (s == null) return "";
        switch (s) {
            case "Unpaid": return "Chưa thanh toán";
            case "PartiallyPaid": return "Đã đặt cọc";
            case "Paid": return "Đã thanh toán";
            case "RefundPending": return "Chờ hoàn tiền";
            case "Refunded": return "Đã hoàn tiền";
            default: return s;
        }
    }
}
