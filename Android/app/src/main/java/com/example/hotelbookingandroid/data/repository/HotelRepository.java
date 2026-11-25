package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.data.remote.api.HotelApi;

import java.util.HashMap;
import java.util.Map;

public class HotelRepository {
    private final HotelApi api = ApiClient.create(HotelApi.class);

    public LiveData<Resource<HotelModels.DiscoveryPage>> search(HotelModels.SearchCriteria c, String sort, int page) {
        Map<String, String> q = baseQuery(c);
        if (c.location != null && !c.location.trim().isEmpty()) q.put("location", c.location.trim());
        q.put("sort", sort);
        q.put("page", String.valueOf(page));
        q.put("pageSize", "12");
        return CallExecutor.raw(api.search(q));
    }

    public LiveData<Resource<HotelModels.HotelDetail>> detail(int hotelId, HotelModels.SearchCriteria c) {
        return CallExecutor.raw(api.detail(hotelId, baseQuery(c)));
    }

    public LiveData<Resource<HotelModels.HotelRating>> rating(int hotelId) {
        return CallExecutor.raw(api.rating(hotelId));
    }

    private static Map<String, String> baseQuery(HotelModels.SearchCriteria c) {
        Map<String, String> q = new HashMap<>();
        q.put("checkIn", c.checkIn);
        q.put("checkOut", c.checkOut);
        q.put("adults", String.valueOf(c.adults));
        q.put("children", String.valueOf(c.children));
        q.put("rooms", String.valueOf(c.rooms));
        return q;
    }
}
