package com.example.hotelbookingandroid.data.model.voucher;

/** GET /api/vouchers/available */
public class PublicVoucher {
    public String code;
    /** "Percentage" | "FixedAmount" */
    public String voucherType;
    public double discountValue;
    public Double maxDiscountAmount;
    public double minimumOrderAmount;
    public String startAt;
    public String endAt;
    public int usageLimitPerCustomer;
    public Double usedPercent;
    public Integer remainingForMe;

    public boolean isPercentage() {
        return "Percentage".equals(voucherType);
    }
}
