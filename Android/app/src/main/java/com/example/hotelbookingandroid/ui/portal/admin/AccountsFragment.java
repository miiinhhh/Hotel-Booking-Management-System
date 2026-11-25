package com.example.hotelbookingandroid.ui.portal.admin;

import android.view.LayoutInflater;
import android.view.View;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.AdminModels.AdminUser;
import com.example.hotelbookingandroid.data.model.portal.AdminModels.Role;
import com.example.hotelbookingandroid.data.repository.AdminRepository;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.databinding.SheetAccountFormBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.example.hotelbookingandroid.ui.portal.shared.PortalListFragment;
import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import com.google.android.material.chip.Chip;
import com.google.android.material.datepicker.CalendarConstraints;
import com.google.android.material.datepicker.DateValidatorPointBackward;
import com.google.android.material.datepicker.MaterialDatePicker;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Quản trị tài khoản (tương đương AdminAccounts của web): tìm, lọc theo vai trò, khóa/mở, sửa & gán vai trò. */
public class AccountsFragment extends PortalListFragment {
    /** Bộ lọc: null = tất cả, "__locked" = đã khóa, còn lại là tên vai trò. */
    private static final String LOCKED = "__locked";
    private static final String[] FILTERS = {null, SessionManager.ROLE_ADMIN, SessionManager.ROLE_STAFF, "Customer", LOCKED};
    private static final int[] FILTER_LABELS = {R.string.status_all, R.string.role_admin, R.string.role_staff,
            R.string.role_customer, R.string.locked};

    private final AdminRepository repository = new AdminRepository();
    private LoadViewModel<List<AdminUser>> viewModel;
    private BindingAdapter<AdminUser, ItemPortalRowBinding> adapter;
    private List<AdminUser> all = new ArrayList<>();
    private final List<Role> roles = new ArrayList<>();
    private String filter;
    private String query = "";
    private long selfId;
    private boolean canAssignRoles;

    @Override
    protected RecyclerView.Adapter<?> createAdapter() {
        adapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bind);
        return adapter;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void setup() {
        SessionManager s = SessionManager.get();
        selfId = s.getAuth() != null ? s.getAuth().userId : 0;
        canAssignRoles = s.hasAnyPermission(Permissions.ROLES_MANAGE);
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        enableSearch(R.string.search_account_hint, q -> { query = q.toLowerCase(Locale.ROOT); apply(); });
        enableChips(FILTER_LABELS, i -> { filter = FILTERS[i]; apply(); });
        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            all = res.data != null ? res.data : new ArrayList<>();
            apply();
        });
        if (viewModel.needsInitialLoad()) reload();
        if (canAssignRoles) loadRoles();
    }

    @Override
    protected void reload() { viewModel.load(repository.users()); }

    private void loadRoles() {
        SingleObserver.observe(getViewLifecycleOwner(), repository.roles(), res -> {
            if (!res.isSuccess() || res.data == null) return;
            roles.clear();
            roles.addAll(res.data);
        });
    }

    private void apply() {
        List<AdminUser> list = new ArrayList<>();
        int locked = 0;
        for (AdminUser u : all) {
            if (!u.isActive) locked++;
            if (LOCKED.equals(filter) && u.isActive) continue;
            if (filter != null && !LOCKED.equals(filter) && (u.roles == null || !u.roles.contains(filter))) continue;
            String hay = (u.fullName + " " + u.email + " " + u.phone).toLowerCase(Locale.ROOT);
            if (!query.isEmpty() && !hay.contains(query)) continue;
            list.add(u);
        }
        adapter.submit(list);
        setSummary(getString(R.string.account_summary, all.size(), locked, list.size()));
        showEmpty(list.isEmpty());
    }

    private void bind(ItemPortalRowBinding b, AdminUser u, int pos) {
        b.tvAvatar.setText(Formatters.initials(u.fullName, "?"));
        boolean self = u.userId == selfId;
        b.tvTitle.setText(self ? getString(R.string.account_self, u.fullName) : u.fullName);
        UiUtils.visible(b.tvBadge, true);
        b.tvBadge.setText(roleLabel(u.roles));
        RoleStyle.apply(b.tvBadge, u.roles);
        b.tvLine1.setText(u.email);
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(u.isActive ? (u.phone != null ? u.phone : getString(R.string.not_updated))
                : getString(R.string.account_locked_note));
        b.tvLine2.setTextColor(getResources().getColor(u.isActive ? R.color.text_secondary : R.color.md_error, null));
        b.getRoot().setAlpha(u.isActive ? 1f : 0.65f);

        // Không cho tự khóa chính mình.
        UiUtils.visible(b.switchActive, !self);
        b.switchActive.setOnCheckedChangeListener(null);
        b.switchActive.setChecked(u.isActive);
        b.switchActive.setOnCheckedChangeListener((sw, checked) -> confirmToggle(u, checked));
        b.getRoot().setOnClickListener(v -> openForm(u));
    }

    private String roleLabel(List<String> userRoles) {
        if (userRoles == null || userRoles.isEmpty()) return getString(R.string.no_role);
        if (userRoles.size() == 1) return userRoles.get(0);
        return getString(R.string.role_count, userRoles.get(0), userRoles.size() - 1);
    }

    private void confirmToggle(AdminUser u, boolean activate) {
        new MaterialAlertDialogBuilder(requireContext())
                .setMessage(getString(activate ? R.string.confirm_unlock_account : R.string.confirm_lock_account, u.fullName))
                .setNegativeButton(R.string.cancel, (d, w) -> apply())
                .setOnCancelListener(d -> apply())
                .setPositiveButton(R.string.confirm, (d, w) ->
                        SingleObserver.observe(getViewLifecycleOwner(), repository.setUserActive(u.userId, activate), res -> {
                            if (res.isLoading()) return;
                            if (res.isSuccess() && res.data != null) u.isActive = res.data.isActive;
                            if (res.isError()) UiUtils.toast(requireContext(), res.message);
                            apply();
                        }))
                .show();
    }

    // ===================== Form sửa tài khoản =====================

    private void openForm(AdminUser u) {
        SheetAccountFormBinding f = SheetAccountFormBinding.inflate(LayoutInflater.from(requireContext()));
        BottomSheetDialog dialog = new BottomSheetDialog(requireContext());
        dialog.setContentView(f.getRoot());
        dialog.getBehavior().setState(BottomSheetBehavior.STATE_EXPANDED);
        dialog.getBehavior().setSkipCollapsed(true);
        boolean self = u.userId == selfId;

        f.tvInitials.setText(Formatters.initials(u.fullName, "?"));
        f.tvName.setText(u.fullName);
        f.tvEmail.setText(u.email);
        f.etFullName.setText(u.fullName);
        f.etPhone.setText(u.phone);
        final String[] dob = {u.dateOfBirth != null && u.dateOfBirth.length() >= 10 ? u.dateOfBirth.substring(0, 10) : null};
        Runnable renderDob = () -> f.btnDob.setText(dob[0] != null
                ? getString(R.string.dob_value, DateUtils.display(dob[0])) : getString(R.string.dob_empty));
        renderDob.run();
        f.btnDob.setOnClickListener(v -> {
            MaterialDatePicker<Long> picker = MaterialDatePicker.Builder.datePicker()
                    .setTitleText(R.string.date_of_birth)
                    .setSelection(dob[0] != null ? DateUtils.toUtcMillis(dob[0]) : DateUtils.toUtcMillis("1990-01-01"))
                    .setCalendarConstraints(new CalendarConstraints.Builder()
                            .setValidator(DateValidatorPointBackward.now()).build())
                    .build();
            picker.addOnPositiveButtonClickListener(sel -> { dob[0] = DateUtils.fromUtcMillis(sel); renderDob.run(); });
            picker.show(getChildFragmentManager(), "dob");
        });

        // Gán vai trò: chỉ khi có quyền roles.manage và đã tải được danh sách vai trò.
        Set<Integer> originalRoles = new HashSet<>();
        Set<Integer> selectedRoles = new HashSet<>();
        boolean showRoles = canAssignRoles && !roles.isEmpty();
        UiUtils.visible(f.layoutRoles, showRoles);
        if (showRoles) {
            for (Role r : roles) {
                boolean has = u.roles != null && u.roles.contains(r.name);
                if (has) { originalRoles.add(r.roleId); selectedRoles.add(r.roleId); }
                if (!r.isActive && !has) continue; // không gán thêm vai trò đã tắt
                Chip chip = new Chip(requireContext());
                chip.setText(r.name);
                chip.setCheckable(true);
                chip.setChecked(has);
                // Tự bỏ vai trò Admin của chính mình sẽ mất quyền quản trị ngay lập tức.
                if (self && SessionManager.ROLE_ADMIN.equals(r.name)) chip.setEnabled(false);
                chip.setOnCheckedChangeListener((c, checked) -> {
                    if (checked) selectedRoles.add(r.roleId); else selectedRoles.remove(r.roleId);
                });
                f.chipGroupRoles.addView(chip);
            }
            if (self) f.tvRoleNote.setText(R.string.role_self_note);
        }

        f.footer.btnSave.setOnClickListener(v -> {
            String name = String.valueOf(f.etFullName.getText()).trim();
            String phone = String.valueOf(f.etPhone.getText()).trim();
            f.tilFullName.setError(name.isEmpty() ? getString(R.string.err_required) : null);
            f.tilPhone.setError(!phone.isEmpty() && phone.length() < 9 ? getString(R.string.err_phone) : null);
            if (f.tilFullName.getError() != null || f.tilPhone.getError() != null) return;
            if (showRoles && selectedRoles.isEmpty()) { showError(f, getString(R.string.err_need_role)); return; }

            observe(f, repository.updateUser(u.userId, name, phone.isEmpty() ? null : phone, dob[0]), () -> {
                if (showRoles && !selectedRoles.equals(originalRoles)) {
                    observe(f, repository.setUserRoles(u.userId, new ArrayList<>(selectedRoles)), () -> done(dialog));
                } else {
                    done(dialog);
                }
            });
        });
        dialog.show();
    }

    @SuppressWarnings("unchecked")
    private void observe(SheetAccountFormBinding f, LiveData<? extends Resource<?>> call, Runnable onSuccess) {
        LiveData<Resource<Object>> live = (LiveData<Resource<Object>>) (LiveData<?>) call;
        SingleObserver.observe(getViewLifecycleOwner(), live, res -> {
            UiUtils.visible(f.footer.progress, res.isLoading());
            f.footer.btnSave.setEnabled(!res.isLoading());
            if (res.isError()) showError(f, res.message);
            if (res.isSuccess()) onSuccess.run();
        });
    }

    private void done(BottomSheetDialog dialog) {
        dialog.dismiss();
        UiUtils.toast(requireContext(), getString(R.string.account_saved));
        reload();
    }

    private static void showError(SheetAccountFormBinding f, String message) {
        UiUtils.visible(f.tvError, true);
        f.tvError.setText(message);
    }

    @Override protected int emptyIcon() { return R.drawable.ic_group; }
    @Override protected int emptyText() { return R.string.no_accounts; }
}
