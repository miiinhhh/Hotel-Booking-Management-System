package com.example.hotelbookingandroid.ui.portal.shared;

import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.Customer;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Hồ sơ khách hàng (CRM) của các phân khu nhân viên phụ trách. */
public class CustomersFragment extends PortalListFragment {
    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<List<Customer>> viewModel;
    private BindingAdapter<Customer, ItemPortalRowBinding> adapter;
    private List<Customer> all = new ArrayList<>();
    private String query = "";

    @Override
    protected RecyclerView.Adapter<?> createAdapter() {
        adapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bind);
        return adapter;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void setup() {
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        enableSearch(R.string.search_customer_hint, q -> { query = q.toLowerCase(Locale.ROOT); apply(); });
        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            all = res.data != null ? res.data : new ArrayList<>();
            apply();
        });
        if (viewModel.needsInitialLoad()) reload();
    }

    @Override
    protected void reload() { viewModel.load(repository.customers()); }

    private void apply() {
        List<Customer> list = new ArrayList<>();
        int staying = 0;
        for (Customer c : all) {
            if (c.isStaying) staying++;
            String hay = (c.name + " " + c.phone + " " + c.email + " " + c.customerCode).toLowerCase(Locale.ROOT);
            if (query.isEmpty() || hay.contains(query)) list.add(c);
        }
        adapter.submit(list);
        setSummary(getString(R.string.customer_summary, all.size(), staying));
        showEmpty(list.isEmpty());
    }

    private void bind(ItemPortalRowBinding b, Customer c, int pos) {
        b.tvAvatar.setText(c.initials);
        b.tvTitle.setText(c.name);
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(c.tier);
        PortalStyle.tier(b.tvBadge, c.tier);
        b.tvLine1.setText(join(c.phone, c.email));
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(c.isStaying
                ? getString(R.string.customer_staying, c.currentRoom != null ? c.currentRoom : "")
                : (c.lastStayInfo != null ? c.lastStayInfo : ""));
        b.tvLine2.setTextColor(getResources().getColor(c.isStaying ? R.color.success : R.color.text_secondary, null));
        UiUtils.visible(b.layoutFooter, true);
        b.tvValue.setText(getString(R.string.customer_spend, c.totalSpendFormatted != null
                ? c.totalSpendFormatted : Formatters.vnd(c.totalSpend), c.totalCompletedBookings));
    }

    private static String join(String a, String b) {
        if (a == null || a.isEmpty()) return b == null ? "" : b;
        if (b == null || b.isEmpty()) return a;
        return a + " · " + b;
    }

    @Override protected int emptyIcon() { return R.drawable.ic_group; }
    @Override protected int emptyText() { return R.string.no_customers; }
}
