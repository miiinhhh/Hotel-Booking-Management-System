package com.example.hotelbookingandroid.ui.payment;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.databinding.ActivityVnpayBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

/**
 * Mở cổng VNPay trong WebView. Khi VNPay chuyển hướng về ReturnUrl (có vnp_ResponseCode),
 * app chặn lại và gửi query string cho Backend xác minh chữ ký — không phụ thuộc ReturnUrl là localhost.
 */
public class VnPayActivity extends AppCompatActivity {
    private static final String EXTRA_URL = "paymentUrl";
    public static final String RESULT_SUCCESS = "success";

    private ActivityVnpayBinding binding;
    private PaymentViewModel viewModel;
    private boolean handled;

    public static Intent intent(Context context, String paymentUrl) {
        return new Intent(context, VnPayActivity.class).putExtra(EXTRA_URL, paymentUrl);
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityVnpayBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        viewModel = new ViewModelProvider(this).get(PaymentViewModel.class);
        binding.toolbar.setNavigationOnClickListener(v -> confirmExit());
        getOnBackPressedDispatcher().addCallback(this, new androidx.activity.OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (binding.webView.canGoBack()) binding.webView.goBack(); else confirmExit();
            }
        });

        binding.webView.getSettings().setJavaScriptEnabled(true);
        binding.webView.getSettings().setDomStorageEnabled(true);
        binding.webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return intercept(request.getUrl());
            }

            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) {
                UiUtils.visible(binding.progress, true);
                if (intercept(Uri.parse(url))) view.stopLoading();
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                UiUtils.visible(binding.progress, false);
            }
        });
        if (savedInstanceState == null) binding.webView.loadUrl(getIntent().getStringExtra(EXTRA_URL));
    }

    private boolean intercept(Uri uri) {
        if (handled || uri == null || uri.getQueryParameter("vnp_ResponseCode") == null) return false;
        String host = uri.getHost() == null ? "" : uri.getHost();
        if (host.contains("vnpayment.vn")) return false; // vẫn đang trong trang VNPay
        handled = true;
        verify(uri.getEncodedQuery());
        return true;
    }

    private void verify(String query) {
        SingleObserver.observe(this, viewModel.verifyReturn(query), res -> {
            UiUtils.visible(binding.progress, res.isLoading());
            if (res.isLoading()) return;
            boolean ok = res.isSuccess() && res.data != null && res.data.success;
            String message = res.isSuccess() && res.data != null
                    ? (ok ? getString(R.string.payment_success, Formatters.vnd(res.data.amount), res.data.bookingCode)
                    : (res.data.message != null ? res.data.message : getString(R.string.payment_failed)))
                    : res.message;
            new MaterialAlertDialogBuilder(this)
                    .setTitle(ok ? R.string.payment_success_title : R.string.payment_failed_title)
                    .setMessage(message)
                    .setCancelable(false)
                    .setPositiveButton(R.string.view_booking, (d, w) -> {
                        setResult(RESULT_OK, new Intent().putExtra(RESULT_SUCCESS, ok));
                        finish();
                    })
                    .show();
        });
    }

    private void confirmExit() {
        new MaterialAlertDialogBuilder(this)
                .setMessage(R.string.payment_exit_confirm)
                .setNegativeButton(R.string.stay, null)
                .setPositiveButton(R.string.exit, (d, w) -> {
                    setResult(RESULT_CANCELED);
                    finish();
                })
                .show();
    }

    @Override
    protected void onDestroy() {
        binding.webView.destroy();
        super.onDestroy();
    }
}
