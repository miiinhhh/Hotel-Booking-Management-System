package com.example.hotelbookingandroid.ui.portal.calendar;

import android.view.LayoutInflater;
import android.view.View;

import androidx.fragment.app.Fragment;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.SheetRoomLockBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.chip.Chip;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointForward;
import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.timepicker.MaterialTimePicker;
import com.google.android.material.timepicker.TimeFormat;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.TimeZone;

/**
 * Form khóa bán phòng (tương đương EmergencyLockModal của web).
 * Chỉ cho chọn phòng thuộc hạng/phân khu được phép; Backend từ chối toàn bộ nếu chồng lấn booking/lệnh khóa.
 */
public final class RoomLockSheet {
    public interface OnLocked { void onLocked(int lockedCount); }

    private static final int[] REASONS = {R.string.reason_maintenance, R.string.reason_emergency,
            R.string.reason_vip_hold, R.string.reason_other};

    private final Fragment host;
    private final int hotelId;
    private final Set<Long> allowedRoomIds;
    private final OnLocked onLocked;
    private final PortalRepository repository = new PortalRepository();
    private final SheetRoomLockBinding b;
    private final BottomSheetDialog dialog;
    private final Set<Long> selected = new HashSet<>();
    private final Calendar start = Calendar.getInstance();
    private final Calendar end = Calendar.getInstance();

    private RoomLockSheet(Fragment host, int hotelId, String category, List<Long> allowedRoomIds,
                          String startDate, OnLocked onLocked) {
        this.host = host;
        this.hotelId = hotelId;
        this.allowedRoomIds = new HashSet<>(allowedRoomIds);
        this.onLocked = onLocked;
        b = SheetRoomLockBinding.inflate(LayoutInflater.from(host.requireContext()));
        dialog = new BottomSheetDialog(host.requireContext());
        dialog.setContentView(b.getRoot());
        dialog.getBehavior().setState(BottomSheetBehavior.STATE_EXPANDED);
        dialog.getBehavior().setSkipCollapsed(true);

        b.tvCategory.setText(category);
        initTimes(startDate);
        b.btnStart.setOnClickListener(v -> pick(start, true));
        b.btnEnd.setOnClickListener(v -> pick(end, false));
        for (int i = 0; i < REASONS.length; i++) {
            Chip chip = new Chip(host.requireContext());
            chip.setId(View.generateViewId());
            chip.setText(REASONS[i]);
            chip.setCheckable(true);
            chip.setChecked(i == 0);
            b.chipGroupReason.addView(chip);
        }
        b.tvSelectAll.setOnClickListener(v -> toggleAll());
        b.btnSubmit.setOnClickListener(v -> submit());
        loadRooms();
    }

    /** @param startDate ngày được chạm trên lịch (yyyy-MM-dd) hoặc null = bây giờ. */
    public static void show(Fragment host, int hotelId, String category, List<Long> allowedRoomIds,
                            String startDate, OnLocked onLocked) {
        new RoomLockSheet(host, hotelId, category, allowedRoomIds, startDate, onLocked).dialog.show();
    }

    private void initTimes(String startDate) {
        start.set(Calendar.SECOND, 0);
        start.set(Calendar.MILLISECOND, 0);
        if (startDate != null && !startDate.equals(DateUtils.today(0))) {
            // Ngày tương lai: mặc định khóa từ 14:00 (giờ nhận phòng phổ biến).
            try {
                SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                start.setTime(f.parse(startDate));
                start.set(Calendar.HOUR_OF_DAY, 14);
            } catch (Exception ignored) { }
        } else {
            start.add(Calendar.MINUTE, 5); // tránh bị coi là thời điểm quá khứ khi gửi
        }
        end.setTimeInMillis(start.getTimeInMillis());
        end.add(Calendar.DAY_OF_MONTH, 1);
        renderTimes();
    }

    private void renderTimes() {
        SimpleDateFormat f = new SimpleDateFormat("dd/MM/yyyy\nHH:mm", Locale.US);
        b.btnStart.setText(host.getString(R.string.lock_from, f.format(start.getTime())));
        b.btnEnd.setText(host.getString(R.string.lock_to, f.format(end.getTime())));
    }

    /** Chọn ngày rồi giờ cho một mốc thời gian. */
    private void pick(Calendar target, boolean isStart) {
        long utcSelection = toUtcDayMillis(target);
        MaterialDatePicker<Long> datePicker = MaterialDatePicker.Builder.datePicker()
                .setTitleText(isStart ? R.string.lock_start : R.string.lock_end)
                .setSelection(utcSelection)
                .setCalendarConstraints(new CalendarConstraints.Builder()
                        .setValidator(DateValidatorPointForward.now()).build())
                .build();
        datePicker.addOnPositiveButtonClickListener(sel -> {
            Calendar utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
            utc.setTimeInMillis(sel);
            target.set(utc.get(Calendar.YEAR), utc.get(Calendar.MONTH), utc.get(Calendar.DAY_OF_MONTH));
            MaterialTimePicker timePicker = new MaterialTimePicker.Builder()
                    .setTimeFormat(TimeFormat.CLOCK_24H)
                    .setHour(target.get(Calendar.HOUR_OF_DAY))
                    .setMinute(target.get(Calendar.MINUTE))
                    .build();
            timePicker.addOnPositiveButtonClickListener(t -> {
                target.set(Calendar.HOUR_OF_DAY, timePicker.getHour());
                target.set(Calendar.MINUTE, timePicker.getMinute());
                if (isStart && !end.after(start)) {
                    end.setTimeInMillis(start.getTimeInMillis());
                    end.add(Calendar.DAY_OF_MONTH, 1);
                }
                renderTimes();
            });
            timePicker.show(host.getChildFragmentManager(), "lockTime");
        });
        datePicker.show(host.getChildFragmentManager(), "lockDate");
    }

    private static long toUtcDayMillis(Calendar local) {
        Calendar utc = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        utc.clear();
        utc.set(local.get(Calendar.YEAR), local.get(Calendar.MONTH), local.get(Calendar.DAY_OF_MONTH));
        return utc.getTimeInMillis();
    }

    private void loadRooms() {
        SingleObserver.observe(host.getViewLifecycleOwner(), repository.rooms(hotelId), res -> {
            UiUtils.visible(b.progressRooms, res.isLoading());
            if (res.isError()) showError(res.message);
            if (!res.isSuccess() || res.data == null) return;
            b.chipGroupRooms.removeAllViews();
            List<PortalModels.Room> rooms = new ArrayList<>();
            for (PortalModels.Room r : res.data) {
                if (r.isActive && (allowedRoomIds.isEmpty() || allowedRoomIds.contains(r.roomId))) rooms.add(r);
            }
            rooms.sort((x, y) -> x.roomNumber.compareTo(y.roomNumber));
            for (PortalModels.Room r : rooms) {
                Chip chip = new Chip(host.requireContext());
                chip.setText(host.getString(R.string.room_chip, r.roomNumber, r.floor));
                chip.setCheckable(true);
                chip.setOnCheckedChangeListener((c, checked) -> {
                    if (checked) selected.add(r.roomId); else selected.remove(r.roomId);
                    b.btnSubmit.setEnabled(!selected.isEmpty());
                    b.btnSubmit.setText(selected.isEmpty() ? host.getString(R.string.confirm_lock)
                            : host.getString(R.string.confirm_lock_count, selected.size()));
                });
                b.chipGroupRooms.addView(chip);
            }
            if (rooms.isEmpty()) showError(host.getString(R.string.no_lockable_rooms));
        });
    }

    private void toggleAll() {
        boolean selectAll = selected.size() < b.chipGroupRooms.getChildCount();
        for (int i = 0; i < b.chipGroupRooms.getChildCount(); i++)
            ((Chip) b.chipGroupRooms.getChildAt(i)).setChecked(selectAll);
    }

    private String reason() {
        int checkedId = b.chipGroupReason.getCheckedChipId();
        String preset = "";
        if (checkedId != View.NO_ID) preset = String.valueOf(((Chip) b.chipGroupReason.findViewById(checkedId)).getText());
        String note = String.valueOf(b.etNote.getText()).trim();
        if (preset.isEmpty()) return note;
        return note.isEmpty() ? preset : preset + ": " + note;
    }

    private void submit() {
        String reason = reason();
        if (selected.isEmpty()) { showError(host.getString(R.string.err_lock_rooms)); return; }
        if (!end.after(start)) { showError(host.getString(R.string.err_lock_time)); return; }
        if (reason.isEmpty()) { showError(host.getString(R.string.err_lock_reason)); return; }
        if (reason.length() > 500) reason = reason.substring(0, 500);
        UiUtils.visible(b.tvError, false);

        PortalModels.LockRequest request = new PortalModels.LockRequest(new ArrayList<>(selected),
                DateUtils.toIsoUtc(start.getTimeInMillis()), DateUtils.toIsoUtc(end.getTimeInMillis()), reason);
        SingleObserver.observe(host.getViewLifecycleOwner(), repository.lock(hotelId, request), res -> {
            UiUtils.visible(b.progressSubmit, res.isLoading());
            b.btnSubmit.setEnabled(!res.isLoading());
            if (res.isError()) showError(res.message);
            if (res.isSuccess()) {
                dialog.dismiss();
                onLocked.onLocked(res.data != null ? res.data.size() : selected.size());
            }
        });
    }

    private void showError(String message) {
        UiUtils.visible(b.tvError, true);
        b.tvError.setText(message);
    }
}
