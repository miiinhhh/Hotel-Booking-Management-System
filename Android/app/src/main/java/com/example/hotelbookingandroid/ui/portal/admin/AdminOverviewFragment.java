package com.example.hotelbookingandroid.ui.portal.admin;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.FragmentAdminOverviewBinding;
import com.example.hotelbookingandroid.databinding.ViewKpiCardBinding;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Tổng quan kinh doanh (GET /api/admin/reports/overview). */
public class AdminOverviewFragment extends Fragment {
    private FragmentAdminOverviewBinding binding;
    private LoadViewModel<PortalModels.BusinessReport> viewModel;
    private final PortalRepository repository = new PortalRepository();
    private int days = 30;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentAdminOverviewBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @SuppressWarnings("unchecked")
    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        kpi(binding.kpiRevenue, R.drawable.ic_offer, R.string.kpi_revenue);
        kpi(binding.kpiOccupancy, R.drawable.ic_villa, R.string.kpi_occupancy);
        kpi(binding.kpiBookings, R.drawable.ic_booking, R.string.kpi_new_bookings);
        kpi(binding.kpiCancel, R.drawable.ic_logout, R.string.kpi_cancel_rate);

        binding.chipGroupPeriod.setOnCheckedStateChangeListener((g, ids) -> {
            if (ids.isEmpty()) return;
            int id = ids.get(0);
            days = id == R.id.chip7 ? 7 : id == R.id.chip90 ? 90 : 30;
            reload();
        });
        binding.swipeRefresh.setOnRefreshListener(this::reload);
        viewModel.data().observe(getViewLifecycleOwner(), this::render);
        if (viewModel.needsInitialLoad()) reload();
    }

    private void reload() {
        viewModel.load(repository.report(DateUtils.today(-(days - 1)), DateUtils.today(0)));
    }

    private void render(Resource<PortalModels.BusinessReport> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        if (!res.isSuccess() || res.data == null) return;
        PortalModels.BusinessReport r = res.data;

        binding.tvRange.setText(getString(R.string.report_range, DateUtils.display(r.from), DateUtils.display(r.to)));
        binding.kpiRevenue.tvValue.setText(Formatters.compactVnd(r.revenue));
        note(binding.kpiRevenue, Formatters.vnd(r.revenue));
        binding.kpiOccupancy.tvValue.setText(percent(r.occupancyRate));
        binding.kpiBookings.tvValue.setText(String.valueOf(r.bookingCount));
        binding.kpiCancel.tvValue.setText(percent(r.cancellationRate));
        note(binding.kpiCancel, getString(R.string.cancelled_count, r.cancelledBookings));

        List<Double> values = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        PortalModels.ReportDay peak = null;
        if (r.days != null) {
            for (PortalModels.ReportDay d : r.days) {
                values.add(d.revenue);
                labels.add(d.date != null && d.date.length() >= 10 ? d.date.substring(8, 10) + "/" + d.date.substring(5, 7) : "");
                if (peak == null || d.revenue > peak.revenue) peak = d;
            }
        }
        binding.chart.setData(values, labels);
        binding.tvPeak.setText(peak != null && peak.revenue > 0
                ? getString(R.string.peak_day, DateUtils.display(peak.date), Formatters.vnd(peak.revenue))
                : getString(R.string.no_revenue));

        binding.progressOccupancy.setProgressCompat((int) Math.round(r.occupancyRate), true);
        binding.tvRoomNights.setText(getString(R.string.room_nights_value, r.occupiedRoomNights, r.availableRoomNights));
    }

    private void kpi(ViewKpiCardBinding k, int icon, int label) {
        k.ivIcon.setImageResource(icon);
        k.tvLabel.setText(label);
        k.tvValue.setText("–");
    }

    private void note(ViewKpiCardBinding k, String text) {
        UiUtils.visible(k.tvNote, true);
        k.tvNote.setText(text);
    }

    private static String percent(double value) {
        return String.format(Locale.US, value % 1 == 0 ? "%.0f%%" : "%.1f%%", value);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
