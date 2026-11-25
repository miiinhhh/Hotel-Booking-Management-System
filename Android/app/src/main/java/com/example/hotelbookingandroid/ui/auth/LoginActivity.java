package com.example.hotelbookingandroid.ui.auth;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Patterns;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.repository.AuthRepository;
import com.example.hotelbookingandroid.databinding.ActivityLoginBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;

/**
 * Đăng nhập khách hàng (cổng customer). Nhân viên / quản trị dùng {@link InternalLoginActivity}
 * qua liên kết "Đăng nhập nội bộ" ở cuối màn hình.
 */
public class LoginActivity extends AppCompatActivity {
    private ActivityLoginBinding binding;
    private AuthViewModel viewModel;

    public static void start(Context context) {
        context.startActivity(new Intent(context, LoginActivity.class));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        viewModel = new ViewModelProvider(this).get(AuthViewModel.class);

        binding.toolbar.setNavigationOnClickListener(v -> finish());
        binding.btnLogin.setOnClickListener(v -> submit());
        binding.tvRegister.setOnClickListener(v -> {
            startActivity(new Intent(this, RegisterActivity.class));
            finish();
        });
        binding.tvInternalLogin.setOnClickListener(v -> {
            InternalLoginActivity.start(this, String.valueOf(binding.etEmail.getText()).trim());
            finish();
        });
    }

    private void submit() {
        String email = String.valueOf(binding.etEmail.getText()).trim();
        String password = String.valueOf(binding.etPassword.getText());
        binding.tilEmail.setError(Patterns.EMAIL_ADDRESS.matcher(email).matches() ? null : getString(R.string.err_email));
        binding.tilPassword.setError(password.isEmpty() ? getString(R.string.err_required) : null);
        if (binding.tilEmail.getError() != null || binding.tilPassword.getError() != null) return;
        UiUtils.visible(binding.tvError, false);

        SingleObserver.observe(this, viewModel.login(AuthRepository.PORTAL_CUSTOMER, email, password), res -> {
            binding.btnLogin.setEnabled(!res.isLoading());
            UiUtils.visible(binding.progress, res.isLoading());
            if (res.isError()) {
                // Backend trả cùng một thông báo cho sai mật khẩu và sai cổng (chống dò tài khoản),
                // nên nhắc nhân viên dùng đúng lối vào.
                UiUtils.visible(binding.tvError, true);
                binding.tvError.setText(getString(R.string.login_error_customer, res.message));
            }
            if (res.isSuccess() && res.data != null) {
                UiUtils.toast(this, getString(R.string.greeting_user, res.data.fullName));
                finish();
            }
        });
    }
}
