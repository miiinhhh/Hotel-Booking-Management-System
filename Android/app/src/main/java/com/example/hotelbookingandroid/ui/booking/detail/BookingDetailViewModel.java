package com.example.hotelbookingandroid.ui.booking.detail;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;
import com.example.hotelbookingandroid.data.model.payment.PaymentModels;
import com.example.hotelbookingandroid.data.model.review.ReviewModels;
import com.example.hotelbookingandroid.data.repository.BookingRepository;
import com.example.hotelbookingandroid.data.repository.PaymentRepository;
import com.example.hotelbookingandroid.data.repository.ReviewRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

public class BookingDetailViewModel extends BaseViewModel {
    private final BookingRepository bookingRepository = new BookingRepository();
    private final PaymentRepository paymentRepository = new PaymentRepository();
    private final ReviewRepository reviewRepository = new ReviewRepository();

    private final MediatorLiveData<Resource<BookingModels.BookingDetail>> booking = new MediatorLiveData<>();
    private final MediatorLiveData<Resource<ReviewModels.Review>> review = new MediatorLiveData<>();
    private long bookingId;

    public void init(long bookingId) {
        if (this.bookingId != 0) return;
        this.bookingId = bookingId;
        load();
    }

    public LiveData<Resource<BookingModels.BookingDetail>> booking() { return booking; }
    public LiveData<Resource<ReviewModels.Review>> review() { return review; }

    public void load() {
        bind(booking, bookingRepository.detail(bookingId));
    }

    public void loadReview() {
        bind(review, reviewRepository.forBooking(bookingId));
    }

    public LiveData<Resource<PaymentModels.VnPayPaymentResponse>> pay() {
        return paymentRepository.createVnPay(bookingId, PaymentModels.TARGET_DEPOSIT);
    }

    public LiveData<Resource<BookingModels.CancellationPreview>> previewCancel() {
        return bookingRepository.previewCancel(bookingId);
    }

    public LiveData<Resource<Boolean>> cancel(String reason) {
        return bookingRepository.cancel(bookingId, reason);
    }

    public LiveData<Resource<ReviewModels.Review>> saveReview(boolean isUpdate, int rating, String comment) {
        return reviewRepository.save(bookingId, isUpdate, rating, comment);
    }
}
