package com.example.hotelbookingandroid.ui.booking.checkout;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Patterns;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.databinding.ActivityCheckoutBinding;
import com.example.hotelbookingandroid.ui.booking.detail.BookingDetailActivity;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.payment.VnPayActivity;

import java.io.Serializable;

/** Thanh toán: nhập thông tin khách, áp voucher, chọn đặt cọc VNPay hoặc trả tại khách sạn. */
public class CheckoutActivity extends AppCompatActivity {
    private static final String EXTRA_ARGS = "args";

    /** Dữ liệu phòng đã chọn từ màn chi tiết khách sạn. */
    public static class Args implements Serializable {
        public int hotelId;
        public String hotelName;
        public long roomId;
        public String roomName;
        public String checkIn;
        public String checkOut;
        public int guests;

        public static Args of(HotelModels.HotelDetail hotel, HotelModels.DiscoveryRoom room, HotelModels.SearchCriteria c) {
            Args a = new Args();
            a.hotelId = hotel.hotelId;
            a.hotelName = hotel.name;
            a.roomId = room.roomId;
            a.roomName = room.name; // đặt theo hạng phòng; số phòng xếp khi nhận phòng
            a.checkIn = hotel.checkIn;
            a.checkOut = hotel.checkOut;
            a.guests = c.totalGuests();
            return a;
        }
    }

    private ActivityCheckoutBinding binding;
    private CheckoutViewModel viewModel;
    private long createdBookingId;

    private final ActivityResultLauncher<Intent> vnPayLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> openBookingAndFinish());

    public static void start(Context context, Args args) {
        context.startActivity(new Intent(context, CheckoutActivity.class).putExtra(EXTRA_ARGS, args));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityCheckoutBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.toolbar.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(CheckoutViewModel.class);
        viewModel.init((Args) getIntent().getSerializableExtra(EXTRA_ARGS));
        Args a = viewModel.args();

        binding.tvHotel.setText(a.hotelName);
        binding.tvRoom.setText(a.roomName);
        binding.tvStay.setText(getString(R.string.stay_value, DateUtils.display(a.checkIn), DateUtils.display(a.checkOut),
                DateUtils.nights(a.checkIn, a.checkOut), a.guests));

        AuthResponse auth = SessionManager.get().getAuth();
        if (auth != null && savedInstanceState == null) {
            binding.etFullName.setText(auth.fullName);
            binding.etEmail.setText(auth.email);
        }

        binding.rgPayment.check(BookingModels.METHOD_CASH.equals(viewModel.paymentMethod()) ? R.id.rbCash : R.id.rbDeposit);
        binding.rgPayment.setOnCheckedChangeListener((g, id) -> viewModel.setPaymentMethod(
                id == R.id.rbCash ? BookingModels.METHOD_CASH : BookingModels.METHOD_DEPOSIT));
        binding.btnApplyVoucher.setOnClickListener(v -> viewModel.applyVoucher(String.valueOf(binding.etVoucher.getText())));
        binding.btnConfirm.setOnClickListener(v -> submit());

        viewModel.price().observe(this, res -> {
            UiUtils.visible(binding.progressPrice, res.isLoading());
            binding.btnConfirm.setEnabled(res.isSuccess());
            if (res.isError()) binding.tvVoucherMessage.setText(res.message);
            if (res.isSuccess() && res.data != null) renderPrice(res.data);
        });
    }

    private void renderPrice(BookingModels.PriceCalculationResult p) {
        binding.tvSubTotal.setText(Formatters.vnd(p.subTotal));
        binding.tvDiscount.setText("- " + Formatters.vnd(p.discountAmount));
        binding.tvTaxFee.setText(Formatters.vnd(p.taxAmount + p.feeAmount));
        binding.tvTotal.setText(Formatters.vnd(p.totalAmount));
        binding.tvBottomTotal.setText(Formatters.vnd(p.totalAmount));
        boolean deposit = BookingModels.METHOD_DEPOSIT.equals(viewModel.paymentMethod());
        binding.tvPayNow.setText(Formatters.vnd(deposit ? p.depositAmount : 0));
        binding.tvVoucherMessage.setText(p.voucherMessage != null ? p.voucherMessage : "");
        binding.btnConfirm.setText(deposit ? R.string.confirm_and_pay : R.string.confirm_booking);
    }

    private void submit() {
        String name = String.valueOf(binding.etFullName.getText()).trim();
        String phone = String.valueOf(binding.etPhone.getText()).trim();
        String email = String.valueOf(binding.etEmail.getText()).trim();
        binding.tilFullName.setError(name.isEmpty() ? getString(R.string.err_required) : null);
        binding.tilPhone.setError(phone.length() < 9 ? getString(R.string.err_phone) : null);
        binding.tilEmail.setError(Patterns.EMAIL_ADDRESS.matcher(email).matches() ? null : getString(R.string.err_email));
        if (binding.tilFullName.getError() != null || binding.tilPhone.getError() != null || binding.tilEmail.getError() != null)
            return;

        SingleObserver.observe(this, viewModel.createBooking(name, phone, email,
                String.valueOf(binding.etSpecialRequests.getText())), res -> {
            setBusy(res.isLoading());
            if (res.isError()) UiUtils.toast(this, res.message);
            if (res.isSuccess() && res.data != null) onBookingCreated(res.data);
        });
    }

    private void onBookingCreated(BookingModels.BookingDetail booking) {
        createdBookingId = booking.bookingId;
        if (!BookingModels.METHOD_DEPOSIT.equals(viewModel.paymentMethod())) {
            UiUtils.toast(this, getString(R.string.booking_created, booking.bookingCode));
            openBookingAndFinish();
            return;
        }
        SingleObserver.observe(this, viewModel.startVnPay(booking.bookingId), res -> {
            setBusy(res.isLoading());
            if (res.isError()) {
                UiUtils.toast(this, res.message);
                openBookingAndFinish(); // đơn đã tạo, khách có thể thanh toán lại ở chi tiết đơn
            }
            if (res.isSuccess() && res.data != null) {
                vnPayLauncher.launch(VnPayActivity.intent(this, res.data.paymentUrl));
            }
        });
    }

    private void openBookingAndFinish() {
        if (createdBookingId > 0) BookingDetailActivity.start(this, createdBookingId);
        finish();
    }

    private void setBusy(boolean busy) {
        binding.btnConfirm.setEnabled(!busy);
        UiUtils.visible(binding.progressSubmit, busy);
    }
}
