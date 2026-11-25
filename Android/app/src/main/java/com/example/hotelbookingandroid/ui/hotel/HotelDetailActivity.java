package com.example.hotelbookingandroid.ui.hotel;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.hotel.HotelModels;
import com.example.hotelbookingandroid.databinding.ActivityHotelDetailBinding;
import com.example.hotelbookingandroid.ui.auth.LoginActivity;
import com.example.hotelbookingandroid.ui.booking.checkout.CheckoutActivity;
import com.google.android.material.chip.Chip;

import java.util.Locale;

public class HotelDetailActivity extends AppCompatActivity {
    private static final String EXTRA_HOTEL_ID = "hotelId";
    private static final String EXTRA_CRITERIA = "criteria";

    private ActivityHotelDetailBinding binding;
    private HotelDetailViewModel viewModel;
    private RoomAdapter roomAdapter;
    private HotelModels.HotelDetail hotel;

    public static void start(Context context, int hotelId, HotelModels.SearchCriteria criteria) {
        context.startActivity(new Intent(context, HotelDetailActivity.class)
                .putExtra(EXTRA_HOTEL_ID, hotelId)
                .putExtra(EXTRA_CRITERIA, criteria));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityHotelDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        binding.toolbar.setNavigationOnClickListener(v -> finish());

        viewModel = new ViewModelProvider(this).get(HotelDetailViewModel.class);
        viewModel.init(getIntent().getIntExtra(EXTRA_HOTEL_ID, 0),
                (HotelModels.SearchCriteria) getIntent().getSerializableExtra(EXTRA_CRITERIA));

        roomAdapter = new RoomAdapter(this::onBookRoom);
        binding.rvRooms.setLayoutManager(new LinearLayoutManager(this));
        binding.rvRooms.setNestedScrollingEnabled(false);
        binding.rvRooms.setAdapter(roomAdapter);

        viewModel.detail().observe(this, res -> {
            UiUtils.visible(binding.progress, res.isLoading());
            if (res.isError()) UiUtils.toast(this, res.message);
            if (res.isSuccess() && res.data != null) render(res.data);
        });
        viewModel.rating().observe(this, res -> {
            if (!res.isSuccess() || res.data == null) return;
            binding.tvRating.setText(res.data.totalReviews == 0 || res.data.averageRating == null
                    ? getString(R.string.no_reviews)
                    : getString(R.string.rating_value,
                    String.format(Locale.US, "%.1f", res.data.averageRating), res.data.totalReviews));
        });
    }

    private void render(HotelModels.HotelDetail h) {
        hotel = h;
        binding.collapsingToolbar.setTitle(h.name);
        binding.tvName.setText(h.name);
        binding.tvAddress.setText(h.address + ", " + h.city);
        boolean hasDescription = h.description != null && !h.description.isEmpty();
        binding.tvDescription.setText(hasDescription ? h.description : "");
        UiUtils.visible(binding.cardDescription, hasDescription);
        binding.tvReadMore.setOnClickListener(v -> {
            boolean expanded = binding.tvDescription.getMaxLines() == Integer.MAX_VALUE;
            binding.tvDescription.setMaxLines(expanded ? 4 : Integer.MAX_VALUE);
            binding.tvReadMore.setText(expanded ? R.string.read_more : R.string.read_less);
        });

        double minPrice = 0;
        if (h.rooms != null) {
            for (HotelModels.DiscoveryRoom r : h.rooms) {
                if (minPrice == 0 || r.pricePerNight < minPrice) minPrice = r.pricePerNight;
            }
        }
        boolean hasRooms = minPrice > 0;
        binding.tvFromPrice.setText(hasRooms ? Formatters.vnd(minPrice) : getString(R.string.sold_out));
        binding.btnSelectRoom.setEnabled(hasRooms);
        binding.btnSelectRoom.setOnClickListener(v -> {
            binding.appBar.setExpanded(false, true);
            binding.scrollView.smoothScrollTo(0, binding.tvRoomsTitle.getTop());
        });

        String hero = null;
        if (h.images != null) {
            for (HotelModels.HotelImage img : h.images) {
                if (hero == null || img.isPrimary) hero = img.url;
                if (img.isPrimary) break;
            }
        }
        UiUtils.loadImage(binding.ivHero, hero);

        if (h.policies != null) {
            binding.tvPolicy.setText(getString(R.string.policy_value, h.policies.checkInTime, h.policies.checkOutTime,
                    h.policies.cancellationPolicy != null ? h.policies.cancellationPolicy : getString(R.string.no_cancel_policy)));
        }

        binding.chipAmenities.removeAllViews();
        if (h.amenities != null) {
            for (HotelModels.Amenity a : h.amenities) {
                Chip chip = new Chip(this);
                chip.setText(a.name);
                chip.setCheckable(false);
                chip.setClickable(false);
                binding.chipAmenities.addView(chip);
            }
        }

        HotelModels.SearchCriteria c = viewModel.criteria();
        binding.tvStay.setText(getString(R.string.stay_value, DateUtils.display(h.checkIn), DateUtils.display(h.checkOut),
                DateUtils.nights(h.checkIn, h.checkOut), c.totalGuests()));
        roomAdapter.submit(h.rooms);
        UiUtils.visible(binding.tvNoRooms, h.rooms == null || h.rooms.isEmpty());
    }

    private void onBookRoom(HotelModels.DiscoveryRoom room) {
        if (!SessionManager.get().isLoggedIn()) {
            UiUtils.toast(this, getString(R.string.login_to_book));
            LoginActivity.start(this);
            return;
        }
        HotelModels.SearchCriteria c = viewModel.criteria();
        if (room.capacity < c.totalGuests()) {
            UiUtils.toast(this, getString(R.string.err_capacity, room.capacity));
            return;
        }
        CheckoutActivity.start(this, CheckoutActivity.Args.of(hotel, room, c));
    }
}
