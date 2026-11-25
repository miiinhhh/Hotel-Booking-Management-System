package com.example.hotelbookingandroid.ui.home;

import android.content.Context;
import android.view.LayoutInflater;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.databinding.DialogGuestPickerBinding;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/** Hộp thoại chọn số người lớn / trẻ em / phòng. */
public final class GuestPickerDialog {
    private GuestPickerDialog() {}

    public static void show(Context context, HotelModels.SearchCriteria criteria, Runnable onDone) {
        DialogGuestPickerBinding b = DialogGuestPickerBinding.inflate(LayoutInflater.from(context));
        int[] values = {criteria.adults, criteria.children, criteria.rooms};
        Runnable render = () -> {
            b.tvAdults.setText(String.valueOf(values[0]));
            b.tvChildren.setText(String.valueOf(values[1]));
            b.tvRooms.setText(String.valueOf(values[2]));
        };
        b.btnAdultsMinus.setOnClickListener(v -> { if (values[0] > 1) values[0]--; render.run(); });
        b.btnAdultsPlus.setOnClickListener(v -> { if (values[0] < 30) values[0]++; render.run(); });
        b.btnChildrenMinus.setOnClickListener(v -> { if (values[1] > 0) values[1]--; render.run(); });
        b.btnChildrenPlus.setOnClickListener(v -> { if (values[1] < 20) values[1]++; render.run(); });
        b.btnRoomsMinus.setOnClickListener(v -> { if (values[2] > 1) values[2]--; render.run(); });
        b.btnRoomsPlus.setOnClickListener(v -> { if (values[2] < 20) values[2]++; render.run(); });
        render.run();

        new MaterialAlertDialogBuilder(context)
                .setTitle(R.string.guests_and_rooms)
                .setView(b.getRoot())
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.apply, (d, w) -> {
                    criteria.adults = values[0];
                    criteria.children = values[1];
                    criteria.rooms = values[2];
                    onDone.run();
                })
                .show();
    }
}
