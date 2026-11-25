package com.example.hotelbookingandroid.ui.offers;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
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
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.databinding.FragmentOffersBinding;

/** Tab Ưu đãi: danh sách voucher công khai, chạm để sao chép mã. */
public class OffersFragment extends Fragment {
    private FragmentOffersBinding binding;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentOffersBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        OffersViewModel viewModel = new ViewModelProvider(this).get(OffersViewModel.class);
        VoucherAdapter adapter = new VoucherAdapter(voucher -> {
            ClipboardManager cm = (ClipboardManager) requireContext().getSystemService(Context.CLIPBOARD_SERVICE);
            cm.setPrimaryClip(ClipData.newPlainText("voucher", voucher.code));
            UiUtils.toast(requireContext(), getString(R.string.voucher_copied, voucher.code));
        });
        binding.rvVouchers.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.rvVouchers.setAdapter(adapter);
        binding.swipeRefresh.setOnRefreshListener(viewModel::load);

        viewModel.vouchers().observe(getViewLifecycleOwner(), res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess()) {
                adapter.submit(res.data);
                UiUtils.visible(binding.tvEmpty, res.data == null || res.data.isEmpty());
            }
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
