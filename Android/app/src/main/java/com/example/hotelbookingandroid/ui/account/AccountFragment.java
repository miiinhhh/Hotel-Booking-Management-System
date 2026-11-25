package com.example.hotelbookingandroid.ui.account;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;

import com.bumptech.glide.Glide;
import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.auth.AccountProfile;
import com.example.hotelbookingandroid.databinding.FragmentAccountBinding;
import com.example.hotelbookingandroid.databinding.ViewInfoRowBinding;
import com.example.hotelbookingandroid.ui.auth.LoginActivity;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/** Tab Tài khoản: thông tin cá nhân và đăng xuất. */
public class AccountFragment extends Fragment {
    private FragmentAccountBinding binding;
    private AccountViewModel viewModel;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentAccountBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        viewModel = new ViewModelProvider(this).get(AccountViewModel.class);
        binding.loginRequired.btnLogin.setOnClickListener(v -> LoginActivity.start(requireContext()));
        binding.btnLogout.setOnClickListener(v -> new MaterialAlertDialogBuilder(requireContext())
                .setMessage(R.string.logout_confirm)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.logout, (d, w) -> viewModel.logout())
                .show());

        viewModel.profile().observe(getViewLifecycleOwner(), res -> {
            UiUtils.visible(binding.progress, res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess() && res.data != null) render(res.data);
        });
        SessionManager.get().loggedInState().observe(getViewLifecycleOwner(), loggedIn -> {
            boolean in = Boolean.TRUE.equals(loggedIn);
            UiUtils.visible(binding.loginRequired.getRoot(), !in);
            UiUtils.visible(binding.content, in);
            if (in) viewModel.load();
        });
    }

    private void render(AccountProfile p) {
        binding.tvName.setText(p.fullName);
        bindRow(binding.rowEmail, R.drawable.ic_mail, R.string.email, p.email);
        bindRow(binding.rowPhone, R.drawable.ic_phone, R.string.phone,
                p.phone != null ? p.phone : getString(R.string.not_updated));
        bindRow(binding.rowDob, R.drawable.ic_cake, R.string.date_of_birth,
                p.dateOfBirth != null ? DateUtils.display(p.dateOfBirth) : getString(R.string.not_updated));
        binding.tvMemberSince.setText(getString(R.string.member_since, DateUtils.display(p.createdAt)));
        Glide.with(this).load(ApiClient.mediaUrl(p.avatarUrl)).circleCrop()
                .placeholder(R.drawable.ic_account).error(R.drawable.ic_account).into(binding.ivAvatar);
    }

    private static void bindRow(ViewInfoRowBinding row, int icon, int label, String value) {
        row.ivIcon.setImageResource(icon);
        row.tvLabel.setText(label);
        row.tvValue.setText(value);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
