package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.voucher.PublicVoucher;
import com.example.hotelbookingandroid.data.remote.api.VoucherApi;

import java.util.List;

public class VoucherRepository {
    private final VoucherApi api = ApiClient.create(VoucherApi.class);

    public LiveData<Resource<List<PublicVoucher>>> available() {
        return CallExecutor.raw(api.available());
    }
}
