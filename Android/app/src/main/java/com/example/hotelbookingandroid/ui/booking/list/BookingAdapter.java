package com.example.hotelbookingandroid.ui.booking.list;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.booking.BookingModels.BookingListItem;
import com.example.hotelbookingandroid.databinding.ItemBookingBinding;
import com.example.hotelbookingandroid.ui.common.StatusStyle;

import java.util.ArrayList;
import java.util.List;

public class BookingAdapter extends RecyclerView.Adapter<BookingAdapter.VH> {
    public interface OnClick { void onBooking(BookingListItem item); }

    private final List<BookingListItem> items = new ArrayList<>();
    private final OnClick listener;

    public BookingAdapter(OnClick listener) {
        this.listener = listener;
    }

    public void submit(List<BookingListItem> list) {
        items.clear();
        if (list != null) items.addAll(list);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemBookingBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        BookingListItem b = items.get(position);
        var ctx = h.b.getRoot().getContext();
        h.b.tvHotel.setText(b.hotelName != null ? b.hotelName : ctx.getString(R.string.app_name));
        h.b.tvCode.setText(ctx.getString(R.string.booking_code_value, b.bookingCode));
        h.b.tvDates.setText(ctx.getString(R.string.dates_short, DateUtils.display(b.checkInDate), DateUtils.display(b.checkOutDate)));
        h.b.tvRoomType.setText(b.roomTypeName != null ? b.roomTypeName : ctx.getString(R.string.room_count, b.roomCount));
        h.b.tvTotal.setText(Formatters.vnd(b.totalAmount));
        h.b.tvStatus.setText(Formatters.bookingStatus(b.bookingStatus));
        StatusStyle.booking(h.b.tvStatus, b.bookingStatus);
        h.b.tvPaymentStatus.setText(Formatters.paymentStatus(b.paymentStatus));
        StatusStyle.payment(h.b.tvPaymentStatus, b.paymentStatus);
        UiUtils.loadImage(h.b.ivHotel, b.imageUrl);
        h.b.getRoot().setOnClickListener(v -> listener.onBooking(b));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemBookingBinding b;
        VH(ItemBookingBinding b) { super(b.getRoot()); this.b = b; }
    }
}
