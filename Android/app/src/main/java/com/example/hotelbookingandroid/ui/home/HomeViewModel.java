package com.example.hotelbookingandroid.ui.home;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;
import androidx.lifecycle.MutableLiveData;
import androidx.lifecycle.Observer;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.data.repository.HotelRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

import java.util.ArrayList;
import java.util.List;

public class HomeViewModel extends BaseViewModel {
    public static final String SORT_PRICE_ASC = "price_asc";
    public static final String SORT_PRICE_DESC = "price_desc";

    private final HotelRepository repository = new HotelRepository();
    private final HotelModels.SearchCriteria criteria = new HotelModels.SearchCriteria();
    private final MutableLiveData<List<HotelModels.HotelCard>> hotels = new MutableLiveData<>(new ArrayList<>());
    private final MediatorLiveData<Resource<HotelModels.DiscoveryPage>> state = new MediatorLiveData<>();

    private String sort = SORT_PRICE_ASC;
    private int page = 0;
    private int totalPages = 1;
    private boolean loading;

    /** Gộp các trang kết quả vào một danh sách duy nhất (phân trang vô hạn). */
    private final Observer<Resource<HotelModels.DiscoveryPage>> pageMerger = res -> {
        loading = res != null && res.isLoading();
        if (res == null || !res.isSuccess() || res.data == null) return;
        page = res.data.page;
        totalPages = res.data.totalPages;
        List<HotelModels.HotelCard> merged = page <= 1 ? new ArrayList<>() : new ArrayList<>(hotels.getValue());
        if (res.data.items != null) merged.addAll(res.data.items);
        hotels.setValue(merged);
    };

    public HomeViewModel() {
        criteria.checkIn = DateUtils.today(0);
        criteria.checkOut = DateUtils.today(1);
        state.observeForever(pageMerger);
        search();
    }

    @Override
    protected void onCleared() {
        state.removeObserver(pageMerger);
    }

    public HotelModels.SearchCriteria criteria() { return criteria; }
    public LiveData<List<HotelModels.HotelCard>> hotels() { return hotels; }
    public LiveData<Resource<HotelModels.DiscoveryPage>> state() { return state; }

    public void setSort(String sort) {
        this.sort = sort;
        search();
    }

    public void search() {
        page = 0;
        totalPages = 1;
        bind(state, repository.search(criteria, sort, 1));
    }

    public void loadMore() {
        if (loading || page >= totalPages) return;
        bind(state, repository.search(criteria, sort, page + 1));
    }
}
