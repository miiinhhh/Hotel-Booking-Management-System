package com.example.hotelbookingandroid.ui.portal.admin;

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

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.PriceHistory;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.RoomType;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.FragmentPricingBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Giá phòng (tương đương AdminPricing của web): giá đang áp dụng, lịch sử RoomPriceHistory,
 * đặt khoảng giá mới và (tùy chọn) cập nhật giá gốc RoomTypes.BasePrice.
 */
public class PricingFragment extends Fragment {
    /** Trạng thái một khoảng giá so với hiện tại. */
    enum Period { ACTIVE, UPCOMING, ENDED }

    private FragmentPricingBinding binding;
    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<List<RoomType>> typeVm;
    private LoadViewModel<List<PriceHistory>> historyVm;
    private BindingAdapter<PriceHistory, ItemPortalRowBinding> historyAdapter;

    private final List<PortalModels.HotelSummary> hotels = new ArrayList<>();
    private final List<RoomType> types = new ArrayList<>();
    private int hotelId;
    private RoomType selected;
    private PriceHistory current;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentPricingBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @SuppressWarnings("unchecked")
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        ViewModelProvider provider = new ViewModelProvider(this);
        typeVm = provider.get("types", LoadViewModel.class);
        historyVm = provider.get("history", LoadViewModel.class);

        historyAdapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bindHistory);
        binding.rvHistory.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvHistory.setAdapter(historyAdapter);
        binding.swipeRefresh.setOnRefreshListener(this::reloadAll);

        binding.dropdownHotel.setOnItemClickListener((p, v, pos, id) -> {
            hotelId = hotels.get(pos).hotelId;
            selected = null;
            typeVm.load(repository.roomTypes(hotelId));
        });
        binding.dropdownRoomType.setOnItemClickListener((p, v, pos, id) -> select(types.get(pos)));

        boolean canManage = SessionManager.get().hasAnyPermission(Permissions.PRICING_MANAGE);
        binding.fabNewPrice.setOnClickListener(v -> openForm());
        UiUtils.visible(binding.fabNewPrice, false);
        binding.fabNewPrice.setTag(canManage);

        typeVm.data().observe(getViewLifecycleOwner(), this::onTypes);
        historyVm.data().observe(getViewLifecycleOwner(), this::onHistory);
        UiUtils.visible(binding.content, false);
        loadHotels();
    }

    // ===================== Tải dữ liệu =====================

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
            UiUtils.visible(binding.tilHotel, hotels.size() > 1);
            if (!hotels.isEmpty() && hotelId == 0) {
                hotelId = hotels.get(0).hotelId;
                binding.dropdownHotel.setText(names.get(0), false);
                typeVm.load(repository.roomTypes(hotelId));
            }
        });
    }

    private void reloadAll() {
        if (hotelId == 0) { binding.swipeRefresh.setRefreshing(false); return; }
        typeVm.load(repository.roomTypes(hotelId));
    }

    private void onTypes(Resource<List<RoomType>> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess() || res.data == null) return;
        types.clear();
        types.addAll(res.data);
        List<String> names = new ArrayList<>();
        for (RoomType t : types) names.add(getString(R.string.room_type_option, t.name, Formatters.vnd(t.basePrice)));
        binding.dropdownRoomType.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, names));

        UiUtils.visible(binding.tvEmpty, types.isEmpty());
        if (types.isEmpty()) {
            UiUtils.visible(binding.content, false);
            UiUtils.visible(binding.fabNewPrice, false);
            binding.dropdownRoomType.setText("", false);
            return;
        }
        // Giữ hạng đang chọn sau khi tải lại (vd. vừa đổi giá gốc).
        RoomType keep = types.get(0);
        if (selected != null) for (RoomType t : types) if (t.roomTypeId == selected.roomTypeId) keep = t;
        select(keep);
    }

    private void select(RoomType t) {
        selected = t;
        binding.dropdownRoomType.setText(getString(R.string.room_type_option, t.name, Formatters.vnd(t.basePrice)), false);
        UiUtils.visible(binding.content, true);
        UiUtils.visible(binding.fabNewPrice, Boolean.TRUE.equals(binding.fabNewPrice.getTag()));
        historyVm.load(repository.priceHistories(hotelId, t.roomTypeId));
    }

    private void onHistory(Resource<List<PriceHistory>> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess() || selected == null) return;
        List<PriceHistory> list = res.data != null ? new ArrayList<>(res.data) : new ArrayList<>();
        // Mới nhất lên trước.
        list.sort((a, b) -> Long.compare(DateUtils.parseIso(b.effectiveFrom), DateUtils.parseIso(a.effectiveFrom)));
        current = findCurrent(list);
        renderSummary(list.size());
        renderChart(list);
        historyAdapter.submit(list);
        binding.tvHistoryTitle.setText(getString(R.string.price_history_title, list.size()));
        UiUtils.visible(binding.tvNoHistory, list.isEmpty());
    }

    // ===================== Hiển thị =====================

    /** Khoảng giá đang hiệu lực; nếu chồng lấn, lấy bản tạo sau cùng. */
    private static PriceHistory findCurrent(List<PriceHistory> list) {
        PriceHistory best = null;
        for (PriceHistory h : list) {
            if (period(h) != Period.ACTIVE) continue;
            if (best == null || DateUtils.parseIso(h.createdAt) > DateUtils.parseIso(best.createdAt)) best = h;
        }
        return best;
    }

    static Period period(PriceHistory h) {
        long now = System.currentTimeMillis();
        long from = DateUtils.parseIso(h.effectiveFrom);
        long to = h.effectiveTo != null ? DateUtils.parseIso(h.effectiveTo) : Long.MAX_VALUE;
        if (from > now) return Period.UPCOMING;
        if (to <= now) return Period.ENDED;
        return Period.ACTIVE;
    }

    private void renderSummary(int historyCount) {
        RoomType t = selected;
        double price = current != null ? current.price : t.basePrice;
        binding.tvCurrentPrice.setText(Formatters.vnd(price));
        binding.tvSource.setText(current != null ? R.string.source_schedule : R.string.source_base);
        binding.tvCurrentRange.setText(current != null
                ? getString(R.string.price_range, DateUtils.display(current.effectiveFrom), endText(current))
                : getString(R.string.no_active_schedule));
        binding.tvBasePrice.setText(Formatters.vnd(t.basePrice));
        binding.tvDiff.setText(diff(price, t.basePrice));
        binding.tvSpec.setText(getString(R.string.room_spec_value, t.capacity, t.numberOfBeds));
    }

    private void renderChart(List<PriceHistory> newestFirst) {
        List<Double> values = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        // Biểu đồ đọc từ trái (cũ) sang phải (mới), tối đa 12 khoảng gần nhất.
        int n = Math.min(12, newestFirst.size());
        for (int i = n - 1; i >= 0; i--) {
            PriceHistory h = newestFirst.get(i);
            values.add(h.price);
            String d = DateUtils.display(h.effectiveFrom);
            labels.add(d.length() >= 5 ? d.substring(0, 5) : d);
        }
        binding.chart.setData(values, labels);
        binding.tvChartNote.setText(n == 0 ? getString(R.string.no_price_history)
                : getString(R.string.price_chart_note, n));
    }

    private void bindHistory(ItemPortalRowBinding b, PriceHistory h, int pos) {
        Period p = period(h);
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(R.drawable.ic_offer);
        b.tvTitle.setText(Formatters.vnd(h.price));
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(p == Period.ACTIVE ? (h == current ? R.string.period_applying : R.string.period_overlapped)
                : p == Period.UPCOMING ? R.string.period_upcoming : R.string.period_ended);
        PeriodStyle.apply(b.tvBadge, p, h == current);
        b.tvLine1.setText(getString(R.string.price_range, DateUtils.display(h.effectiveFrom), endText(h)));
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(getString(R.string.price_meta, diff(h.price, selected.basePrice), DateUtils.display(h.createdAt)));
        UiUtils.visible(b.layoutFooter, false);
        UiUtils.visible(b.switchActive, false);
        b.getRoot().setAlpha(p == Period.ENDED ? 0.6f : 1f);
    }

    private String endText(PriceHistory h) {
        return h.effectiveTo != null ? DateUtils.display(h.effectiveTo) : getString(R.string.no_end);
    }

    /** "+12,5%" / "-10%" / "bằng giá gốc" */
    private String diff(double price, double base) {
        if (base <= 0 || Math.abs(price - base) < 0.5) return getString(R.string.equal_base);
        double pct = (price - base) * 100 / base;
        return String.format(Locale.US, pct % 1 == 0 ? "%+.0f%%" : "%+.1f%%", pct);
    }

    // ===================== Đặt giá mới =====================

    private void openForm() {
        if (selected == null) return;
        boolean canUpdateBase = SessionManager.get().hasAnyPermission(Permissions.ROOM_MANAGE);
        double suggested = current != null ? current.price : selected.basePrice;
        PriceFormSheet.show(this, hotelId, selected, suggested, canUpdateBase, message -> {
            UiUtils.toast(requireContext(), message);
            reloadAll(); // giá gốc có thể đã đổi -> tải lại cả hạng phòng
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
