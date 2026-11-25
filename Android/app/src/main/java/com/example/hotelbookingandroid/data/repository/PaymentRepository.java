package com.example.hotelbookingandroid.data.repository;

import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.CallExecutor;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.payment.PaymentModels;
import com.example.hotelbookingandroid.data.remote.api.PaymentApi;

public class PaymentRepository {
    private final PaymentApi api = ApiClient.create(PaymentApi.class);

    public LiveData<Resource<PaymentModels.VnPayPaymentResponse>> createVnPay(long bookingId, String target) {
        return CallExecutor.wrapped(api.createVnPay(new PaymentModels.VnPayCreateRequest(bookingId, target)));
    }

    /** @param vnpQuery query string VNPay gắn vào ReturnUrl (không có dấu '?'). */
    public LiveData<Resource<PaymentModels.VnPayCallbackResult>> verifyReturn(String vnpQuery) {
        return CallExecutor.raw(api.verifyReturn("api/payments/vnpay/return?" + vnpQuery + "&json=1"));
    }

    public LiveData<Resource<PaymentModels.VnPayCallbackResult>> status(String txnRef) {
        return CallExecutor.wrapped(api.status(txnRef));
    }
}
