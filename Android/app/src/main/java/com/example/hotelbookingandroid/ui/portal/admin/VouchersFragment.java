package com.example.hotelbookingandroid.ui.portal.admin;

import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.AdminVoucher;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.example.hotelbookingandroid.ui.portal.shared.PortalListFragment;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Danh sách voucher: mức giảm, lượt dùng, hạn; bật/tắt nhanh bằng công tắc. */
public class VouchersFragment extends PortalListFragment {
    private static final int F_ALL = 0, F_ACTIVE = 1, F_INACTIVE = 2;

    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<PortalModels.Paged<AdminVoucher>> viewModel;
    private BindingAdapter<AdminVoucher, ItemPortalRowBinding> adapter;
    private List<AdminVoucher> all = new ArrayList<>();
    private int filter = F_ALL;
    private String query = "";
    private boolean canManage;

    @Override
    protected RecyclerView.Adapter<?> createAdapter() {
        adapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bind);
        return adapter;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void setup() {
        canManage = SessionManager.get().hasAnyPermission(Permissions.VOUCHER_MANAGE);
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        enableSearch(R.string.search_voucher_hint, q -> { query = q.toUpperCase(Locale.ROOT); apply(); });
        enableChips(new int[]{R.string.status_all, R.string.active, R.string.inactive}, i -> { filter = i; apply(); });
        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            all = res.data != null && res.data.items != null ? res.data.items : new ArrayList<>();
            apply();
        });
        if (viewModel.needsInitialLoad()) reload();
    }

    @Override
    protected void reload() { viewModel.load(repository.vouchers()); }

    private void apply() {
        List<AdminVoucher> list = new ArrayList<>();
        int active = 0;
        for (AdminVoucher v : all) {
            if (v.isActive) active++;
            if (filter == F_ACTIVE && !v.isActive) continue;
            if (filter == F_INACTIVE && v.isActive) continue;
            if (!query.isEmpty() && !v.code.toUpperCase(Locale.ROOT).contains(query)) continue;
            list.add(v);
        }
        adapter.submit(list);
        setSummary(getString(R.string.voucher_summary, all.size(), active));
        showEmpty(list.isEmpty());
    }

    private void bind(ItemPortalRowBinding b, AdminVoucher v, int pos) {
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(R.drawable.ic_offer);
        b.tvTitle.setText(v.code);
        b.tvTitle.setFontFeatureSettings("tnum");
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(v.isActive ? R.string.active : R.string.inactive);
        PortalStyle.active(b.tvBadge, v.isActive);

        String discount = "Percentage".equals(v.voucherType)
                ? getString(R.string.voucher_percent, (int) v.discountValue)
                : getString(R.string.voucher_fixed, Formatters.vnd(v.discountValue));
        if (v.maxDiscountAmount != null && "Percentage".equals(v.voucherType))
            discount += " " + getString(R.string.voucher_max, Formatters.vnd(v.maxDiscountAmount));
        b.tvLine1.setText(discount + " · " + getString(R.string.voucher_min_order, Formatters.vnd(v.minimumOrderAmount)));
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(getString(R.string.dates_short, DateUtils.display(v.startAt), DateUtils.display(v.endAt)));

        UiUtils.visible(b.layoutFooter, true);
        b.tvValue.setText(v.usageLimit != null
                ? getString(R.string.voucher_usage_limit, v.usedCount, v.usageLimit)
                : getString(R.string.voucher_usage, v.usedCount));

        UiUtils.visible(b.switchActive, canManage);
        b.switchActive.setOnCheckedChangeListener(null);
        b.switchActive.setChecked(v.isActive);
        b.switchActive.setOnCheckedChangeListener((sw, checked) -> toggle(v, sw));
    }

    private void toggle(AdminVoucher v, android.widget.CompoundButton sw) {
        sw.setEnabled(false);
        SingleObserver.observe(getViewLifecycleOwner(), repository.toggleVoucher(v.voucherId), res -> {
            if (res.isLoading()) return;
            sw.setEnabled(true);
            if (res.isSuccess() && res.data != null) v.isActive = res.data.isActive;
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            apply(); // vẽ lại đúng trạng thái server
        });
    }

    @Override protected int emptyIcon() { return R.drawable.ic_offer; }
    @Override protected int emptyText() { return R.string.no_offers; }
}
