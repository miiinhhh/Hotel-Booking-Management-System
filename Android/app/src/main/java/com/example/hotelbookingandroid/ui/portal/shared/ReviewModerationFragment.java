package com.example.hotelbookingandroid.ui.portal.shared;

import android.view.LayoutInflater;
import android.widget.ArrayAdapter;

import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.AdminReview;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.DialogCancelBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

/** Kiểm duyệt đánh giá theo khách sạn: chỉ hiện/ẩn (ẩn bắt buộc có lý do), như web. */
public class ReviewModerationFragment extends PortalListFragment {
    private static final String[] STATUS = {null, "Visible", "Hidden"};

    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<PortalModels.ReviewPage> viewModel;
    private BindingAdapter<AdminReview, ItemPortalRowBinding> adapter;
    private final List<PortalModels.HotelSummary> hotels = new ArrayList<>();
    private int hotelId;
    private String status;

    @Override
    protected RecyclerView.Adapter<?> createAdapter() {
        adapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bind);
        return adapter;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void setup() {
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        UiUtils.visible(binding.tilDropdown, true);
        binding.tilDropdown.setHint(R.string.select_hotel);
        binding.dropdown.setOnItemClickListener((parent, v, position, id) -> {
            hotelId = hotels.get(position).hotelId;
            reload();
        });
        enableChips(new int[]{R.string.status_all, R.string.review_visible, R.string.review_hidden}, i -> {
            status = STATUS[i];
            reload();
        });

        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            List<AdminReview> items = res.data != null && res.data.items != null ? res.data.items : new ArrayList<>();
            adapter.submit(items);
            setSummary(getString(R.string.review_summary, res.data != null ? res.data.total : 0));
            showEmpty(items.isEmpty());
        });
        loadHotels();
    }

    private void loadHotels() {
        SingleObserver.observe(getViewLifecycleOwner(), repository.hotels(), res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (!res.isSuccess() || res.data == null || res.data.items == null) return;
            hotels.clear();
            hotels.addAll(res.data.items);
            List<String> names = new ArrayList<>();
            for (PortalModels.HotelSummary h : hotels) names.add(h.hotelName);
            binding.dropdown.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, names));
            if (!hotels.isEmpty() && hotelId == 0) {
                hotelId = hotels.get(0).hotelId;
                binding.dropdown.setText(names.get(0), false);
                reload();
            }
            showEmpty(hotels.isEmpty());
        });
    }

    @Override
    protected void reload() {
        if (hotelId == 0) { binding.swipeRefresh.setRefreshing(false); return; }
        viewModel.load(repository.reviews(hotelId, status));
    }

    private void bind(ItemPortalRowBinding b, AdminReview r, int pos) {
        UiUtils.visible(b.tvAvatar, true);
        b.tvAvatar.setText(r.rating + "★");
        b.tvTitle.setText(stars(r.rating));
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText("Visible".equals(r.status) ? R.string.review_visible
                : "Hidden".equals(r.status) ? R.string.review_hidden : R.string.review_deleted);
        PortalStyle.review(b.tvBadge, r.status);
        b.tvLine1.setText(r.comment != null && !r.comment.isEmpty() ? r.comment : getString(R.string.no_comment));
        b.tvLine1.setMaxLines(4);
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(getString(R.string.review_meta, r.bookingId, DateUtils.display(r.createdAt)));

        boolean visible = "Visible".equals(r.status);
        boolean canToggle = visible || "Hidden".equals(r.status);
        UiUtils.visible(b.layoutFooter, canToggle);
        UiUtils.visible(b.btnAction, canToggle);
        b.tvValue.setText("");
        b.btnAction.setText(visible ? R.string.hide_review : R.string.show_review);
        b.btnAction.setOnClickListener(v -> {
            if (visible) askReasonAndHide(r);
            else moderate(r, "Visible", null);
        });
    }

    private void askReasonAndHide(AdminReview r) {
        DialogCancelBinding d = DialogCancelBinding.inflate(LayoutInflater.from(requireContext()));
        UiUtils.visible(d.tvPolicy, false);
        UiUtils.visible(d.tvRefund, false);
        d.etReason.setHint(R.string.hide_reason_hint);
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.hide_review)
                .setView(d.getRoot())
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.hide_review, (dialog, w) -> {
                    String reason = String.valueOf(d.etReason.getText()).trim();
                    if (reason.isEmpty()) { UiUtils.toast(requireContext(), getString(R.string.err_hide_reason)); return; }
                    moderate(r, "Hidden", reason);
                })
                .show();
    }

    private void moderate(AdminReview r, String newStatus, String reason) {
        SingleObserver.observe(getViewLifecycleOwner(), repository.moderate(hotelId, r.reviewId, newStatus, reason), res -> {
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess()) { UiUtils.toast(requireContext(), getString(R.string.action_done)); reload(); }
        });
    }

    private static String stars(int rating) {
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) sb.append(i <= rating ? '★' : '☆');
        return sb.toString();
    }

    @Override protected int emptyIcon() { return R.drawable.ic_star; }
    @Override protected int emptyText() { return R.string.no_reviews_admin; }
}
