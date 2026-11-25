package com.example.hotelbookingandroid.ui.booking.detail;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;
import com.example.hotelbookingandroid.data.model.review.ReviewModels;
import com.example.hotelbookingandroid.databinding.ActivityBookingDetailBinding;
import com.example.hotelbookingandroid.databinding.DialogCancelBinding;
import com.example.hotelbookingandroid.databinding.DialogReviewBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.common.StatusStyle;
import com.example.hotelbookingandroid.ui.payment.VnPayActivity;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

public class BookingDetailActivity extends AppCompatActivity {
    private static final String EXTRA_ID = "bookingId";

    private ActivityBookingDetailBinding binding;
    private BookingDetailViewModel viewModel;
    private ReviewModels.Review currentReview;

    private final ActivityResultLauncher<Intent> vnPayLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> viewModel.load());

    public static void start(Context context, long bookingId) {
        context.startActivity(new Intent(context, BookingDetailActivity.class).putExtra(EXTRA_ID, bookingId));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityBookingDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.toolbar.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(BookingDetailViewModel.class);
        viewModel.init(getIntent().getLongExtra(EXTRA_ID, 0));

        binding.swipeRefresh.setOnRefreshListener(viewModel::load);
        binding.btnPay.setOnClickListener(v -> pay());
        binding.btnCancel.setOnClickListener(v -> previewCancel());
        binding.btnReview.setOnClickListener(v -> showReviewDialog());

        viewModel.booking().observe(this, res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(this, res.message);
            if (res.isSuccess() && res.data != null) render(res.data);
        });
        viewModel.review().observe(this, res -> {
            if (!res.isSuccess()) return;
            currentReview = res.data;
            binding.btnReview.setText(currentReview == null ? R.string.write_review : R.string.edit_review);
            UiUtils.visible(binding.tvMyReview, currentReview != null);
            if (currentReview != null) {
                binding.tvMyReview.setText(getString(R.string.my_review_value, currentReview.rating,
                        currentReview.comment != null ? currentReview.comment : ""));
            }
        });
    }

    private void render(BookingModels.BookingDetail b) {
        binding.tvCode.setText(getString(R.string.booking_code_value, b.bookingCode));
        binding.chipStatus.setText(Formatters.bookingStatus(b.bookingStatus));
        StatusStyle.booking(binding.chipStatus, b.bookingStatus);
        binding.chipPayment.setText(Formatters.paymentStatus(b.paymentStatus));
        StatusStyle.payment(binding.chipPayment, b.paymentStatus);
        binding.tvStay.setText(getString(R.string.stay_value, DateUtils.display(b.checkInDate), DateUtils.display(b.checkOutDate),
                DateUtils.nights(b.checkInDate, b.checkOutDate), b.numberOfGuests));
        binding.tvMethod.setText(BookingModels.METHOD_CASH.equals(b.paymentMethod)
                ? R.string.method_cash : R.string.method_deposit);

        binding.tvSubTotal.setText(Formatters.vnd(b.subTotal));
        binding.tvDiscount.setText("- " + Formatters.vnd(b.discountAmount));
        binding.tvTaxFee.setText(Formatters.vnd(b.taxAmount + b.feeAmount));
        binding.tvTotal.setText(Formatters.vnd(b.totalAmount));
        binding.tvDeposit.setText(Formatters.vnd(b.depositAmount));
        binding.tvRemaining.setText(Formatters.vnd(b.remainingAmount));

        StringBuilder guests = new StringBuilder();
        if (b.guests != null) {
            for (BookingModels.BookingGuest g : b.guests) {
                if (guests.length() > 0) guests.append('\n');
                guests.append(g.fullName);
                if (g.phone != null) guests.append(" · ").append(g.phone);
                if (g.email != null) guests.append(" · ").append(g.email);
            }
        }
        binding.tvGuests.setText(guests);

        UiUtils.visible(binding.tvSpecialRequests, b.specialRequests != null && !b.specialRequests.isEmpty());
        binding.tvSpecialRequests.setText(getString(R.string.special_requests_value, b.specialRequests));
        UiUtils.visible(binding.tvCancelReason, b.cancellationReason != null);
        binding.tvCancelReason.setText(getString(R.string.cancel_reason_value, b.cancellationReason));
        UiUtils.visible(binding.tvHold, b.canPay() && b.holdExpiresAt != null);
        binding.tvHold.setText(getString(R.string.hold_value, b.holdExpiresAt != null ? b.holdExpiresAt.replace('T', ' ') : ""));

        UiUtils.visible(binding.btnPay, b.canPay() && BookingModels.METHOD_DEPOSIT.equals(b.paymentMethod));
        UiUtils.visible(binding.btnCancel, b.canCancel());
        UiUtils.visible(binding.btnReview, b.canReview());
        if (b.canReview()) viewModel.loadReview();
    }

    private void pay() {
        SingleObserver.observe(this, viewModel.pay(), res -> {
            binding.btnPay.setEnabled(!res.isLoading());
            if (res.isError()) UiUtils.toast(this, res.message);
            if (res.isSuccess() && res.data != null) vnPayLauncher.launch(VnPayActivity.intent(this, res.data.paymentUrl));
        });
    }

    private void previewCancel() {
        SingleObserver.observe(this, viewModel.previewCancel(), res -> {
            binding.btnCancel.setEnabled(!res.isLoading());
            if (res.isError()) UiUtils.toast(this, res.message);
            if (res.isSuccess() && res.data != null) showCancelDialog(res.data);
        });
    }

    private void showCancelDialog(BookingModels.CancellationPreview p) {
        DialogCancelBinding d = DialogCancelBinding.inflate(LayoutInflater.from(this));
        String policy = p.appliedPolicyName != null ? p.appliedPolicyName : "";
        if (p.policyDescription != null) policy += (policy.isEmpty() ? "" : "\n") + p.policyDescription;
        d.tvPolicy.setText(policy);
        UiUtils.visible(d.tvPolicy, !policy.isEmpty());
        d.tvRefund.setText(getString(R.string.refund_value, Formatters.vnd(p.refundAmount), Formatters.vnd(p.penaltyAmount)));

        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.cancel_booking)
                .setView(d.getRoot())
                .setNegativeButton(R.string.keep_booking, null)
                .setPositiveButton(R.string.confirm_cancel, (dialog, w) -> {
                    String reason = String.valueOf(d.etReason.getText()).trim();
                    if (reason.isEmpty()) reason = getString(R.string.default_cancel_reason);
                    SingleObserver.observe(this, viewModel.cancel(reason), res -> {
                        if (res.isError()) UiUtils.toast(this, res.message);
                        if (res.isSuccess()) {
                            UiUtils.toast(this, getString(R.string.cancel_success));
                            viewModel.load();
                        }
                    });
                })
                .show();
    }

    private void showReviewDialog() {
        DialogReviewBinding d = DialogReviewBinding.inflate(LayoutInflater.from(this));
        boolean isUpdate = currentReview != null;
        if (isUpdate) {
            d.ratingBar.setRating(currentReview.rating);
            d.etComment.setText(currentReview.comment);
        }
        new MaterialAlertDialogBuilder(this)
                .setTitle(isUpdate ? R.string.edit_review : R.string.write_review)
                .setView(d.getRoot())
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.send, (dialog, w) -> {
                    int rating = Math.max(1, Math.round(d.ratingBar.getRating()));
                    SingleObserver.observe(this, viewModel.saveReview(isUpdate, rating,
                            String.valueOf(d.etComment.getText()).trim()), res -> {
                        if (res.isError()) UiUtils.toast(this, res.message);
                        if (res.isSuccess()) {
                            UiUtils.toast(this, getString(R.string.review_saved));
                            viewModel.loadReview();
                        }
                    });
                })
                .show();
    }
}
