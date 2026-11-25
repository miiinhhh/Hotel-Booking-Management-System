package com.example.hotelbookingandroid.ui.portal.admin;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.Menu;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.lifecycle.LiveData;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.AdminModels.Permission;
import com.example.hotelbookingandroid.data.model.portal.AdminModels.Role;
import com.example.hotelbookingandroid.data.repository.AdminRepository;
import com.example.hotelbookingandroid.databinding.ActivityRoleDetailBinding;
import com.example.hotelbookingandroid.databinding.ItemPermissionBinding;
import com.example.hotelbookingandroid.databinding.ItemPermissionGroupBinding;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Chi tiết vai trò (tương đương AdminRoles của web): sửa tên/mô tả/trạng thái và tick quyền theo nhóm.
 * Vai trò hệ thống không đổi tên / không xóa; vai trò Admin luôn có toàn quyền nên khóa phần quyền.
 */
public class RoleDetailActivity extends AppCompatActivity {
    private static final String EXTRA_ROLE = "role";
    private static final int MENU_DELETE = 1;

    private ActivityRoleDetailBinding binding;
    private final AdminRepository repository = new AdminRepository();
    private Role role;
    private final Set<String> originalPermissions = new HashSet<>();
    private final Set<String> selected = new HashSet<>();
    private final List<Runnable> groupRefreshers = new ArrayList<>();
    private int totalPermissions;
    private boolean permissionsLocked;

    public static Intent intent(Context ctx, Role role) {
        return new Intent(ctx, RoleDetailActivity.class).putExtra(EXTRA_ROLE, role);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityRoleDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        role = (Role) getIntent().getSerializableExtra(EXTRA_ROLE);
        if (role.permissions != null) { originalPermissions.addAll(role.permissions); selected.addAll(role.permissions); }
        permissionsLocked = SessionManager.ROLE_ADMIN.equals(role.name);

        binding.toolbar.setTitle(role.name);
        binding.toolbar.setSubtitle(role.isSystem ? getString(R.string.system_role) : getString(R.string.custom_role));
        binding.toolbar.setNavigationOnClickListener(v -> attemptExit());
        if (!role.isSystem) {
            binding.toolbar.getMenu().add(Menu.NONE, MENU_DELETE, 0, R.string.delete_role);
            binding.toolbar.setOnMenuItemClickListener(item -> {
                if (item.getItemId() == MENU_DELETE) confirmDelete();
                return true;
            });
        }
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { attemptExit(); }
        });

        binding.etName.setText(role.name);
        binding.etDescription.setText(role.description);
        binding.switchActive.setChecked(role.isActive);
        // Vai trò hệ thống: giữ nguyên tên và luôn bật.
        binding.etName.setEnabled(!role.isSystem);
        binding.switchActive.setEnabled(!role.isSystem);
        binding.tvRoleMeta.setText(getString(R.string.role_users, role.userCount));
        if (permissionsLocked) {
            UiUtils.visible(binding.tvPermissionNote, true);
            binding.tvPermissionNote.setText(R.string.admin_role_locked);
        }

        TextWatcher watcher = new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { renderDirty(); }
        };
        binding.etName.addTextChangedListener(watcher);
        binding.etDescription.addTextChangedListener(watcher);
        binding.switchActive.setOnCheckedChangeListener((sw, c) -> renderDirty());
        binding.btnSave.setOnClickListener(v -> save());

        loadPermissions();
    }

    // ===================== Ma trận quyền =====================

    private void loadPermissions() {
        SingleObserver.observe(this, repository.permissions(), res -> {
            UiUtils.visible(binding.progressPermissions, res.isLoading());
            if (res.isError()) showError(res.message);
            if (!res.isSuccess() || res.data == null) return;
            buildGroups(res.data);
        });
    }

    private void buildGroups(List<Permission> permissions) {
        Map<String, List<Permission>> groups = new LinkedHashMap<>();
        for (Permission p : permissions) {
            String g = p.group != null && !p.group.isEmpty() ? p.group : getString(R.string.other_group);
            groups.computeIfAbsent(g, k -> new ArrayList<>()).add(p);
        }
        totalPermissions = permissions.size();
        binding.layoutGroups.removeAllViews();
        groupRefreshers.clear();

        for (Map.Entry<String, List<Permission>> entry : groups.entrySet()) {
            ItemPermissionGroupBinding g = ItemPermissionGroupBinding.inflate(getLayoutInflater(), binding.layoutGroups, false);
            g.tvGroup.setText(entry.getKey());
            List<ItemPermissionBinding> rows = new ArrayList<>();
            for (Permission p : entry.getValue()) {
                ItemPermissionBinding row = ItemPermissionBinding.inflate(getLayoutInflater(), g.layoutItems, false);
                row.tvName.setText(p.name);
                row.tvCode.setText(p.code);
                UiUtils.visible(row.tvDescription, p.description != null && !p.description.isEmpty());
                row.tvDescription.setText(p.description);
                row.cb.setChecked(permissionsLocked || selected.contains(p.code));
                row.getRoot().setEnabled(!permissionsLocked);
                row.cb.setEnabled(!permissionsLocked);
                row.getRoot().setOnClickListener(v -> {
                    if (!selected.remove(p.code)) selected.add(p.code);
                    row.cb.setChecked(selected.contains(p.code));
                    refreshAll();
                });
                rows.add(row);
                g.layoutItems.addView(row.getRoot());
            }

            List<Permission> items = entry.getValue();
            Runnable refresh = () -> {
                int on = 0;
                for (Permission p : items) if (permissionsLocked || selected.contains(p.code)) on++;
                g.tvGroupCount.setText(getString(R.string.fraction, on, items.size()));
                g.cbGroup.setOnCheckedChangeListener(null);
                g.cbGroup.setChecked(on == items.size());
                g.cbGroup.setOnCheckedChangeListener((cb, checked) -> {
                    // Chọn / bỏ cả nhóm.
                    for (int i = 0; i < items.size(); i++) {
                        if (checked) selected.add(items.get(i).code); else selected.remove(items.get(i).code);
                        rows.get(i).cb.setChecked(checked);
                    }
                    refreshAll();
                });
            };
            g.cbGroup.setEnabled(!permissionsLocked);
            groupRefreshers.add(refresh);
            binding.layoutGroups.addView(g.getRoot());
        }
        refreshAll();
    }

    private void refreshAll() {
        for (Runnable r : groupRefreshers) r.run();
        int count = permissionsLocked ? totalPermissions : selected.size();
        binding.tvPermissionCount.setText(getString(R.string.fraction, count, totalPermissions));
        renderDirty();
    }

    // ===================== Lưu =====================

    private boolean infoChanged() {
        return !String.valueOf(binding.etName.getText()).trim().equals(role.name)
                || !Objects.equals(nullable(String.valueOf(binding.etDescription.getText()).trim()), nullable(role.description))
                || binding.switchActive.isChecked() != role.isActive;
    }

    private boolean permissionsChanged() {
        return !permissionsLocked && !selected.equals(originalPermissions);
    }

    private void renderDirty() {
        boolean dirty = infoChanged() || permissionsChanged();
        binding.btnSave.setEnabled(dirty);
        if (!dirty) { binding.tvDirty.setText(R.string.no_changes); return; }
        int added = 0, removed = 0;
        for (String s : selected) if (!originalPermissions.contains(s)) added++;
        for (String s : originalPermissions) if (!selected.contains(s)) removed++;
        binding.tvDirty.setText(permissionsChanged() ? getString(R.string.permission_diff, added, removed)
                : getString(R.string.unsaved_changes));
    }

    private void save() {
        String name = String.valueOf(binding.etName.getText()).trim();
        if (name.isEmpty()) { binding.tilName.setError(getString(R.string.err_required)); return; }
        binding.tilName.setError(null);
        UiUtils.visible(binding.tvError, false);
        if (infoChanged()) {
            run(repository.updateRole(role.roleId, name, nullable(String.valueOf(binding.etDescription.getText()).trim()),
                    binding.switchActive.isChecked()), () -> {
                role.name = name;
                role.description = nullable(String.valueOf(binding.etDescription.getText()).trim());
                role.isActive = binding.switchActive.isChecked();
                binding.toolbar.setTitle(name);
                savePermissions();
            });
        } else {
            savePermissions();
        }
    }

    private void savePermissions() {
        if (!permissionsChanged()) { saved(); return; }
        run(repository.setRolePermissions(role.roleId, new ArrayList<>(selected)), () -> {
            originalPermissions.clear();
            originalPermissions.addAll(selected);
            saved();
        });
    }

    private void saved() {
        setResult(RESULT_OK);
        UiUtils.toast(this, getString(R.string.role_saved));
        renderDirty();
    }

    @SuppressWarnings("unchecked")
    private void run(LiveData<? extends Resource<?>> call, Runnable onSuccess) {
        LiveData<Resource<Object>> live = (LiveData<Resource<Object>>) (LiveData<?>) call;
        SingleObserver.observe(this, live, res -> {
            UiUtils.visible(binding.progressSave, res.isLoading());
            binding.btnSave.setEnabled(!res.isLoading());
            if (res.isError()) { showError(res.message); renderDirty(); }
            if (res.isSuccess()) onSuccess.run();
        });
    }

    private void confirmDelete() {
        new MaterialAlertDialogBuilder(this)
                .setTitle(R.string.delete_role)
                .setMessage(role.userCount > 0
                        ? getString(R.string.confirm_delete_role_users, role.name, role.userCount)
                        : getString(R.string.confirm_delete_role, role.name))
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.delete, (d, w) -> run(repository.deleteRole(role.roleId), () -> {
                    UiUtils.toast(this, getString(R.string.role_deleted));
                    setResult(RESULT_OK);
                    finish();
                }))
                .show();
    }

    /** Hỏi trước khi thoát nếu còn thay đổi chưa lưu. */
    private void attemptExit() {
        if (!binding.btnSave.isEnabled()) { finish(); return; }
        new MaterialAlertDialogBuilder(this)
                .setMessage(R.string.discard_changes)
                .setNegativeButton(R.string.stay, null)
                .setPositiveButton(R.string.discard, (d, w) -> finish())
                .show();
    }

    private void showError(String message) {
        UiUtils.visible(binding.tvError, true);
        binding.tvError.setText(message);
    }

    private static String nullable(String s) {
        return s == null || s.isEmpty() ? null : s;
    }
}
