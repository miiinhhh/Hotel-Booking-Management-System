package com.example.hotelbookingandroid.ui.home;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.util.Pair;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.databinding.FragmentHomeBinding;
import com.example.hotelbookingandroid.ui.hotel.HotelDetailActivity;
import com.google.android.material.chip.Chip;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointForward;
import com.google.android.material.datepicker.MaterialDatePicker;

/** Tab Khám phá: tìm khách sạn theo địa điểm, ngày, số khách. */
public class HomeFragment extends Fragment {
    private FragmentHomeBinding binding;
    private HomeViewModel viewModel;
    private HotelAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentHomeBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        viewModel = new ViewModelProvider(this).get(HomeViewModel.class);
        HotelModels.SearchCriteria c = viewModel.criteria();

        adapter = new HotelAdapter(hotel -> HotelDetailActivity.start(requireContext(), hotel.hotelId, c));
        LinearLayoutManager lm = new LinearLayoutManager(requireContext());
        binding.rvHotels.setLayoutManager(lm);
        binding.rvHotels.setAdapter(adapter);
        binding.rvHotels.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrolled(@NonNull RecyclerView rv, int dx, int dy) {
                if (dy > 0 && lm.findLastVisibleItemPosition() >= adapter.getItemCount() - 3) viewModel.loadMore();
            }
        });

        binding.etLocation.setText(c.location);
        binding.btnDates.setOnClickListener(v -> pickDates());
        binding.btnGuests.setOnClickListener(v -> GuestPickerDialog.show(requireContext(), c, this::renderCriteria));
        binding.btnSearch.setOnClickListener(v -> {
            c.location = String.valueOf(binding.etLocation.getText());
            viewModel.search();
        });
        binding.swipeRefresh.setOnRefreshListener(viewModel::search);
        binding.chipGroupSort.setOnCheckedStateChangeListener((group, ids) -> viewModel.setSort(
                ids.contains(R.id.chipPriceDesc) ? HomeViewModel.SORT_PRICE_DESC : HomeViewModel.SORT_PRICE_ASC));

        setupDestinations();
        var auth = SessionManager.get().getAuth();
        binding.tvGreeting.setText(auth != null
                ? getString(R.string.greeting_user, auth.fullName) : getString(R.string.greeting_guest));

        renderCriteria();
        viewModel.hotels().observe(getViewLifecycleOwner(), list -> {
            adapter.submit(list);
            UiUtils.visible(binding.tvEmpty, list.isEmpty() && !binding.swipeRefresh.isRefreshing());
        });
        viewModel.state().observe(getViewLifecycleOwner(), res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess() && res.data != null) {
                binding.tvResultCount.setText(getString(R.string.result_count, res.data.totalCount));
                UiUtils.visible(binding.tvEmpty, res.data.totalCount == 0);
                if (res.data.message != null) binding.tvEmpty.setText(res.data.message);
            }
        });
    }

    /** Chip điểm đến nhanh: chạm để điền địa điểm và tìm ngay. */
    private void setupDestinations() {
        for (String city : getResources().getStringArray(R.array.popular_destinations)) {
            Chip chip = new Chip(requireContext());
            chip.setText(city);
            chip.setCheckable(false);
            chip.setChipIconResource(R.drawable.ic_place);
            chip.setChipIconTintResource(R.color.md_primary);
            chip.setOnClickListener(v -> {
                binding.etLocation.setText(city);
                viewModel.criteria().location = city;
                viewModel.search();
            });
            binding.chipGroupDestinations.addView(chip);
        }
    }

    private void pickDates() {
        HotelModels.SearchCriteria c = viewModel.criteria();
        MaterialDatePicker<Pair<Long, Long>> picker = MaterialDatePicker.Builder.dateRangePicker()
                .setTitleText(R.string.pick_dates)
                .setSelection(new Pair<>(DateUtils.toUtcMillis(c.checkIn), DateUtils.toUtcMillis(c.checkOut)))
                .setCalendarConstraints(new CalendarConstraints.Builder()
                        .setValidator(DateValidatorPointForward.from(DateUtils.toUtcMillis(DateUtils.today(0)))).build())
                .build();
        picker.addOnPositiveButtonClickListener(sel -> {
            if (sel.first == null || sel.second == null || sel.first.equals(sel.second)) {
                UiUtils.toast(requireContext(), getString(R.string.err_min_one_night));
                return;
            }
            c.checkIn = DateUtils.fromUtcMillis(sel.first);
            c.checkOut = DateUtils.fromUtcMillis(sel.second);
            renderCriteria();
        });
        picker.show(getChildFragmentManager(), "dates");
    }

    private void renderCriteria() {
        HotelModels.SearchCriteria c = viewModel.criteria();
        binding.btnDates.setText(getString(R.string.dates_value, DateUtils.display(c.checkIn),
                DateUtils.display(c.checkOut), DateUtils.nights(c.checkIn, c.checkOut)));
        binding.btnGuests.setText(getString(R.string.guests_value, c.adults, c.children, c.rooms));
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
