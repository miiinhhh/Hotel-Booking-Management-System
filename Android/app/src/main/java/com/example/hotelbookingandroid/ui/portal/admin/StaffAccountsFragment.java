package com.example.hotelbookingandroid.ui.portal.admin;

import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.StaffAccount;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.example.hotelbookingandroid.ui.portal.shared.PortalListFragment;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Danh sách nhân viên; Admin có quyền staff.manage có thể khóa / mở tài khoản. */
public class StaffAccountsFragment extends PortalListFragment {
    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<PortalModels.StaffPage> viewModel;
    private BindingAdapter<StaffAccount, ItemPortalRowBinding> adapter;
    private List<StaffAccount> all = new ArrayList<>();
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
        canManage = SessionManager.get().hasAnyPermission(Permissions.STAFF_MANAGE);
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        enableSearch(R.string.search_staff_hint, q -> { query = q.toLowerCase(Locale.ROOT); apply(); });
        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            all = res.data != null && res.data.items != null ? res.data.items : new ArrayList<>();
            apply();
        });
        if (viewModel.needsInitialLoad()) reload();
    }

    @Override
    protected void reload() { viewModel.load(repository.staff()); }

    private void apply() {
        List<StaffAccount> list = new ArrayList<>();
        int active = 0;
        for (StaffAccount s : all) {
            if (s.isActive) active++;
            String hay = (s.fullName + " " + s.email + " " + s.phone).toLowerCase(Locale.ROOT);
            if (query.isEmpty() || hay.contains(query)) list.add(s);
        }
        adapter.submit(list);
        setSummary(getString(R.string.staff_summary, all.size(), active));
        showEmpty(list.isEmpty());
    }

    private void bind(ItemPortalRowBinding b, StaffAccount s, int pos) {
        b.tvAvatar.setText(Formatters.initials(s.fullName, "NV"));
        b.tvTitle.setText(s.fullName);
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(s.isActive ? R.string.active : R.string.locked);
        PortalStyle.active(b.tvBadge, s.isActive);
        b.tvLine1.setText(s.email);
        UiUtils.visible(b.tvLine2, true);
        String roles = s.roles != null ? String.join(", ", s.roles) : "";
        b.tvLine2.setText(s.phone != null && !s.phone.isEmpty() ? s.phone + " · " + roles : roles);

        UiUtils.visible(b.switchActive, canManage);
        b.switchActive.setOnCheckedChangeListener(null);
        b.switchActive.setChecked(s.isActive);
        b.switchActive.setOnCheckedChangeListener((sw, checked) -> confirmToggle(s, checked, sw));
    }

    private void confirmToggle(StaffAccount s, boolean activate, android.widget.CompoundButton sw) {
        new MaterialAlertDialogBuilder(requireContext())
                .setMessage(getString(activate ? R.string.confirm_unlock_staff : R.string.confirm_lock_staff, s.fullName))
                .setNegativeButton(R.string.cancel, (d, w) -> apply())
                .setOnCancelListener(d -> apply())
                .setPositiveButton(R.string.confirm, (d, w) -> {
                    sw.setEnabled(false);
                    SingleObserver.observe(getViewLifecycleOwner(), repository.setStaffActive(s.userId, activate), res -> {
                        if (res.isLoading()) return;
                        sw.setEnabled(true);
                        if (res.isSuccess() && res.data != null) s.isActive = res.data.isActive;
                        if (res.isError()) UiUtils.toast(requireContext(), res.message);
                        apply();
                    });
                })
                .show();
    }


    @Override protected int emptyIcon() { return R.drawable.ic_badge; }
    @Override protected int emptyText() { return R.string.no_staff; }
}
