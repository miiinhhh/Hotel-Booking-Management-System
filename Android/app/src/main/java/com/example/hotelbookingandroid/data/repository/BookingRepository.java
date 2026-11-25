package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;
import com.example.hotelbookingandroid.data.remote.api.BookingApi;

import java.util.List;

public class BookingRepository {
    private final BookingApi api = ApiClient.create(BookingApi.class);

    public LiveData<Resource<BookingModels.PriceCalculationResult>> calculate(BookingModels.CalculatePriceRequest r) {
        return CallExecutor.wrapped(api.calculatePrice(r));
    }

    public LiveData<Resource<BookingModels.BookingDetail>> create(BookingModels.CreateBookingRequest r) {
        return CallExecutor.wrapped(api.create(r));
    }

    /** status = null để lấy tất cả. */
    public LiveData<Resource<List<BookingModels.BookingListItem>>> myBookings(String status) {
        return CallExecutor.wrapped(api.myBookings(status, 1, 50));
    }

    public LiveData<Resource<BookingModels.BookingDetail>> detail(long bookingId) {
        return CallExecutor.wrapped(api.detail(bookingId));
    }

    public LiveData<Resource<BookingModels.CancellationPreview>> previewCancel(long bookingId) {
        return CallExecutor.wrapped(api.previewCancel(bookingId));
    }

    public LiveData<Resource<Boolean>> cancel(long bookingId, String reason) {
        return CallExecutor.wrapped(api.cancel(bookingId, new BookingModels.CancelRequest(reason)));
    }
}
