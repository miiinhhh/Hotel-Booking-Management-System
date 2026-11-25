package com.example.hotelbookingandroid.data.remote.api;

import com.example.hotelbookingandroid.data.model.voucher.PublicVoucher;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.GET;

/** VouchersController (phần công khai cho khách). */
public interface VoucherApi {
    @GET("api/vouchers/available")
    Call<List<PublicVoucher>> available();
}
