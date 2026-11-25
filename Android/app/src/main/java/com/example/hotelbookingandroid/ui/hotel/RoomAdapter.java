package com.example.hotelbookingandroid.ui.hotel;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.databinding.ItemRoomBinding;

import java.util.ArrayList;
import java.util.List;

public class RoomAdapter extends RecyclerView.Adapter<RoomAdapter.VH> {
    public interface OnBook { void onBook(HotelModels.DiscoveryRoom room); }

    private final List<HotelModels.DiscoveryRoom> items = new ArrayList<>();
    private final OnBook listener;

    public RoomAdapter(OnBook listener) {
        this.listener = listener;
    }

    public void submit(List<HotelModels.DiscoveryRoom> list) {
        items.clear();
        if (list != null) items.addAll(list);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemRoomBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        HotelModels.DiscoveryRoom r = items.get(position);
        var ctx = h.b.getRoot().getContext();
        h.b.tvRoomName.setText(ctx.getString(R.string.room_name_value, r.name, r.roomNumber));
        h.b.tvRoomInfo.setText(ctx.getString(R.string.room_info_value, r.floor, r.capacity));
        StringBuilder amenities = new StringBuilder();
        if (r.amenities != null) {
            for (HotelModels.Amenity a : r.amenities) {
                if (amenities.length() > 0) amenities.append(" · ");
                amenities.append(a.name);
            }
        }
        h.b.tvRoomAmenities.setText(amenities);
        UiUtils.visible(h.b.tvRoomAmenities, amenities.length() > 0);
        h.b.tvRoomPrice.setText(ctx.getString(R.string.price_per_night, Formatters.vnd(r.pricePerNight)));
        UiUtils.loadImage(h.b.ivRoom, r.imageUrl);
        h.b.btnBook.setOnClickListener(v -> listener.onBook(r));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final ItemRoomBinding b;
        VH(ItemRoomBinding b) { super(b.getRoot()); this.b = b; }
    }
}
