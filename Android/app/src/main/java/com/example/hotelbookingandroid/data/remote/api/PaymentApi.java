package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.core.network.ApiResponse;
import com.example.hotelbookingandroid.data.model.payment.PaymentModels;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Path;
import retrofit2.http.Url;

/** PaymentsController — thanh toán VNPay. */
public interface PaymentApi {
    @POST("api/payments/vnpay/create-payment")
    Call<ApiResponse<PaymentModels.VnPayPaymentResponse>> createVnPay(@Body PaymentModels.VnPayCreateRequest request);

    /**
     * Gửi lại query string mà VNPay trả về cho Backend xác minh chữ ký.
     * url = "api/payments/vnpay/return?vnp_...&json=1"
     */
    @GET
    Call<PaymentModels.VnPayCallbackResult> verifyReturn(@Url String relativeUrl);

    @GET("api/payments/vnpay/status/{txnRef}")
    Call<ApiResponse<PaymentModels.VnPayCallbackResult>> status(@Path("txnRef") String txnRef);
}
