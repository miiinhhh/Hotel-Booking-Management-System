package com.example.hotelbookingandroid.ui.portal.bookings;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.LinearLayout;

import androidx.annotation.StringRes;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.PortalBooking;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.ActivityPortalBookingDetailBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.common.StatusStyle;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.function.Supplier;

/**
 * Chi tiết + xử lý đơn cho nhân viên. Thao tác hiện theo luồng trạng thái:
 * Pending → Confirmed → CheckedIn → CheckedOut → Completed, cùng các nghiệp vụ thu tiền / hoàn tiền / no-show.
 */
public class PortalBookingDetailActivity extends AppCompatActivity {
    private static final String EXTRA_BOOKING = "booking";

    private ActivityPortalBookingDetailBinding binding;
    private final PortalRepository repository = new PortalRepository();
    private PortalBooking booking;

    public static Intent intent(Context context, PortalBooking booking) {
        return new Intent(context, PortalBookingDetailActivity.class).putExtra(EXTRA_BOOKING, booking);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPortalBookingDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.toolbar.setNavigationOnClickListener(v -> finish());
        booking = (PortalBooking) getIntent().getSerializableExtra(EXTRA_BOOKING);
        render();
        setupActions();
    }

    private void render() {
        PortalBooking b = booking;
        binding.tvCode.setText(getString(R.string.booking_code_value, b.bookingCode));
        binding.tvStatus.setText(Formatters.bookingStatus(b.bookingStatus));
        StatusStyle.booking(binding.tvStatus, b.bookingStatus);
        binding.tvPayment.setText(Formatters.paymentStatus(b.paymentStatus));
        StatusStyle.payment(binding.tvPayment, b.paymentStatus);

        binding.tvInitials.setText(Formatters.initials(b.customerName, "KH"));
        binding.tvCustomer.setText(b.customerName);
        StringBuilder contact = new StringBuilder();
        if (b.customerPhone != null) contact.append(b.customerPhone);
        if (b.customerEmail != null) contact.append(contact.length() > 0 ? "\n" : "").append(b.customerEmail);
        binding.tvContact.setText(contact);
        boolean hasPhone = b.customerPhone != null && !b.customerPhone.isEmpty();
        UiUtils.visible(binding.btnCall, hasPhone);
        binding.btnCall.setOnClickListener(v ->
                startActivity(new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + b.customerPhone))));

        binding.tvRooms.setText(BookingText.rooms(this, b));
        binding.tvDates.setText(getString(R.string.portal_dates_value, DateUtils.display(b.checkInDate),
                DateUtils.display(b.checkOutDate), DateUtils.nights(b.checkInDate, b.checkOutDate), b.numberOfGuests));
        boolean hasRequests = b.specialRequests != null && !b.specialRequests.isEmpty();
        UiUtils.visible(binding.tvRequests, hasRequests);
        binding.tvRequests.setText(getString(R.string.special_requests_value, b.specialRequests));

        binding.tvTotal.setText(Formatters.vnd(b.totalAmount));
        binding.tvDeposit.setText(Formatters.vnd(b.depositAmount));
        binding.tvPaid.setText(Formatters.vnd(b.paidAmount));
        binding.tvRemaining.setText(Formatters.vnd(b.remainingAmount));
    }

    private void setupActions() {
        SessionManager s = SessionManager.get();
        boolean canManage = s.hasAnyPermission(Permissions.BOOKING_MANAGE);
        boolean canPay = s.hasAnyPermission(Permissions.PAYMENT_MANAGE);
        String status = booking.bookingStatus;
        String code = booking.bookingCode;

        // --- Thao tác chính: bước tiếp theo trong luồng trạng thái ---
        boolean primary = false;
        if (canManage) {
            switch (status) {
                case "Pending":
                    primary = setPrimary(R.string.action_confirm, R.string.confirm_action_confirm,
                            () -> repository.updateStatus(booking.bookingId, "Confirmed", note(R.string.note_confirmed)));
                    break;
                case "Confirmed":
                    primary = setPrimary(R.string.action_check_in, R.string.confirm_action_check_in,
                            () -> repository.updateStatus(booking.bookingId, "CheckedIn", note(R.string.note_checked_in)));
                    break;
                case "CheckedIn":
                    primary = setPrimary(R.string.action_check_out, R.string.confirm_action_check_out,
                            () -> repository.updateStatus(booking.bookingId, "CheckedOut", note(R.string.note_checked_out)));
                    break;
                case "CheckedOut":
                    primary = setPrimary(R.string.action_complete, R.string.confirm_action_complete,
                            () -> repository.updateStatus(booking.bookingId, "Completed", note(R.string.note_completed)));
                    break;
                default:
                    break;
            }
        }
        UiUtils.visible(binding.bottomBar, primary);

        // --- Thao tác phụ ---
        boolean active = "Confirmed".equals(status) || "CheckedIn".equals(status) || "CheckedOut".equals(status);
        if (canPay && active && booking.remainingAmount > 0) {
            addSecondary(getString(R.string.action_collect_cash, Formatters.vnd(booking.remainingAmount)),
                    getString(R.string.confirm_action_cash, Formatters.vnd(booking.remainingAmount), code),
                    false, () -> repository.collectCash(booking.bookingId));
        }
        if (canPay && "RefundPending".equals(booking.paymentStatus)) {
            addSecondary(getString(R.string.action_confirm_refund), getString(R.string.confirm_action_refund, code),
                    false, () -> repository.confirmRefund(booking.bookingId));
        }
        boolean checkInPassed = DateUtils.nights(booking.checkInDate, DateUtils.today(0)) >= 0;
        if (canManage && "Confirmed".equals(status) && checkInPassed) {
            addSecondary(getString(R.string.action_no_show), getString(R.string.confirm_action_no_show, code),
                    true, () -> repository.noShow(booking.bookingId, note(R.string.note_no_show)));
        }
    }

    private boolean setPrimary(@StringRes int label, @StringRes int confirm, Supplier<LiveData<? extends Resource<?>>> action) {
        binding.btnPrimary.setText(label);
        binding.btnPrimary.setOnClickListener(v -> confirmAndRun(getString(label), getString(confirm, booking.bookingCode), action));
        return true;
    }

    private void addSecondary(String label, String confirm, boolean destructive, Supplier<LiveData<? extends Resource<?>>> action) {
        MaterialButton button = new MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle);
        button.setText(label);
        if (destructive) button.setTextColor(getColor(R.color.md_error));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                (int) (52 * getResources().getDisplayMetrics().density));
        lp.topMargin = (int) (8 * getResources().getDisplayMetrics().density);
        button.setLayoutParams(lp);
        button.setOnClickListener(v -> confirmAndRun(label, confirm, action));
        binding.layoutSecondaryActions.addView(button);
    }

    @SuppressWarnings("unchecked")
    private void confirmAndRun(String title, String message, Supplier<LiveData<? extends Resource<?>>> action) {
        new MaterialAlertDialogBuilder(this)
                .setTitle(title)
                .setMessage(message)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.confirm, (d, w) -> {
                    LiveData<Resource<Object>> live = (LiveData<Resource<Object>>) (LiveData<?>) action.get();
                    SingleObserver.observe(this, live, res -> {
                        setBusy(res.isLoading());
                        if (res.isError()) UiUtils.toast(this, res.message);
                        if (res.isSuccess()) {
                            UiUtils.toast(this, getString(R.string.action_done));
                            setResult(RESULT_OK);
                            finish();
                        }
                    });
                })
                .show();
    }

    private void setBusy(boolean busy) {
        UiUtils.visible(binding.progress, busy);
        binding.btnPrimary.setEnabled(!busy);
        for (int i = 0; i < binding.layoutSecondaryActions.getChildCount(); i++)
            binding.layoutSecondaryActions.getChildAt(i).setEnabled(!busy);
    }

    private String note(@StringRes int res) {
        String name = SessionManager.get().getAuth() != null ? SessionManager.get().getAuth().fullName : "";
        return getString(res, name);
    }
}
