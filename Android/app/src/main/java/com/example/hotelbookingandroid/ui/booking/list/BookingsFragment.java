package com.example.hotelbookingandroid.ui.booking.list;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.databinding.FragmentBookingsBinding;
import com.example.hotelbookingandroid.ui.auth.LoginActivity;
import com.example.hotelbookingandroid.ui.booking.detail.BookingDetailActivity;

/** Tab "Đơn của tôi". */
public class BookingsFragment extends Fragment {
    private FragmentBookingsBinding binding;
    private BookingsViewModel viewModel;
    private BookingAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentBookingsBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        viewModel = new ViewModelProvider(this).get(BookingsViewModel.class);
        adapter = new BookingAdapter(item -> BookingDetailActivity.start(requireContext(), item.bookingId));
        binding.rvBookings.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvBookings.setAdapter(adapter);
        binding.swipeRefresh.setOnRefreshListener(viewModel::load);
        binding.loginRequired.btnLogin.setOnClickListener(v -> LoginActivity.start(requireContext()));

        binding.chipGroupStatus.setOnCheckedStateChangeListener((group, ids) -> {
            int id = ids.isEmpty() ? R.id.chipAll : ids.get(0);
            String status = null;
            if (id == R.id.chipPending) status = "Pending";
            else if (id == R.id.chipConfirmed) status = "Confirmed";
            else if (id == R.id.chipCompleted) status = "Completed";
            else if (id == R.id.chipCancelled) status = "Cancelled";
            viewModel.setStatus(status);
        });

        viewModel.bookings().observe(getViewLifecycleOwner(), res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess()) {
                adapter.submit(res.data);
                UiUtils.visible(binding.tvEmpty, res.data == null || res.data.isEmpty());
            }
        });
        SessionManager.get().loggedInState().observe(getViewLifecycleOwner(), loggedIn -> render(Boolean.TRUE.equals(loggedIn)));
    }

    private void render(boolean loggedIn) {
        UiUtils.visible(binding.loginRequired.getRoot(), !loggedIn);
        UiUtils.visible(binding.content, loggedIn);
        if (loggedIn) viewModel.load();
    }

    @Override
    public void onHiddenChanged(boolean hidden) {
        super.onHiddenChanged(hidden);
        // Làm mới khi quay lại tab (vd. vừa đặt phòng / hủy đơn).
        if (!hidden && SessionManager.get().isLoggedIn()) viewModel.load();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
