package com.example.hotelbookingandroid.ui.portal.bookings;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.FragmentPortalBookingsBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalBookingBinding;
import com.example.hotelbookingandroid.databinding.ViewKpiCardBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.StatusStyle;
import com.google.android.material.chip.Chip;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Quản lý đặt phòng (Staff: theo phân khu được giao; Admin: toàn hệ thống). */
public class PortalBookingsFragment extends Fragment {
    /** Bộ lọc trạng thái: null = tất cả. */
    private static final String[] STATUS_FILTERS = {null, "Pending", "Confirmed", "CheckedIn", "CheckedOut", "Completed", "Cancelled"};
    private static final int[] STATUS_LABELS = {R.string.status_all, R.string.status_pending, R.string.status_confirmed,
            R.string.status_checked_in, R.string.status_checked_out, R.string.status_completed, R.string.status_cancelled};

    private FragmentPortalBookingsBinding binding;
    private LoadViewModel<PortalModels.StaffDashboard> viewModel;
    private final PortalRepository repository = new PortalRepository();
    private BindingAdapter<PortalModels.PortalBooking, ItemPortalBookingBinding> adapter;
    private List<PortalModels.PortalBooking> all = new ArrayList<>();
    private String statusFilter;
    private String query = "";

    private final ActivityResultLauncher<android.content.Intent> detailLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), r -> {
                if (r.getResultCode() == android.app.Activity.RESULT_OK) reload();
            });

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentPortalBookingsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @SuppressWarnings("unchecked")
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);

        adapter = new BindingAdapter<>(ItemPortalBookingBinding::inflate, this::bindItem);
        binding.recycler.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.recycler.setAdapter(adapter);
        binding.swipeRefresh.setOnRefreshListener(this::reload);

        setupKpi(binding.kpiToday, R.drawable.ic_booking, R.string.kpi_today);
        setupKpi(binding.kpiPending, R.drawable.ic_offer, R.string.kpi_pending_deposit);
        setupKpi(binding.kpiCheckIn, R.drawable.ic_check, R.string.kpi_check_in);
        setupKpi(binding.kpiCheckOut, R.drawable.ic_logout, R.string.kpi_check_out);

        for (int i = 0; i < STATUS_FILTERS.length; i++) {
            Chip chip = new Chip(requireContext());
            chip.setId(View.generateViewId());
            chip.setText(STATUS_LABELS[i]);
            chip.setCheckable(true);
            chip.setTag(STATUS_FILTERS[i]);
            chip.setChecked(i == 0);
            binding.chipGroupStatus.addView(chip);
        }
        binding.chipGroupStatus.setOnCheckedStateChangeListener((g, ids) -> {
            if (ids.isEmpty()) return;
            statusFilter = (String) g.findViewById(ids.get(0)).getTag();
            applyFilter();
        });
        binding.etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { query = s.toString().trim().toLowerCase(Locale.ROOT); applyFilter(); }
        });

        viewModel.data().observe(getViewLifecycleOwner(), this::render);
        if (viewModel.needsInitialLoad()) reload();
    }

    private void reload() {
        viewModel.load(repository.dashboard());
    }

    private void render(Resource<PortalModels.StaffDashboard> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess() || res.data == null) return;
        all = res.data.bookings != null ? res.data.bookings : new ArrayList<>();
        PortalModels.StaffMetrics m = res.data.metrics;
        if (m != null) {
            binding.kpiToday.tvValue.setText(String.valueOf(m.totalToday));
            binding.kpiPending.tvValue.setText(String.valueOf(m.pendingDepositCount));
            binding.kpiCheckIn.tvValue.setText(m.checkInCompletedCount + "/" + m.checkInTodayCount);
            note(binding.kpiCheckIn, getString(R.string.kpi_remaining, m.checkInRemainingCount));
            binding.kpiCheckOut.tvValue.setText(m.checkOutCompletedCount + "/" + m.checkOutTodayCount);
            note(binding.kpiCheckOut, getString(R.string.kpi_remaining, m.checkOutPendingKeyCount));
        }
        applyFilter();
    }

    private void applyFilter() {
        List<PortalModels.PortalBooking> filtered = new ArrayList<>();
        for (PortalModels.PortalBooking b : all) {
            if (statusFilter != null && !statusFilter.equals(b.bookingStatus)) continue;
            if (!query.isEmpty() && !matches(b)) continue;
            filtered.add(b);
        }
        adapter.submit(filtered);
        binding.tvCount.setText(getString(R.string.booking_count, filtered.size()));
        UiUtils.visible(binding.tvEmpty, filtered.isEmpty() && !binding.swipeRefresh.isRefreshing());
    }

    private boolean matches(PortalModels.PortalBooking b) {
        String haystack = (b.bookingCode + " " + b.customerName + " " + b.customerPhone + " "
                + (b.roomNumbers != null ? String.join(" ", b.roomNumbers) : "")).toLowerCase(Locale.ROOT);
        return haystack.contains(query);
    }

    private void bindItem(ItemPortalBookingBinding h, PortalModels.PortalBooking b, int position) {
        h.tvInitials.setText(Formatters.initials(b.customerName, "KH"));
        h.tvCustomer.setText(b.customerName);
        h.tvCode.setText(getString(R.string.booking_code_value, b.bookingCode));
        h.tvStatus.setText(Formatters.bookingStatus(b.bookingStatus));
        StatusStyle.booking(h.tvStatus, b.bookingStatus);
        h.tvRooms.setText(BookingText.rooms(requireContext(), b));
        h.tvDates.setText(getString(R.string.portal_dates_value, DateUtils.display(b.checkInDate),
                DateUtils.display(b.checkOutDate), DateUtils.nights(b.checkInDate, b.checkOutDate), b.numberOfGuests));
        h.tvPayment.setText(Formatters.paymentStatus(b.paymentStatus));
        StatusStyle.payment(h.tvPayment, b.paymentStatus);
        h.tvTotal.setText(Formatters.vnd(b.totalAmount));
        boolean owing = b.remainingAmount > 0 && !"Cancelled".equals(b.bookingStatus);
        UiUtils.visible(h.tvRemaining, owing);
        h.tvRemaining.setText(getString(R.string.remaining_value, Formatters.vnd(b.remainingAmount)));
        h.getRoot().setOnClickListener(v -> detailLauncher.launch(PortalBookingDetailActivity.intent(requireContext(), b)));
    }

    private void setupKpi(ViewKpiCardBinding kpi, int icon, int label) {
        kpi.ivIcon.setImageResource(icon);
        kpi.tvLabel.setText(label);
        kpi.tvValue.setText("–");
    }

    private void note(ViewKpiCardBinding kpi, String text) {
        UiUtils.visible(kpi.tvNote, true);
        kpi.tvNote.setText(text);
    }


    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
