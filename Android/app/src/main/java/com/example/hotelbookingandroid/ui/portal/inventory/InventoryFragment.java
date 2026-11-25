package com.example.hotelbookingandroid.ui.portal.inventory;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.PopupMenu;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.HotelArea;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.FragmentInventoryBinding;
import com.example.hotelbookingandroid.databinding.ItemBuildingRowBinding;
import com.example.hotelbookingandroid.databinding.ItemZoneBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

/** Phân khu & hạng phòng — cấp 1: cây Zone → Building của một khách sạn (giống phần "Zone & Building" của web). */
public class InventoryFragment extends Fragment {
    private static final int MENU_OPEN = 1, MENU_EDIT = 2, MENU_TOGGLE = 3;

    /** Một nhóm hiển thị: Zone (null = Building chưa thuộc Zone nào) và các Building con. */
    static class ZoneGroup {
        final HotelArea zone;
        final List<HotelArea> buildings = new ArrayList<>();
        ZoneGroup(HotelArea zone) { this.zone = zone; }
    }

    private FragmentInventoryBinding binding;
    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<List<HotelArea>> viewModel;
    private BindingAdapter<ZoneGroup, ItemZoneBinding> adapter;
    private final List<PortalModels.HotelSummary> hotels = new ArrayList<>();
    private List<HotelArea> areas = new ArrayList<>();
    private int hotelId;
    private String hotelName = "";
    private boolean showInactive;
    private boolean canManageAreas;

    private final ActivityResultLauncher<Intent> detailLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), r -> {
                if (r.getResultCode() == Activity.RESULT_OK) reload(); // số hạng phòng / phòng đã đổi
            });

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentInventoryBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @SuppressWarnings("unchecked")
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        canManageAreas = SessionManager.get().hasAnyPermission(Permissions.AREA_MANAGE);
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        adapter = new BindingAdapter<>(ItemZoneBinding::inflate, this::bindZone);
        binding.recycler.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.recycler.setAdapter(adapter);
        binding.swipeRefresh.setOnRefreshListener(this::reload);

        binding.dropdownHotel.setOnItemClickListener((p, v, pos, id) -> {
            hotelId = hotels.get(pos).hotelId;
            hotelName = hotels.get(pos).hotelName;
            reload();
        });
        binding.chipGroupFilter.setOnCheckedStateChangeListener((g, ids) -> {
            showInactive = !ids.isEmpty() && ids.get(0) == R.id.chipAllAreas;
            render();
        });
        UiUtils.visible(binding.fabAddZone, canManageAreas);
        binding.fabAddZone.setOnClickListener(v -> openAreaForm(null, PortalModels.AREA_ZONE, null));

        viewModel.data().observe(getViewLifecycleOwner(), this::onAreas);
        loadHotels();
    }

    private void loadHotels() {
        SingleObserver.observe(getViewLifecycleOwner(), repository.hotels(), res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (!res.isSuccess() || res.data == null || res.data.items == null) return;
            hotels.clear();
            hotels.addAll(res.data.items);
            List<String> names = new ArrayList<>();
            for (PortalModels.HotelSummary h : hotels) names.add(h.hotelName);
            binding.dropdownHotel.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, names));
            // Một khách sạn thì không cần chọn.
            UiUtils.visible(binding.tilHotel, hotels.size() > 1);
            if (!hotels.isEmpty() && hotelId == 0) {
                hotelId = hotels.get(0).hotelId;
                hotelName = hotels.get(0).hotelName;
                binding.dropdownHotel.setText(hotelName, false);
                if (viewModel.needsInitialLoad()) reload();
            }
        });
    }

    private void reload() {
        if (hotelId == 0) { binding.swipeRefresh.setRefreshing(false); return; }
        viewModel.load(repository.areas(hotelId));
    }

    private void onAreas(Resource<List<HotelArea>> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess()) return;
        areas = res.data != null ? res.data : new ArrayList<>();
        render();
    }

    /** Dựng cây: Zone -> Building; Building có Zone cha bị lọc/thiếu thì gom vào nhóm "Chưa thuộc Zone". */
    private void render() {
        List<ZoneGroup> groups = new ArrayList<>();
        ZoneGroup orphan = new ZoneGroup(null);
        int zones = 0, buildings = 0, roomTypes = 0, rooms = 0;
        for (HotelArea a : areas) {
            if (!a.isZone() || (!showInactive && !a.isActive)) continue;
            groups.add(new ZoneGroup(a));
            zones++;
        }
        for (HotelArea a : areas) {
            if (a.isZone() || (!showInactive && !a.isActive)) continue;
            ZoneGroup target = orphan;
            for (ZoneGroup g : groups) if (a.parentAreaId != null && g.zone.areaId == a.parentAreaId) target = g;
            target.buildings.add(a);
            buildings++;
            roomTypes += a.roomTypeCount;
            rooms += a.roomCount;
        }
        if (!orphan.buildings.isEmpty()) groups.add(orphan);
        adapter.submit(groups);
        binding.tvSummary.setText(getString(R.string.inventory_summary, zones, buildings, roomTypes, rooms));
        UiUtils.visible(binding.tvEmpty, groups.isEmpty());
    }

    private void bindZone(ItemZoneBinding h, ZoneGroup g, int pos) {
        HotelArea z = g.zone;
        if (z == null) {
            h.tvName.setText(R.string.no_parent_zone);
            UiUtils.visible(h.tvStatus, false);
            UiUtils.visible(h.btnMenu, false);
            UiUtils.visible(h.btnAddBuilding, false);
            h.tvMeta.setText(R.string.no_parent_zone_hint);
        } else {
            h.tvName.setText(z.areaName);
            UiUtils.visible(h.tvStatus, true);
            h.tvStatus.setText(z.isActive ? R.string.active : R.string.inactive);
            PortalStyle.active(h.tvStatus, z.isActive);
            h.tvMeta.setText(meta(z));
            UiUtils.visible(h.btnMenu, true);
            h.btnMenu.setOnClickListener(v -> showMenu(v, z));
            UiUtils.visible(h.btnAddBuilding, canManageAreas && z.isActive);
            h.btnAddBuilding.setOnClickListener(v -> openAreaForm(null, PortalModels.AREA_BUILDING, z.areaId));
        }
        h.getRoot().setAlpha(z == null || z.isActive ? 1f : 0.6f);

        h.layoutBuildings.removeAllViews();
        for (HotelArea b : g.buildings) {
            ItemBuildingRowBinding row = ItemBuildingRowBinding.inflate(getLayoutInflater(), h.layoutBuildings, false);
            row.tvName.setText(b.areaName);
            row.tvMeta.setText(getString(R.string.building_meta, b.roomTypeCount, b.roomCount)
                    + (b.floorCount != null ? " · " + getString(R.string.floors_value, b.floorCount) : ""));
            UiUtils.visible(row.tvStatus, !b.isActive);
            row.tvStatus.setText(R.string.inactive);
            PortalStyle.active(row.tvStatus, false);
            row.getRoot().setAlpha(b.isActive ? 1f : 0.6f);
            row.getRoot().setOnClickListener(v -> openDetail(b));
            row.btnMenu.setOnClickListener(v -> showMenu(v, b));
            h.layoutBuildings.addView(row.getRoot());
        }
        UiUtils.visible(h.tvNoBuildings, g.buildings.isEmpty());
    }

    private String meta(HotelArea a) {
        List<String> parts = new ArrayList<>();
        if (a.locationDescription != null && !a.locationDescription.isEmpty()) parts.add(a.locationDescription);
        parts.add(getString(R.string.zone_meta, a.childAreaCount, a.assignedStaffCount));
        return String.join(" · ", parts);
    }

    private void showMenu(View anchor, HotelArea a) {
        PopupMenu menu = new PopupMenu(requireContext(), anchor);
        Menu m = menu.getMenu();
        m.add(Menu.NONE, MENU_OPEN, 0, R.string.open_room_types);
        if (canManageAreas) {
            m.add(Menu.NONE, MENU_EDIT, 1, R.string.edit_area);
            m.add(Menu.NONE, MENU_TOGGLE, 2, a.isActive ? R.string.deactivate : R.string.reactivate);
        }
        menu.setOnMenuItemClickListener(item -> {
            if (item.getItemId() == MENU_OPEN) openDetail(a);
            else if (item.getItemId() == MENU_EDIT) openAreaForm(a, a.areaType, a.parentAreaId);
            else if (item.getItemId() == MENU_TOGGLE) toggleArea(a);
            return true;
        });
        menu.show();
    }

    private void openDetail(HotelArea a) {
        detailLauncher.launch(AreaDetailActivity.intent(requireContext(), hotelId, hotelName, a));
    }

    private void openAreaForm(HotelArea area, String type, Integer parentId) {
        List<HotelArea> zones = new ArrayList<>();
        for (HotelArea a : areas) if (a.isZone()) zones.add(a);
        if (PortalModels.AREA_BUILDING.equals(type) && area == null && zones.isEmpty()) {
            UiUtils.toast(requireContext(), getString(R.string.err_need_zone));
            return;
        }
        InventoryForms.area(requireContext(), getViewLifecycleOwner(), hotelId, area, type, parentId, zones, message -> {
            UiUtils.toast(requireContext(), message);
            reload();
        });
    }

    private void toggleArea(HotelArea a) {
        if (!a.isActive) { runToggle(a); return; }
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.deactivate)
                .setMessage(getString(R.string.confirm_deactivate_area, a.areaName))
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.deactivate, (d, w) -> runToggle(a))
                .show();
    }

    @SuppressWarnings("unchecked")
    private void runToggle(HotelArea a) {
        // Vô hiệu hóa = DELETE (soft); kích hoạt lại = PUT giữ nguyên thông tin, isActive = true (như web).
        androidx.lifecycle.LiveData<Resource<Object>> call = (androidx.lifecycle.LiveData<Resource<Object>>) (androidx.lifecycle.LiveData<?>)
                (a.isActive ? repository.deactivateArea(hotelId, a.areaId)
                        : repository.saveArea(hotelId, a.areaId, PortalModels.AreaInput.of(a, true)));
        SingleObserver.observe(getViewLifecycleOwner(), call, res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess()) {
                UiUtils.toast(requireContext(), getString(a.isActive ? R.string.area_deactivated : R.string.area_reactivated));
                reload();
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
