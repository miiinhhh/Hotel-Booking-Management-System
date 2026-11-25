package com.example.hotelbookingandroid.ui.home;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels.HotelCard;
import com.example.hotelbookingandroid.databinding.ItemHotelBinding;

import java.util.ArrayList;
import java.util.List;

public class HotelAdapter extends RecyclerView.Adapter<HotelAdapter.VH> {
    public interface OnClick { void onHotel(HotelCard hotel); }

    private final List<HotelCard> items = new ArrayList<>();
    private final OnClick listener;

    public HotelAdapter(OnClick listener) {
        this.listener = listener;
    }

    public void submit(List<HotelCard> list) {
        items.clear();
        if (list != null) items.addAll(list);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemHotelBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        HotelCard hotel = items.get(position);
        var ctx = h.b.getRoot().getContext();
        h.b.tvName.setText(hotel.name);
        h.b.tvAddress.setText(hotel.address + ", " + hotel.city);
        h.b.tvRoomType.setText(ctx.getString(R.string.room_type_capacity, hotel.roomTypeName, hotel.capacity));
        h.b.tvAvailable.setText(ctx.getString(R.string.available_rooms, hotel.availableRooms));
        h.b.tvPrice.setText(Formatters.vnd(hotel.pricePerNight));
        UiUtils.loadImage(h.b.ivHotel, hotel.imageUrl);
        h.b.getRoot().setOnClickListener(v -> listener.onHotel(hotel));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemHotelBinding b;
        VH(ItemHotelBinding b) { super(b.getRoot()); this.b = b; }
    }
}
