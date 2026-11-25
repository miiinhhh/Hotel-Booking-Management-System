package com.example.hotelbookingandroid.ui.portal.inventory;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.TextView;

import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.HotelArea;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.Room;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.RoomType;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.SheetAreaFormBinding;
import com.example.hotelbookingandroid.databinding.SheetRoomFormBinding;
import com.example.hotelbookingandroid.databinding.SheetRoomTypeFormBinding;
import com.example.hotelbookingandroid.databinding.ViewSheetFooterBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.chip.Chip;
import com.google.android.material.textfield.TextInputLayout;

import java.util.ArrayList;
import java.util.List;

/** Form thêm/sửa dạng bottom sheet cho phân khu, hạng phòng và phòng vật lý (tương đương các Modal của web). */
public final class InventoryForms {
    private InventoryForms() {}

    public interface OnSaved { void onSaved(String message); }

    private static final PortalRepository repository = new PortalRepository();

    // ======================= Phân khu =======================

    /**
     * @param area      null = tạo mới
     * @param type      loại khi tạo mới (Zone / Building)
     * @param parentId  Zone cha mặc định khi tạo Building
     */
    public static void area(Context ctx, LifecycleOwner owner, int hotelId, HotelArea area, String type,
                            Integer parentId, List<HotelArea> zones, OnSaved onSaved) {
        SheetAreaFormBinding b = SheetAreaFormBinding.inflate(LayoutInflater.from(ctx));
        BottomSheetDialog dialog = sheet(ctx, b.getRoot());
        boolean isNew = area == null;
        String initialType = isNew ? type : area.areaType;

        b.tvTitle.setText(isNew ? ctx.getString(PortalModels.AREA_ZONE.equals(type) ? R.string.add_zone : R.string.add_building)
                : ctx.getString(R.string.edit_area));
        b.toggleType.check(PortalModels.AREA_ZONE.equals(initialType) ? R.id.btnTypeZone : R.id.btnTypeBuilding);
        // Đổi Zone <-> Building sau khi tạo dễ làm lệch cây phân khu, nên chỉ cho chọn khi tạo mới.
        b.btnTypeZone.setEnabled(isNew);
        b.btnTypeBuilding.setEnabled(isNew);

        List<HotelArea> activeZones = new ArrayList<>();
        for (HotelArea z : zones) if (z.isActive && (isNew || z.areaId != area.areaId)) activeZones.add(z);
        List<String> zoneNames = new ArrayList<>();
        for (HotelArea z : activeZones) zoneNames.add(z.areaName);
        b.dropdownParent.setAdapter(new ArrayAdapter<>(ctx, android.R.layout.simple_list_item_1, zoneNames));
        final Integer[] parent = {isNew ? parentId : area.parentAreaId};
        for (HotelArea z : activeZones) if (parent[0] != null && z.areaId == parent[0]) b.dropdownParent.setText(z.areaName, false);
        b.dropdownParent.setOnItemClickListener((p, v, pos, id) -> parent[0] = activeZones.get(pos).areaId);

        Runnable renderType = () -> UiUtils.visible(b.tilParent, b.toggleType.getCheckedButtonId() == R.id.btnTypeBuilding);
        b.toggleType.addOnButtonCheckedListener((g, id, checked) -> { if (checked) renderType.run(); });
        renderType.run();

        if (!isNew) {
            b.etName.setText(area.areaName);
            b.etLocation.setText(area.locationDescription);
            if (area.floorCount != null) b.etFloors.setText(String.valueOf(area.floorCount));
            b.etDescription.setText(area.description);
        }

        b.footer.btnSave.setOnClickListener(v -> {
            String name = text(b.etName);
            boolean building = b.toggleType.getCheckedButtonId() == R.id.btnTypeBuilding;
            Integer floors = parseInt(text(b.etFloors));
            b.tilName.setError(name.isEmpty() ? ctx.getString(R.string.err_required) : null);
            b.tilParent.setError(building && parent[0] == null ? ctx.getString(R.string.err_parent_zone) : null);
            b.tilFloors.setError(floors != null && floors < 1 ? ctx.getString(R.string.err_positive) : null);
            if (b.tilName.getError() != null || b.tilParent.getError() != null || b.tilFloors.getError() != null) return;

            PortalModels.AreaInput input = new PortalModels.AreaInput(name,
                    building ? PortalModels.AREA_BUILDING : PortalModels.AREA_ZONE,
                    building ? parent[0] : null, nullable(text(b.etDescription)), nullable(text(b.etLocation)),
                    floors, isNew || area.isActive);
            submit(owner, b.footer, b.tvError, repository.saveArea(hotelId, isNew ? null : area.areaId, input), () -> {
                dialog.dismiss();
                onSaved.onSaved(ctx.getString(isNew ? R.string.area_created : R.string.area_updated));
            });
        });
        dialog.show();
    }

    // ======================= Hạng phòng =======================

    public static void roomType(Context ctx, LifecycleOwner owner, int hotelId, HotelArea area, RoomType type, OnSaved onSaved) {
        SheetRoomTypeFormBinding b = SheetRoomTypeFormBinding.inflate(LayoutInflater.from(ctx));
        BottomSheetDialog dialog = sheet(ctx, b.getRoot());
        boolean isNew = type == null;
        b.tvTitle.setText(isNew ? R.string.add_room_type : R.string.edit_room_type);
        b.tvSubtitle.setText(area.areaName);
        if (!isNew) {
            b.etName.setText(type.name);
            b.etPrice.setText(String.valueOf((long) type.basePrice));
            b.etCapacity.setText(String.valueOf(type.capacity));
            b.etBeds.setText(String.valueOf(type.numberOfBeds));
            b.etDescription.setText(type.description);
        } else {
            b.etCapacity.setText("2");
            b.etBeds.setText("1");
        }

        b.footer.btnSave.setOnClickListener(v -> {
            String name = text(b.etName);
            Long price = parseLong(text(b.etPrice));
            Integer capacity = parseInt(text(b.etCapacity));
            Integer beds = parseInt(text(b.etBeds));
            b.tilName.setError(name.isEmpty() ? ctx.getString(R.string.err_required) : null);
            b.tilPrice.setError(price == null || price <= 0 ? ctx.getString(R.string.err_positive) : null);
            b.tilCapacity.setError(capacity == null || capacity < 1 ? ctx.getString(R.string.err_positive) : null);
            b.tilBeds.setError(beds == null || beds < 1 ? ctx.getString(R.string.err_positive) : null);
            if (hasError(b.tilName, b.tilPrice, b.tilCapacity, b.tilBeds)) return;

            PortalModels.RoomTypeInput input = new PortalModels.RoomTypeInput(name, nullable(text(b.etDescription)),
                    price, capacity, beds);
            submit(owner, b.footer, b.tvError,
                    repository.saveRoomType(hotelId, area.areaId, isNew ? null : type.roomTypeId, input), () -> {
                        dialog.dismiss();
                        onSaved.onSaved(ctx.getString(R.string.room_type_saved));
                    });
        });
        dialog.show();
    }

    // ======================= Phòng vật lý =======================

    public static void room(Context ctx, LifecycleOwner owner, int hotelId, HotelArea area, Room room,
                            List<RoomType> types, boolean canManage, OnSaved onSaved) {
        SheetRoomFormBinding b = SheetRoomFormBinding.inflate(LayoutInflater.from(ctx));
        BottomSheetDialog dialog = sheet(ctx, b.getRoot());
        boolean isNew = room == null;
        b.tvTitle.setText(isNew ? R.string.add_room : R.string.edit_room);
        b.tvSubtitle.setText(area.areaName);

        // Chỉ hạng phòng đang hoạt động của khu này (giữ hạng hiện tại nếu đang sửa).
        List<RoomType> options = new ArrayList<>();
        for (RoomType t : types) {
            if (t.areaId == area.areaId && (t.isActive || (!isNew && t.roomTypeId == room.roomTypeId))) options.add(t);
        }
        List<String> names = new ArrayList<>();
        for (RoomType t : options) names.add(t.name);
        b.dropdownType.setAdapter(new ArrayAdapter<>(ctx, android.R.layout.simple_list_item_1, names));
        final Integer[] typeId = {null};
        b.dropdownType.setOnItemClickListener((p, v, pos, id) -> typeId[0] = options.get(pos).roomTypeId);

        String[] statuses = RoomStatusUi.EDITABLE;
        for (String s : statuses) {
            Chip chip = new Chip(ctx);
            chip.setId(View.generateViewId());
            chip.setText(RoomStatusUi.label(s));
            chip.setTag(s);
            chip.setCheckable(true);
            b.chipGroupStatus.addView(chip);
        }
        String initialStatus = isNew ? "Available" : room.status;
        for (int i = 0; i < b.chipGroupStatus.getChildCount(); i++) {
            Chip c = (Chip) b.chipGroupStatus.getChildAt(i);
            if (c.getTag().equals(initialStatus)) c.setChecked(true);
        }
        if (b.chipGroupStatus.getCheckedChipId() == View.NO_ID) ((Chip) b.chipGroupStatus.getChildAt(0)).setChecked(true);

        if (!isNew) {
            b.etNumber.setText(room.roomNumber);
            b.etFloor.setText(String.valueOf(room.floor));
            b.etDescription.setText(room.description);
            for (RoomType t : options) if (t.roomTypeId == room.roomTypeId) { typeId[0] = t.roomTypeId; b.dropdownType.setText(t.name, false); }
        } else if (options.size() == 1) {
            typeId[0] = options.get(0).roomTypeId;
            b.dropdownType.setText(options.get(0).name, false);
        }
        if (options.isEmpty()) showError(b.tvError, ctx.getString(R.string.err_no_room_type));

        // Nút phụ: vô hiệu hóa (DELETE) hoặc kích hoạt lại (PUT với trạng thái Sẵn sàng), như web.
        if (!isNew && canManage) {
            ViewSheetFooterBinding f = b.footer;
            UiUtils.visible(f.btnSecondary, true);
            f.btnSecondary.setText(room.isActive ? R.string.deactivate : R.string.reactivate);
            f.btnSecondary.setTextColor(ctx.getColor(room.isActive ? R.color.md_error : R.color.md_primary));
            f.btnSecondary.setOnClickListener(v -> {
                LiveData<? extends Resource<?>> action = room.isActive
                        ? repository.deactivateRoom(hotelId, room.roomId)
                        : repository.saveRoom(hotelId, area.areaId, room.roomId,
                        new PortalModels.RoomInput(room.roomTypeId, room.roomNumber, room.floor, "Available", room.description));
                submit(owner, f, b.tvError, action, () -> {
                    dialog.dismiss();
                    onSaved.onSaved(ctx.getString(room.isActive ? R.string.room_deactivated : R.string.room_reactivated));
                });
            });
        }

        b.footer.btnSave.setOnClickListener(v -> {
            String number = text(b.etNumber);
            Integer floor = parseInt(text(b.etFloor));
            b.tilNumber.setError(number.isEmpty() ? ctx.getString(R.string.err_required) : null);
            b.tilFloor.setError(floor == null ? ctx.getString(R.string.err_required) : null);
            b.tilType.setError(typeId[0] == null ? ctx.getString(R.string.err_required) : null);
            if (hasError(b.tilNumber, b.tilFloor, b.tilType)) return;
            String status = (String) b.chipGroupStatus.findViewById(b.chipGroupStatus.getCheckedChipId()).getTag();

            PortalModels.RoomInput input = new PortalModels.RoomInput(typeId[0], number, floor, status,
                    nullable(text(b.etDescription)));
            submit(owner, b.footer, b.tvError, repository.saveRoom(hotelId, area.areaId, isNew ? null : room.roomId, input), () -> {
                dialog.dismiss();
                onSaved.onSaved(ctx.getString(R.string.room_saved));
            });
        });
        UiUtils.visible(b.footer.btnSave, canManage);
        dialog.show();
    }

    // ======================= Tiện ích =======================

    private static BottomSheetDialog sheet(Context ctx, View content) {
        BottomSheetDialog dialog = new BottomSheetDialog(ctx);
        dialog.setContentView(content);
        dialog.getBehavior().setState(BottomSheetBehavior.STATE_EXPANDED);
        dialog.getBehavior().setSkipCollapsed(true);
        return dialog;
    }

    @SuppressWarnings("unchecked")
    private static void submit(LifecycleOwner owner, ViewSheetFooterBinding footer, TextView error,
                               LiveData<? extends Resource<?>> call, Runnable onSuccess) {
        LiveData<Resource<Object>> live = (LiveData<Resource<Object>>) (LiveData<?>) call;
        SingleObserver.observe(owner, live, res -> {
            UiUtils.visible(footer.progress, res.isLoading());
            footer.btnSave.setEnabled(!res.isLoading());
            footer.btnSecondary.setEnabled(!res.isLoading());
            if (res.isError()) showError(error, res.message);
            if (res.isSuccess()) onSuccess.run();
        });
    }

    private static void showError(TextView view, String message) {
        UiUtils.visible(view, true);
        view.setText(message);
    }

    private static boolean hasError(TextInputLayout... fields) {
        for (TextInputLayout f : fields) if (f.getError() != null) return true;
        return false;
    }

    private static String text(TextView v) { return String.valueOf(v.getText()).trim(); }
    private static String nullable(String s) { return s.isEmpty() ? null : s; }

    private static Integer parseInt(String s) {
        try { return s.isEmpty() ? null : Integer.parseInt(s); } catch (NumberFormatException e) { return null; }
    }

    private static Long parseLong(String s) {
        try { return s.isEmpty() ? null : Long.parseLong(s); } catch (NumberFormatException e) { return null; }
    }
}
