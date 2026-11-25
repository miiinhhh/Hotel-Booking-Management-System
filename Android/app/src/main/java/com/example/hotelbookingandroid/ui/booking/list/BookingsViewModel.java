package com.example.hotelbookingandroid.ui.booking.list;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.booking.BookingModels;
import com.example.hotelbookingandroid.data.repository.BookingRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

import java.util.List;

public class BookingsViewModel extends BaseViewModel {
    private final BookingRepository repository = new BookingRepository();
    private final MediatorLiveData<Resource<List<BookingModels.BookingListItem>>> bookings = new MediatorLiveData<>();
    private String status; // null = tất cả

    public LiveData<Resource<List<BookingModels.BookingListItem>>> bookings() { return bookings; }

    public void setStatus(String status) {
        this.status = status;
        load();
    }

    public void load() {
        bind(bookings, repository.myBookings(status));
    }
}
