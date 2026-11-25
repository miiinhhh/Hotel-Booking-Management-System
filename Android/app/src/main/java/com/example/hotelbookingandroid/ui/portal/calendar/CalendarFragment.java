package com.example.hotelbookingandroid.ui.portal.calendar;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.CalendarDay;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.RoomLock;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.RoomSchedule;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.FragmentCalendarBinding;
import com.example.hotelbookingandroid.databinding.ItemCalendarDayBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.databinding.ItemRoomScheduleBinding;
import com.example.hotelbookingandroid.databinding.ViewKpiCardBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Lịch phòng & khóa bán (tương đương StaffCalendarView của web). */
public class CalendarFragment extends Fragment {
    private FragmentCalendarBinding binding;
    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<List<RoomSchedule>> scheduleVm;
    private LoadViewModel<List<RoomLock>> lockVm;
    private BindingAdapter<RoomSchedule, ItemRoomScheduleBinding> scheduleAdapter;
    private BindingAdapter<RoomLock, ItemPortalRowBinding> lockAdapter;
    private final RecyclerView.RecycledViewPool dayPool = new RecyclerView.RecycledViewPool();

    private List<RoomSchedule> schedules = new ArrayList<>();
    /** Nhãn phân khu -> danh sách hạng phòng; khóa "" = tất cả. */
    private final Map<String, String> areaLabels = new LinkedHashMap<>();
    private String areaFilter = "";
    private int days = 7;
    private boolean lockMode;
    private boolean canManage;
    /** roomId -> số phòng, để hiện "Phòng 402" trong danh sách lệnh khóa. */
    private final Map<Long, String> roomNumbers = new HashMap<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentCalendarBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @SuppressWarnings("unchecked")
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        canManage = SessionManager.get().hasAnyPermission(Permissions.INVENTORY_MANAGE);
        ViewModelProvider provider = new ViewModelProvider(this);
        scheduleVm = provider.get("schedules", LoadViewModel.class);
        lockVm = provider.get("locks", LoadViewModel.class);

        scheduleAdapter = new BindingAdapter<>(ItemRoomScheduleBinding::inflate, this::bindSchedule);
        lockAdapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bindLock);
        binding.recycler.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.recycler.setAdapter(scheduleAdapter);
        binding.swipeRefresh.setOnRefreshListener(this::reload);

        kpi(binding.kpiAvailable, R.drawable.ic_villa, R.string.kpi_available_today);
        kpi(binding.kpiLocked, R.drawable.ic_lock, R.string.kpi_locked_today);
        kpi(binding.kpiOccupancy, R.drawable.ic_dashboard, R.string.kpi_occupancy_today);

        binding.toggleMode.addOnButtonCheckedListener((g, id, checked) -> {
            if (!checked) return;
            lockMode = id == R.id.btnModeLocks;
            renderMode();
        });
        binding.chipGroupDays.setOnCheckedStateChangeListener((g, ids) -> {
            if (ids.isEmpty()) return;
            int id = ids.get(0);
            days = id == R.id.chipDays14 ? 14 : id == R.id.chipDays30 ? 30 : 7;
            scheduleVm.load(repository.calendar(days));
        });
        binding.dropdownArea.setOnItemClickListener((p, v, position, id) -> {
            areaFilter = new ArrayList<>(areaLabels.keySet()).get(position);
            renderSchedules();
        });

        UiUtils.visible(binding.fabLock, canManage);
        binding.fabLock.setOnClickListener(v -> pickCategoryAndLock());

        scheduleVm.data().observe(getViewLifecycleOwner(), this::onSchedules);
        lockVm.data().observe(getViewLifecycleOwner(), this::onLocks);
        if (scheduleVm.needsInitialLoad()) scheduleVm.load(repository.calendar(days));
        renderMode();
    }

    // ===================== Tải dữ liệu =====================

    private void reload() {
        if (lockMode) loadLocks(); else scheduleVm.load(repository.calendar(days));
    }

    private void onSchedules(Resource<List<RoomSchedule>> res) {
        if (!lockMode) binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess()) return;
        schedules = res.data != null ? res.data : new ArrayList<>();
        buildAreaFilter();
        renderSchedules();
        if (lockMode) loadLocks();
    }

    private void loadLocks() {
        Set<Integer> hotels = hotelIds();
        lockVm.load(repository.locks(hotels));
        for (int hotelId : hotels) loadRoomNumbers(hotelId);
    }

    private void loadRoomNumbers(int hotelId) {
        SingleObserver.observe(getViewLifecycleOwner(), repository.rooms(hotelId), res -> {
            if (!res.isSuccess() || res.data == null) return;
            for (PortalModels.Room r : res.data) roomNumbers.put(r.roomId, r.roomNumber);
            if (lockMode) lockAdapter.notifyDataSetChanged();
        });
    }

    private void onLocks(Resource<List<RoomLock>> res) {
        if (lockMode) binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess() || res.data == null) return;
        Set<Long> allowed = allowedRoomIds(schedules);
        List<RoomLock> list = new ArrayList<>();
        for (RoomLock l : res.data) if (allowed.isEmpty() || allowed.contains(l.roomId)) list.add(l);
        // Lệnh còn hiệu lực lên trước, sau đó mới nhất trước.
        list.sort((a, b) -> {
            if (a.isReleasable() != b.isReleasable()) return a.isReleasable() ? -1 : 1;
            return String.valueOf(b.startsAt).compareTo(String.valueOf(a.startsAt));
        });
        lockAdapter.submit(list);
        int active = 0;
        for (RoomLock l : list) if (l.isReleasable()) active++;
        if (lockMode) {
            binding.tvSummary.setText(getString(R.string.lock_summary, list.size(), active));
            showEmpty(list.isEmpty(), R.string.no_locks);
        }
    }

    // ===================== Hiển thị =====================

    private void renderMode() {
        UiUtils.visible(binding.layoutCalendarFilters, !lockMode);
        binding.recycler.setAdapter(lockMode ? lockAdapter : scheduleAdapter);
        if (lockMode) {
            loadLocks();
            binding.tvSummary.setText("");
            showEmpty(false, R.string.no_locks);
        } else {
            renderSchedules();
        }
    }

    private void buildAreaFilter() {
        areaLabels.clear();
        areaLabels.put("", getString(R.string.all_areas));
        for (RoomSchedule s : schedules) {
            String key = s.building != null ? s.building : "";
            if (!key.isEmpty()) areaLabels.put(key, key);
        }
        if (!areaLabels.containsKey(areaFilter)) areaFilter = "";
        binding.dropdownArea.setAdapter(new ArrayAdapter<>(requireContext(),
                android.R.layout.simple_list_item_1, new ArrayList<>(areaLabels.values())));
        binding.dropdownArea.setText(areaLabels.get(areaFilter), false);
        UiUtils.visible(binding.tilArea, areaLabels.size() > 2);
    }

    private List<RoomSchedule> filteredSchedules() {
        if (areaFilter.isEmpty()) return schedules;
        List<RoomSchedule> list = new ArrayList<>();
        for (RoomSchedule s : schedules) if (areaFilter.equals(s.building)) list.add(s);
        return list;
    }

    private void renderSchedules() {
        if (lockMode) return;
        List<RoomSchedule> list = filteredSchedules();
        scheduleAdapter.submit(list);

        // Chỉ số hôm nay = ô đầu tiên của mỗi hạng phòng (giống web).
        int available = 0, locked = 0, total = 0, occupied = 0;
        for (RoomSchedule s : list) {
            if (s.days == null || s.days.isEmpty()) continue;
            CalendarDay today = s.days.get(0);
            available += today.availableCount;
            locked += today.lockedCount;
            total += today.totalCount;
            occupied += Math.round(today.totalCount * today.occupancyPercent / 100f);
        }
        binding.kpiAvailable.tvValue.setText(String.valueOf(available));
        binding.kpiLocked.tvValue.setText(String.valueOf(locked));
        binding.kpiOccupancy.tvValue.setText(total > 0 ? Math.round(occupied * 100f / total) + "%" : "–");
        binding.tvSummary.setText(getString(R.string.schedule_summary, list.size(), total));
        showEmpty(list.isEmpty(), R.string.no_schedules);
    }

    private void bindSchedule(ItemRoomScheduleBinding h, RoomSchedule s, int pos) {
        h.tvBuilding.setText(s.building);
        UiUtils.visible(h.tvBuilding, s.building != null && !s.building.isEmpty());
        h.tvName.setText(s.name);
        h.tvSpecs.setText(s.roomSpecs);
        UiUtils.visible(h.tvSpecs, s.roomSpecs != null && !s.roomSpecs.isEmpty());
        h.tvTotalRooms.setText(String.valueOf(s.totalRooms));

        if (h.rvDays.getLayoutManager() == null) {
            h.rvDays.setLayoutManager(new LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false));
            h.rvDays.setRecycledViewPool(dayPool);
            h.rvDays.setNestedScrollingEnabled(false);
        }
        BindingAdapter<CalendarDay, ItemCalendarDayBinding> dayAdapter =
                new BindingAdapter<>(ItemCalendarDayBinding::inflate, (b, d, i) -> bindDay(b, d, s));
        dayAdapter.submit(s.days);
        h.rvDays.setAdapter(dayAdapter);
    }

    private void bindDay(ItemCalendarDayBinding b, CalendarDay d, RoomSchedule s) {
        b.tvDow.setText(d.isToday ? getString(R.string.today) : d.dayOfWeek);
        b.tvDate.setText(d.dateFormatted != null ? d.dateFormatted : DateUtils.display(d.date));
        b.tvAvailable.setText(getString(R.string.available_of, d.availableCount, d.totalCount));
        UiUtils.visible(b.ivLock, d.isEmergencyLocked || d.lockedCount > 0);
        b.progress.setProgressCompat(d.occupancyPercent, false);
        DayStyle.apply(b, d);
        b.getRoot().setOnClickListener(v -> showDay(s, d));
    }

    private void showDay(RoomSchedule s, CalendarDay d) {
        StringBuilder msg = new StringBuilder();
        msg.append(getString(R.string.day_detail, d.availableCount, d.totalCount, d.occupancyPercent));
        if (d.lockedCount > 0) msg.append('\n').append(getString(R.string.day_locked_count, d.lockedCount));
        if (d.lockedRoomNumber != null && !d.lockedRoomNumber.isEmpty())
            msg.append('\n').append(getString(R.string.day_locked_room, d.lockedRoomNumber));
        if (d.lockedReason != null && !d.lockedReason.isEmpty())
            msg.append('\n').append(getString(R.string.day_locked_reason, d.lockedReason));
        if (d.statusNote != null && !d.statusNote.isEmpty()) msg.append("\n\n").append(d.statusNote);

        MaterialAlertDialogBuilder dialog = new MaterialAlertDialogBuilder(requireContext())
                .setTitle(s.name + " · " + (d.dateFormatted != null ? d.dateFormatted : DateUtils.display(d.date)))
                .setMessage(msg)
                .setNegativeButton(R.string.close, null);
        if (canManage) {
            dialog.setPositiveButton(R.string.lock_from_this_day, (x, w) -> openLock(s, d.date));
        }
        dialog.show();
    }

    private void bindLock(ItemPortalRowBinding b, RoomLock l, int pos) {
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(l.isReleasable() ? R.drawable.ic_lock : R.drawable.ic_lock_open);
        String number = roomNumbers.get(l.roomId);
        b.tvTitle.setText(number != null ? getString(R.string.room_value, number) : getString(R.string.room_id_value, l.roomId));
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(lockStatusLabel(l.status));
        LockStyle.apply(b.tvBadge, l.status);
        b.tvLine1.setText(getString(R.string.lock_range, DateUtils.displayDateTime(l.startsAt), DateUtils.displayDateTime(l.endsAt)));
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(l.reason);
        b.getRoot().setAlpha(l.isReleasable() ? 1f : 0.6f);

        boolean canRelease = canManage && l.isReleasable();
        UiUtils.visible(b.layoutFooter, canRelease);
        UiUtils.visible(b.btnAction, canRelease);
        b.tvValue.setText("");
        b.btnAction.setText(R.string.release_lock);
        b.btnAction.setOnClickListener(v -> confirmRelease(l));
    }

    private int lockStatusLabel(String status) {
        if ("Active".equals(status)) return R.string.lock_active;
        if ("Scheduled".equals(status)) return R.string.lock_scheduled;
        if ("Released".equals(status)) return R.string.lock_released;
        return R.string.lock_expired;
    }

    // ===================== Khóa / gỡ khóa =====================

    /** FAB: chọn hạng phòng trước, rồi mở form khóa cho đúng khách sạn & phòng của hạng đó. */
    private void pickCategoryAndLock() {
        List<RoomSchedule> list = filteredSchedules();
        if (list.isEmpty()) { UiUtils.toast(requireContext(), getString(R.string.no_schedules)); return; }
        if (list.size() == 1) { openLock(list.get(0), null); return; }
        String[] names = new String[list.size()];
        for (int i = 0; i < list.size(); i++)
            names[i] = list.get(i).building != null ? list.get(i).building + " · " + list.get(i).name : list.get(i).name;
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.choose_room_type)
                .setItems(names, (d, which) -> openLock(list.get(which), null))
                .show();
    }

    private void openLock(RoomSchedule s, String date) {
        String category = s.building != null ? s.building + " · " + s.name : s.name;
        RoomLockSheet.show(this, s.hotelId, category, s.roomIds != null ? s.roomIds : new ArrayList<>(), date, count -> {
            UiUtils.toast(requireContext(), getString(R.string.lock_success, count));
            scheduleVm.load(repository.calendar(days));
            if (lockMode) loadLocks();
        });
    }

    private void confirmRelease(RoomLock l) {
        String number = roomNumbers.containsKey(l.roomId) ? roomNumbers.get(l.roomId) : String.valueOf(l.roomId);
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.release_lock)
                .setMessage(getString(R.string.confirm_release, number))
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.release_lock, (d, w) ->
                        SingleObserver.observe(getViewLifecycleOwner(), repository.release(l.hotelId, l.lockId), res -> {
                            if (res.isError()) UiUtils.toast(requireContext(), res.message);
                            if (res.isSuccess()) {
                                UiUtils.toast(requireContext(), getString(R.string.release_success));
                                loadLocks();
                                scheduleVm.load(repository.calendar(days));
                            }
                        }))
                .show();
    }

    // ===================== Tiện ích =====================

    private Set<Integer> hotelIds() {
        Set<Integer> ids = new LinkedHashSet<>();
        for (RoomSchedule s : schedules) ids.add(s.hotelId);
        return ids;
    }

    private static Set<Long> allowedRoomIds(List<RoomSchedule> list) {
        Set<Long> ids = new java.util.HashSet<>();
        for (RoomSchedule s : list) if (s.roomIds != null) ids.addAll(s.roomIds);
        return ids;
    }

    private void kpi(ViewKpiCardBinding k, int icon, int label) {
        k.ivIcon.setImageResource(icon);
        k.tvLabel.setText(label);
        k.tvValue.setText("–");
    }

    private void showEmpty(boolean empty, int text) {
        UiUtils.visible(binding.tvEmpty, empty);
        binding.tvEmpty.setText(text);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
