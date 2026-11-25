package com.example.hotelbookingandroid.ui.hotel;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.data.repository.HotelRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

public class HotelDetailViewModel extends BaseViewModel {
    private final HotelRepository repository = new HotelRepository();
    private final MediatorLiveData<Resource<HotelModels.HotelDetail>> detail = new MediatorLiveData<>();
    private final MediatorLiveData<Resource<HotelModels.HotelRating>> rating = new MediatorLiveData<>();
    private int hotelId;
    private HotelModels.SearchCriteria criteria;

    public void init(int hotelId, HotelModels.SearchCriteria criteria) {
        if (this.criteria != null) return; // đã khởi tạo (xoay màn hình)
        this.hotelId = hotelId;
        this.criteria = criteria;
        load();
        bind(rating, repository.rating(hotelId));
    }

    public void load() {
        bind(detail, repository.detail(hotelId, criteria));
    }

    public HotelModels.SearchCriteria criteria() { return criteria; }
    public LiveData<Resource<HotelModels.HotelDetail>> detail() { return detail; }
    public LiveData<Resource<HotelModels.HotelRating>> rating() { return rating; }
}
