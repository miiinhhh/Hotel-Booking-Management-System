package com.example.hotelbookingandroid.ui.booking.checkout;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;
import com.example.hotelbookingandroid.data.model.payment.PaymentModels;
import com.example.hotelbookingandroid.data.repository.BookingRepository;
import com.example.hotelbookingandroid.data.repository.PaymentRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

public class CheckoutViewModel extends BaseViewModel {
    private final BookingRepository bookingRepository = new BookingRepository();
    private final PaymentRepository paymentRepository = new PaymentRepository();
    private final MediatorLiveData<Resource<BookingModels.PriceCalculationResult>> price = new MediatorLiveData<>();

    private CheckoutActivity.Args args;
    private String paymentMethod = BookingModels.METHOD_DEPOSIT;
    private String voucherCode;

    public void init(CheckoutActivity.Args args) {
        if (this.args != null) return;
        this.args = args;
        recalculate();
    }

    public CheckoutActivity.Args args() { return args; }
    public String paymentMethod() { return paymentMethod; }
    public LiveData<Resource<BookingModels.PriceCalculationResult>> price() { return price; }

    public void setPaymentMethod(String method) {
        if (method.equals(paymentMethod)) return;
        paymentMethod = method;
        recalculate();
    }

    public void applyVoucher(String code) {
        voucherCode = code == null || code.trim().isEmpty() ? null : code.trim().toUpperCase();
        recalculate();
    }

    /** Giá luôn do Backend tính (giá động, voucher, thuế, phí, tiền cọc). */
    public void recalculate() {
        BookingModels.CalculatePriceRequest r = new BookingModels.CalculatePriceRequest();
        r.checkInDate = args.checkIn;
        r.checkOutDate = args.checkOut;
        r.roomIds.add(args.roomId);
        r.voucherCode = voucherCode;
        r.paymentMethod = paymentMethod;
        r.numberOfGuests = args.guests;
        bind(price, bookingRepository.calculate(r));
    }

    public LiveData<Resource<BookingModels.BookingDetail>> createBooking(String fullName, String phone,
                                                                         String email, String specialRequests) {
        BookingModels.CreateBookingRequest r = new BookingModels.CreateBookingRequest();
        r.checkInDate = args.checkIn;
        r.checkOutDate = args.checkOut;
        r.numberOfGuests = args.guests;
        r.paymentMethod = paymentMethod;
        r.voucherCode = voucherCode;
        r.specialRequests = specialRequests == null || specialRequests.trim().isEmpty() ? null : specialRequests.trim();
        r.rooms.add(new BookingModels.RoomRef(args.roomId));
        r.guests.add(new BookingModels.GuestInput(fullName.trim(), phone.trim(), email.trim(), true));
        return bookingRepository.create(r);
    }

    public LiveData<Resource<PaymentModels.VnPayPaymentResponse>> startVnPay(long bookingId) {
        return paymentRepository.createVnPay(bookingId, PaymentModels.TARGET_DEPOSIT);
    }
}
