package com.example.hotelbookingandroid.ui.offers;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.data.model.voucher.PublicVoucher;
import com.example.hotelbookingandroid.databinding.ItemVoucherBinding;

import java.util.ArrayList;
import java.util.List;

public class VoucherAdapter extends RecyclerView.Adapter<VoucherAdapter.VH> {
    public interface OnCopy { void onCopy(PublicVoucher voucher); }

    private final List<PublicVoucher> items = new ArrayList<>();
    private final OnCopy listener;

    public VoucherAdapter(OnCopy listener) {
        this.listener = listener;
    }

    public void submit(List<PublicVoucher> list) {
        items.clear();
        if (list != null) items.addAll(list);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemVoucherBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        PublicVoucher v = items.get(position);
        var ctx = h.b.getRoot().getContext();
        // Khối bên trái chỉ hiện con số ngắn gọn; chi tiết đưa sang cột phải.
        h.b.tvDiscount.setText(v.isPercentage()
                ? ctx.getString(R.string.voucher_percent_short, (int) v.discountValue)
                : Formatters.compactVnd(v.discountValue));
        h.b.tvCode.setText(v.code);
        String condition = ctx.getString(R.string.voucher_min_order, Formatters.vnd(v.minimumOrderAmount));
        if (v.isPercentage() && v.maxDiscountAmount != null)
            condition += " · " + ctx.getString(R.string.voucher_max, Formatters.vnd(v.maxDiscountAmount));
        h.b.tvCondition.setText(condition);
        h.b.tvExpiry.setText(ctx.getString(R.string.voucher_expiry, DateUtils.display(v.endAt)));
        if (v.remainingForMe != null) {
            h.b.tvRemaining.setText(ctx.getString(R.string.voucher_remaining, v.remainingForMe));
        } else {
            h.b.tvRemaining.setText(ctx.getString(R.string.voucher_limit, v.usageLimitPerCustomer));
        }
        h.b.btnCopy.setOnClickListener(view -> listener.onCopy(v));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemVoucherBinding b;
        VH(ItemVoucherBinding b) { super(b.getRoot()); this.b = b; }
    }
}
