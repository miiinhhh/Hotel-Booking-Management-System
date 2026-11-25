package com.example.hotelbookingandroid.ui.auth;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Patterns;
import android.view.inputmethod.EditorInfo;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.repository.AuthRepository;
import com.example.hotelbookingandroid.databinding.ActivityInternalLoginBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalRouter;

/**
 * Đăng nhập nội bộ cho Nhân viên (cổng staff) và Quản trị (cổng admin).
 * Nhớ loại tài khoản + email lần trước để nhân viên không phải chọn lại mỗi lần.
 */
public class InternalLoginActivity extends AppCompatActivity {
    private static final String EXTRA_EMAIL = "email";
    private static final String PREFS = "stayluxe.internalLogin";
    private static final String KEY_PORTAL = "portal";
    private static final String KEY_EMAIL = "email";

    private ActivityInternalLoginBinding binding;
    private AuthViewModel viewModel;
    private SharedPreferences prefs;

    /** @param email email khách vừa gõ ở màn đăng nhập khách (nếu có) để điền sẵn. */
    public static void start(Context context, String email) {
        context.startActivity(new Intent(context, InternalLoginActivity.class).putExtra(EXTRA_EMAIL, email));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityInternalLoginBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        getWindow().setStatusBarColor(getColor(R.color.md_inverse_surface));
        WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView()).setAppearanceLightStatusBars(false);

        viewModel = new ViewModelProvider(this).get(AuthViewModel.class);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        if (savedInstanceState == null) {
            boolean admin = AuthRepository.PORTAL_ADMIN.equals(prefs.getString(KEY_PORTAL, AuthRepository.PORTAL_STAFF));
            binding.togglePortal.check(admin ? R.id.btnPortalAdmin : R.id.btnPortalStaff);
            String passed = getIntent().getStringExtra(EXTRA_EMAIL);
            binding.etEmail.setText(passed != null && !passed.isEmpty() ? passed : prefs.getString(KEY_EMAIL, ""));
            if (binding.etEmail.length() > 0) binding.etPassword.requestFocus();
        }
        renderPortal();

        binding.toolbar.setNavigationOnClickListener(v -> finish());
        binding.togglePortal.addOnButtonCheckedListener((g, id, checked) -> { if (checked) renderPortal(); });
        binding.btnLogin.setOnClickListener(v -> submit());
        binding.etPassword.setOnEditorActionListener((v, actionId, e) -> {
            if (actionId == EditorInfo.IME_ACTION_DONE) { submit(); return true; }
            return false;
        });
        binding.tvCustomerLogin.setOnClickListener(v -> {
            LoginActivity.start(this);
            finish();
        });
    }

    private String portal() {
        return binding.togglePortal.getCheckedButtonId() == R.id.btnPortalAdmin
                ? AuthRepository.PORTAL_ADMIN : AuthRepository.PORTAL_STAFF;
    }

    private void renderPortal() {
        boolean admin = AuthRepository.PORTAL_ADMIN.equals(portal());
        binding.tvPortalHint.setText(admin ? R.string.portal_admin_hint : R.string.portal_staff_hint);
        UiUtils.visible(binding.tvError, false);
    }

    private void submit() {
        String email = String.valueOf(binding.etEmail.getText()).trim();
        String password = String.valueOf(binding.etPassword.getText());
        binding.tilEmail.setError(Patterns.EMAIL_ADDRESS.matcher(email).matches() ? null : getString(R.string.err_email));
        binding.tilPassword.setError(password.isEmpty() ? getString(R.string.err_required) : null);
        if (binding.tilEmail.getError() != null || binding.tilPassword.getError() != null) return;
        UiUtils.visible(binding.tvError, false);
        String portal = portal();

        SingleObserver.observe(this, viewModel.login(portal, email, password), res -> {
            binding.btnLogin.setEnabled(!res.isLoading());
            UiUtils.visible(binding.progress, res.isLoading());
            if (res.isError()) {
                // Backend gộp "sai mật khẩu" và "sai loại tài khoản" thành một thông báo,
                // nên gợi ý thử loại còn lại.
                boolean admin = AuthRepository.PORTAL_ADMIN.equals(portal);
                UiUtils.visible(binding.tvError, true);
                binding.tvError.setText(getString(R.string.login_error_internal, res.message,
                        getString(admin ? R.string.portal_staff : R.string.portal_admin)));
            }
            if (res.isSuccess() && res.data != null) {
                prefs.edit().putString(KEY_PORTAL, portal).putString(KEY_EMAIL, email).apply();
                UiUtils.toast(this, getString(R.string.greeting_user, res.data.fullName));
                PortalRouter.openHome(this);
                finish();
            }
        });
    }
}
