package com.example.hotelbookingandroid.ui.payment;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.payment.PaymentModels;
import com.example.hotelbookingandroid.data.repository.PaymentRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

public class PaymentViewModel extends BaseViewModel {
    private final PaymentRepository repository = new PaymentRepository();

    public LiveData<Resource<PaymentModels.VnPayCallbackResult>> verifyReturn(String vnpQuery) {
        return repository.verifyReturn(vnpQuery);
    }
}
