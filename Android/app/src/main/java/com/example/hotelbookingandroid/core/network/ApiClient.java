package com.example.hotelbookingandroid.core.network;

import com.example.hotelbookingandroid.BuildConfig;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.logging.HttpLoggingInterceptor;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/** Singleton Retrofit. Mọi interface trong data.remote.api được tạo qua {@link #create(Class)}. */
public final class ApiClient {
    private static Retrofit retrofit;
    private static final Gson GSON = new GsonBuilder().create();

    private ApiClient() {}

    public static void init(SessionManager session) {
        HttpLoggingInterceptor logging = new HttpLoggingInterceptor();
        logging.setLevel(BuildConfig.DEBUG ? HttpLoggingInterceptor.Level.BODY : HttpLoggingInterceptor.Level.NONE);

        // Client riêng (không có authenticator) để gọi refresh token, tránh vòng lặp.
        Retrofit refreshRetrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(new OkHttpClient.Builder().connectTimeout(20, TimeUnit.SECONDS).build())
                .addConverterFactory(GsonConverterFactory.create(GSON))
                .build();

        OkHttpClient client = new OkHttpClient.Builder()
                .connectTimeout(20, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .addInterceptor(new AuthInterceptor(session))
                .authenticator(new TokenAuthenticator(session, refreshRetrofit))
                .addInterceptor(logging)
                .build();

        retrofit = new Retrofit.Builder()
                .baseUrl(BuildConfig.API_BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create(GSON))
                .build();
    }

    public static <T> T create(Class<T> service) {
        return retrofit.create(service);
    }

    public static Gson gson() {
        return GSON;
    }

    /** Ảnh từ Backend có thể là đường dẫn tương đối "/api/..." -> ghép base URL. */
    public static String mediaUrl(String url) {
        if (url == null || url.isEmpty()) return null;
        if (url.startsWith("http")) return url;
        String base = BuildConfig.API_BASE_URL;
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);
        return base + (url.startsWith("/") ? url : "/" + url);
    }
}
