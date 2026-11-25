package com.example.hotelbookingandroid.ui.offers;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.voucher.PublicVoucher;
import com.example.hotelbookingandroid.data.repository.VoucherRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

import java.util.List;

public class OffersViewModel extends BaseViewModel {
    private final VoucherRepository repository = new VoucherRepository();
    private final MediatorLiveData<Resource<List<PublicVoucher>>> vouchers = new MediatorLiveData<>();

    public OffersViewModel() {
        load();
    }

    public LiveData<Resource<List<PublicVoucher>>> vouchers() { return vouchers; }

    public void load() {
        bind(vouchers, repository.available());
    }
}
