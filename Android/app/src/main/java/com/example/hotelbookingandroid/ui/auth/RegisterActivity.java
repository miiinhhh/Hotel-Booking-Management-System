package com.example.hotelbookingandroid.ui.auth;

import android.content.Intent;
import android.os.Bundle;
import android.util.Patterns;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.databinding.ActivityRegisterBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;

public class RegisterActivity extends AppCompatActivity {
    private ActivityRegisterBinding binding;
    private AuthViewModel viewModel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRegisterBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        viewModel = new ViewModelProvider(this).get(AuthViewModel.class);

        binding.toolbar.setNavigationOnClickListener(v -> finish());
        binding.btnRegister.setOnClickListener(v -> submit());
        binding.tvLogin.setOnClickListener(v -> {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
        });
    }

    private void submit() {
        String name = String.valueOf(binding.etFullName.getText()).trim();
        String email = String.valueOf(binding.etEmail.getText()).trim();
        String phone = String.valueOf(binding.etPhone.getText()).trim();
        String password = String.valueOf(binding.etPassword.getText());
        String confirm = String.valueOf(binding.etConfirm.getText());

        binding.tilFullName.setError(name.isEmpty() ? "Vui lòng nhập họ tên" : null);
        binding.tilEmail.setError(Patterns.EMAIL_ADDRESS.matcher(email).matches() ? null : "Email không hợp lệ");
        binding.tilPassword.setError(password.length() < 8 ? "Mật khẩu tối thiểu 8 ký tự" : null);
        binding.tilConfirm.setError(password.equals(confirm) ? null : "Mật khẩu xác nhận không khớp");
        if (binding.tilFullName.getError() != null || binding.tilEmail.getError() != null
                || binding.tilPassword.getError() != null || binding.tilConfirm.getError() != null) return;

        SingleObserver.observe(this, viewModel.register(name, email, phone, password), res -> {
            binding.btnRegister.setEnabled(!res.isLoading());
            UiUtils.visible(binding.progress, res.isLoading());
            if (res.isSuccess()) {
                UiUtils.toast(this, "Đăng ký thành công");
                finish();
            } else if (res.isError()) {
                UiUtils.toast(this, res.message);
            }
        });
    }
}
