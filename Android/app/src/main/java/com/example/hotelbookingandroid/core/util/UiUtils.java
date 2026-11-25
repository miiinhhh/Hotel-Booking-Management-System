package com.example.hotelbookingandroid.core.util;

import android.content.Context;
import android.view.View;
import android.widget.ImageView;
import android.widget.Toast;

import com.bumptech.glide.Glide;
import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.ApiClient;

public final class UiUtils {
    private UiUtils() {}

    public static void toast(Context context, String message) {
        if (context != null && message != null) Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
    }

    public static void visible(View view, boolean show) {
        view.setVisibility(show ? View.VISIBLE : View.GONE);
    }

    public static void loadImage(ImageView view, String url) {
        Glide.with(view).load(ApiClient.mediaUrl(url))
                .placeholder(R.drawable.bg_image_placeholder)
                .error(R.drawable.bg_image_placeholder)
                .centerCrop()
                .into(view);
    }
}
