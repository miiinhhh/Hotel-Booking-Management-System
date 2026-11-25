package com.example.hotelbookingandroid.ui.portal.admin;

import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;

import androidx.core.util.Pair;
import androidx.fragment.app.Fragment;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.RoomType;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.SheetPriceFormBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.chip.Chip;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointForward;
import com.google.android.material.datepicker.MaterialDatePicker;

/**
 * Form "Đặt giá mới": tạo bản ghi RoomPriceHistory (giá + khoảng hiệu lực),
 * tùy chọn cập nhật luôn giá gốc của hạng phòng như nút "Cập nhật làm giá gốc vĩnh viễn" trên web.
 */
final class PriceFormSheet {
    interface OnSaved { void onSaved(String message); }

    /** Điều chỉnh nhanh so với giá gốc: 0 = về đúng giá gốc. */
    private static final int[] QUICK_PERCENTS = {0, -10, 10, 20, 50};

    private final Fragment host;
    private final int hotelId;
    private final RoomType type;
    private final OnSaved onSaved;
    private final PortalRepository repository = new PortalRepository();
    private final SheetPriceFormBinding b;
    private final BottomSheetDialog dialog;
    private String from = DateUtils.today(0);
    private String to;

    private PriceFormSheet(Fragment host, int hotelId, RoomType type, double suggested, boolean canUpdateBase, OnSaved onSaved) {
        this.host = host;
        this.hotelId = hotelId;
        this.type = type;
        this.onSaved = onSaved;
        b = SheetPriceFormBinding.inflate(LayoutInflater.from(host.requireContext()));
        dialog = new BottomSheetDialog(host.requireContext());
        dialog.setContentView(b.getRoot());
        dialog.getBehavior().setState(BottomSheetBehavior.STATE_EXPANDED);
        dialog.getBehavior().setSkipCollapsed(true);

        b.tvSubtitle.setText(host.getString(R.string.price_form_subtitle, type.name, Formatters.vnd(type.basePrice)));
        b.etPrice.setText(String.valueOf(Math.round(suggested)));
        b.etPrice.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int c, int d) { }
            @Override public void onTextChanged(CharSequence s, int a, int c, int d) { }
            @Override public void afterTextChanged(Editable s) { renderPreview(); }
        });
        for (int pct : QUICK_PERCENTS) {
            Chip chip = new Chip(host.requireContext());
            chip.setText(pct == 0 ? host.getString(R.string.quick_base) : String.format(java.util.Locale.US, "%+d%%", pct));
            chip.setOnClickListener(v -> {
                // Làm tròn tới nghìn đồng cho dễ đọc.
                long value = Math.round(type.basePrice * (100 + pct) / 100.0 / 1000.0) * 1000;
                b.etPrice.setText(String.valueOf(value));
            });
            b.chipGroupQuick.addView(chip);
        }

        b.btnFrom.setOnClickListener(v -> pickRange());
        b.btnTo.setOnClickListener(v -> pickRange());
        b.tvClearTo.setOnClickListener(v -> { to = null; renderDates(); });
        UiUtils.visible(b.switchBase, canUpdateBase);
        b.footer.btnSave.setText(R.string.apply_price);
        b.footer.btnSave.setOnClickListener(v -> submit());
        renderDates();
        renderPreview();
    }

    static void show(Fragment host, int hotelId, RoomType type, double suggested, boolean canUpdateBase, OnSaved onSaved) {
        new PriceFormSheet(host, hotelId, type, suggested, canUpdateBase, onSaved).dialog.show();
    }

    private Long price() {
        try {
            String s = String.valueOf(b.etPrice.getText()).trim();
            return s.isEmpty() ? null : Long.parseLong(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private void renderPreview() {
        Long p = price();
        if (p == null || type.basePrice <= 0) { b.tvPricePreview.setText(""); return; }
        double pct = (p - type.basePrice) * 100 / type.basePrice;
        b.tvPricePreview.setText(host.getString(R.string.price_preview, Formatters.vnd(p),
                String.format(java.util.Locale.US, "%+.1f%%", pct)));
    }

    private void renderDates() {
        b.btnFrom.setText(host.getString(R.string.lock_from, DateUtils.display(from)));
        b.btnTo.setText(host.getString(R.string.lock_to, to != null ? DateUtils.display(to) : host.getString(R.string.no_end)));
        UiUtils.visible(b.tvClearTo, to != null);
    }

    /** Chọn khoảng ngày; chọn cùng một ngày = không có ngày kết thúc. */
    private void pickRange() {
        MaterialDatePicker<Pair<Long, Long>> picker = MaterialDatePicker.Builder.dateRangePicker()
                .setTitleText(R.string.price_effective)
                .setSelection(new Pair<>(DateUtils.toUtcMillis(from), to != null ? DateUtils.toUtcMillis(to) : null))
                .setCalendarConstraints(new CalendarConstraints.Builder()
                        .setValidator(DateValidatorPointForward.from(DateUtils.toUtcMillis(DateUtils.today(0)))).build())
                .build();
        picker.addOnPositiveButtonClickListener(sel -> {
            if (sel.first == null) return;
            from = DateUtils.fromUtcMillis(sel.first);
            to = sel.second != null && !sel.second.equals(sel.first) ? DateUtils.fromUtcMillis(sel.second) : null;
            renderDates();
        });
        picker.show(host.getChildFragmentManager(), "priceRange");
    }

    private void submit() {
        Long p = price();
        if (p == null || p <= 0) { b.tilPrice.setError(host.getString(R.string.err_positive)); return; }
        b.tilPrice.setError(null);
        UiUtils.visible(b.tvError, false);

        // Giống web: ngày chọn -> nửa đêm UTC dạng ISO.
        PortalModels.PriceHistoryRequest request = new PortalModels.PriceHistoryRequest(p,
                from + "T00:00:00Z", to != null ? to + "T00:00:00Z" : null);
        SingleObserver.observe(host.getViewLifecycleOwner(), repository.createPriceHistory(hotelId, type.roomTypeId, request), res -> {
            setBusy(res.isLoading());
            if (res.isError()) showError(res.message);
            if (!res.isSuccess()) return;
            if (b.switchBase.isChecked()) updateBase(p);
            else finish(host.getString(R.string.price_saved));
        });
    }

    /** PUT hạng phòng với BasePrice mới, giữ nguyên các trường khác. */
    private void updateBase(long newBase) {
        PortalModels.RoomTypeInput input = new PortalModels.RoomTypeInput(type.name, type.description,
                newBase, type.capacity, type.numberOfBeds);
        SingleObserver.observe(host.getViewLifecycleOwner(), repository.saveRoomType(hotelId, type.areaId, type.roomTypeId, input), res -> {
            setBusy(res.isLoading());
            // Khoảng giá đã lưu thành công; chỉ báo lỗi phần giá gốc.
            if (res.isError()) finish(host.getString(R.string.price_saved_base_failed, res.message));
            if (res.isSuccess()) finish(host.getString(R.string.price_and_base_saved));
        });
    }

    private void finish(String message) {
        dialog.dismiss();
        onSaved.onSaved(message);
    }

    private void setBusy(boolean busy) {
        UiUtils.visible(b.footer.progress, busy);
        b.footer.btnSave.setEnabled(!busy);
    }

    private void showError(String message) {
        UiUtils.visible(b.tvError, true);
        b.tvError.setText(message);
    }
}
