package com.example.hotelbookingandroid.ui.portal.inventory;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.HotelArea;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.Room;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.RoomType;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.ActivityAreaDetailBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.google.android.material.chip.Chip;
import com.google.android.material.tabs.TabLayout;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Cấp 2: hạng phòng và phòng vật lý của một phân khu (giống 2 phần dưới của trang Inventory web). */
public class AreaDetailActivity extends AppCompatActivity {
    private static final String EXTRA_HOTEL_ID = "hotelId";
    private static final String EXTRA_HOTEL_NAME = "hotelName";
    private static final String EXTRA_AREA = "area";
    private static final int TAB_TYPES = 0, TAB_ROOMS = 1;

    private ActivityAreaDetailBinding binding;
    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<List<RoomType>> typeVm;
    private LoadViewModel<List<Room>> roomVm;
    private BindingAdapter<RoomType, ItemPortalRowBinding> typeAdapter;
    private BindingAdapter<Room, ItemPortalRowBinding> roomAdapter;

    private int hotelId;
    private HotelArea area;
    private boolean canManage;
    private int tab = TAB_TYPES;
    private String query = "";
    private String statusFilter;
    private List<RoomType> types = new ArrayList<>();
    private List<Room> rooms = new ArrayList<>();
    private final Map<Integer, RoomType> typeById = new HashMap<>();

    public static Intent intent(Context ctx, int hotelId, String hotelName, HotelArea area) {
        return new Intent(ctx, AreaDetailActivity.class)
                .putExtra(EXTRA_HOTEL_ID, hotelId)
                .putExtra(EXTRA_HOTEL_NAME, hotelName)
                .putExtra(EXTRA_AREA, area);
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAreaDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        hotelId = getIntent().getIntExtra(EXTRA_HOTEL_ID, 0);
        area = (HotelArea) getIntent().getSerializableExtra(EXTRA_AREA);
        canManage = SessionManager.get().hasAnyPermission(Permissions.ROOM_MANAGE);

        binding.toolbar.setTitle(area.areaName);
        String parent = area.parentAreaName != null ? area.parentAreaName + " · " : "";
        binding.toolbar.setSubtitle(parent + getIntent().getStringExtra(EXTRA_HOTEL_NAME));
        binding.toolbar.setNavigationOnClickListener(v -> finish());

        ViewModelProvider provider = new ViewModelProvider(this);
        typeVm = provider.get("types", LoadViewModel.class);
        roomVm = provider.get("rooms", LoadViewModel.class);
        typeAdapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bindType);
        roomAdapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bindRoom);
        binding.recycler.setLayoutManager(new LinearLayoutManager(this));
        binding.swipeRefresh.setOnRefreshListener(this::reload);

        binding.tabs.addTab(binding.tabs.newTab().setText(R.string.tab_room_types).setIcon(R.drawable.ic_bed));
        binding.tabs.addTab(binding.tabs.newTab().setText(R.string.tab_rooms).setIcon(R.drawable.ic_door));
        binding.tabs.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override public void onTabSelected(TabLayout.Tab t) { tab = t.getPosition(); renderTab(); }
            @Override public void onTabUnselected(TabLayout.Tab t) { }
            @Override public void onTabReselected(TabLayout.Tab t) { }
        });

        for (String s : RoomStatusUi.FILTERS) {
            Chip chip = new Chip(this);
            chip.setId(View.generateViewId());
            chip.setText(RoomStatusUi.label(s));
            chip.setTag(s);
            chip.setCheckable(true);
            chip.setChecked(s == null);
            binding.chipGroupStatus.addView(chip);
        }
        binding.chipGroupStatus.setOnCheckedStateChangeListener((g, ids) -> {
            if (ids.isEmpty()) return;
            statusFilter = (String) g.findViewById(ids.get(0)).getTag();
            render();
        });
        binding.etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { query = s.toString().trim().toLowerCase(Locale.ROOT); render(); }
        });

        binding.fabAdd.setOnClickListener(v -> {
            if (tab == TAB_TYPES) InventoryForms.roomType(this, this, hotelId, area, null, this::onSaved);
            else InventoryForms.room(this, this, hotelId, area, null, types, canManage, this::onSaved);
        });

        typeVm.data().observe(this, this::onTypes);
        roomVm.data().observe(this, this::onRooms);
        if (typeVm.needsInitialLoad()) reload();
        renderTab();
    }

    private void reload() {
        typeVm.load(repository.roomTypes(hotelId));
        roomVm.load(repository.rooms(hotelId));
    }

    private void onSaved(String message) {
        UiUtils.toast(this, message);
        setResult(RESULT_OK); // màn cây phân khu cập nhật lại số lượng
        reload();
    }

    private void onTypes(Resource<List<RoomType>> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(this, res.message);
        if (!res.isSuccess() || res.data == null) return;
        types = res.data;
        typeById.clear();
        for (RoomType t : types) typeById.put(t.roomTypeId, t);
        render();
    }

    private void onRooms(Resource<List<Room>> res) {
        if (res.isError()) UiUtils.toast(this, res.message);
        if (!res.isSuccess() || res.data == null) return;
        rooms = res.data;
        render();
    }

    private void renderTab() {
        boolean roomsTab = tab == TAB_ROOMS;
        binding.recycler.setAdapter(roomsTab ? roomAdapter : typeAdapter);
        UiUtils.visible(binding.scrollStatus, roomsTab);
        binding.tilSearch.setHint(roomsTab ? R.string.search_room_hint : R.string.search_room_type_hint);
        binding.fabAdd.setText(roomsTab ? R.string.add_room : R.string.add_room_type);
        UiUtils.visible(binding.fabAdd, canManage && area.isActive);
        render();
    }

    private void render() {
        if (tab == TAB_TYPES) {
            List<RoomType> list = new ArrayList<>();
            int active = 0;
            for (RoomType t : types) {
                if (t.areaId != area.areaId) continue;
                if (t.isActive) active++;
                if (query.isEmpty() || t.name.toLowerCase(Locale.ROOT).contains(query)) list.add(t);
            }
            typeAdapter.submit(list);
            binding.tvSummary.setText(getString(R.string.room_type_summary, list.size(), active));
            empty(list.isEmpty(), R.string.no_room_types);
        } else {
            List<Room> list = new ArrayList<>();
            for (Room r : rooms) {
                if (r.areaId != area.areaId) continue;
                if (statusFilter != null && !statusFilter.equals(effectiveStatus(r))) continue;
                RoomType t = typeById.get(r.roomTypeId);
                String hay = (r.roomNumber + " " + (t != null ? t.name : "")).toLowerCase(Locale.ROOT);
                if (!query.isEmpty() && !hay.contains(query)) continue;
                list.add(r);
            }
            list.sort((a, b) -> a.floor != b.floor ? Integer.compare(a.floor, b.floor) : a.roomNumber.compareTo(b.roomNumber));
            roomAdapter.submit(list);
            binding.tvSummary.setText(getString(R.string.room_list_summary, list.size()));
            empty(list.isEmpty(), R.string.no_rooms_in_area);
        }
    }

    private void bindType(ItemPortalRowBinding b, RoomType t, int pos) {
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(R.drawable.ic_bed);
        b.tvTitle.setText(t.name);
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(t.isActive ? R.string.active : R.string.inactive);
        PortalStyle.active(b.tvBadge, t.isActive);
        b.tvLine1.setText(getString(R.string.room_type_meta, t.capacity, t.numberOfBeds, countRooms(t.roomTypeId)));
        UiUtils.visible(b.tvLine2, t.description != null && !t.description.isEmpty());
        b.tvLine2.setText(t.description);
        b.tvLine2.setMaxLines(2);
        b.getRoot().setAlpha(t.isActive ? 1f : 0.6f);

        UiUtils.visible(b.layoutFooter, true);
        b.tvValue.setText(getString(R.string.base_price_value, Formatters.vnd(t.basePrice)));
        UiUtils.visible(b.btnAction, canManage);
        b.btnAction.setText(R.string.edit);
        b.btnAction.setOnClickListener(v -> InventoryForms.roomType(this, this, hotelId, area, t, this::onSaved));

        UiUtils.visible(b.switchActive, canManage);
        b.switchActive.setOnCheckedChangeListener(null);
        b.switchActive.setChecked(t.isActive);
        b.switchActive.setOnCheckedChangeListener((sw, checked) -> {
            sw.setEnabled(false);
            SingleObserver.observe(this, repository.setRoomTypeActive(hotelId, t.roomTypeId, checked), res -> {
                if (res.isLoading()) return;
                sw.setEnabled(true);
                if (res.isSuccess() && res.data != null) { t.isActive = res.data.isActive; setResult(RESULT_OK); }
                if (res.isError()) UiUtils.toast(this, res.message);
                render();
            });
        });
    }

    private void bindRoom(ItemPortalRowBinding b, Room r, int pos) {
        UiUtils.visible(b.tvAvatar, true);
        UiUtils.visible(b.ivAvatar, false);
        b.tvAvatar.setText(r.roomNumber);
        b.tvAvatar.setTextSize(r.roomNumber.length() > 3 ? 11 : 14);
        RoomType t = typeById.get(r.roomTypeId);
        b.tvTitle.setText(getString(R.string.room_title, r.roomNumber, r.floor));
        String status = effectiveStatus(r);
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(RoomStatusUi.label(status));
        RoomStatusUi.apply(b.tvBadge, status);
        b.tvLine1.setText(t != null ? getString(R.string.room_type_price, t.name, Formatters.vnd(t.basePrice)) : "");
        UiUtils.visible(b.tvLine2, r.description != null && !r.description.isEmpty());
        b.tvLine2.setText(r.description);
        UiUtils.visible(b.layoutFooter, false);
        UiUtils.visible(b.switchActive, false);
        b.getRoot().setAlpha(r.isActive ? 1f : 0.6f);
        b.getRoot().setOnClickListener(v ->
                InventoryForms.room(this, this, hotelId, area, r, types, canManage, this::onSaved));
    }

    /** Phòng bị vô hiệu hóa luôn hiển thị là "Vô hiệu hóa" dù trạng thái vận hành là gì. */
    private static String effectiveStatus(Room r) {
        return r.isActive ? r.status : "Inactive";
    }

    private int countRooms(int roomTypeId) {
        int n = 0;
        for (Room r : rooms) if (r.roomTypeId == roomTypeId && r.isActive) n++;
        return n;
    }

    private void empty(boolean empty, int text) {
        UiUtils.visible(binding.tvEmpty, empty);
        binding.tvEmpty.setText(text);
    }
}
