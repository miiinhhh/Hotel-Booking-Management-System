package com.example.hotelbookingandroid.ui.portal.admin;

import android.app.Activity;
import android.content.Intent;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.AdminModels.Role;
import com.example.hotelbookingandroid.data.repository.AdminRepository;
import com.example.hotelbookingandroid.databinding.DialogAmenityFormBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.example.hotelbookingandroid.ui.portal.shared.PortalListFragment;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.ArrayList;
import java.util.List;

/** Vai trò & phân quyền: danh sách vai trò; chạm để sửa quyền; nút nổi tạo vai trò mới. */
public class RolesFragment extends PortalListFragment {
    private final AdminRepository repository = new AdminRepository();
    private LoadViewModel<List<Role>> viewModel;
    private BindingAdapter<Role, ItemPortalRowBinding> adapter;

    private final ActivityResultLauncher<Intent> detailLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), r -> {
                if (r.getResultCode() == Activity.RESULT_OK) reload();
            });

    @Override
    protected RecyclerView.Adapter<?> createAdapter() {
        adapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bind);
        return adapter;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void setup() {
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        enableFab(R.string.add_role, this::createRole);
        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            List<Role> list = res.data != null ? new ArrayList<>(res.data) : new ArrayList<>();
            // Vai trò hệ thống lên trước, sau đó theo tên.
            list.sort((a, b) -> a.isSystem != b.isSystem ? (a.isSystem ? -1 : 1) : a.name.compareToIgnoreCase(b.name));
            adapter.submit(list);
            int custom = 0;
            for (Role r : list) if (!r.isSystem) custom++;
            setSummary(getString(R.string.role_summary, list.size(), custom));
            showEmpty(list.isEmpty());
        });
        if (viewModel.needsInitialLoad()) reload();
    }

    @Override
    protected void reload() { viewModel.load(repository.roles()); }

    private void bind(ItemPortalRowBinding b, Role r, int pos) {
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(r.isSystem ? R.drawable.ic_lock : R.drawable.ic_badge);
        b.tvTitle.setText(r.name);
        UiUtils.visible(b.tvBadge, true);
        if (r.isSystem) {
            b.tvBadge.setText(R.string.system_role);
            PortalStyle.severity(b.tvBadge, false);
        } else {
            b.tvBadge.setText(r.isActive ? R.string.active : R.string.inactive);
            PortalStyle.active(b.tvBadge, r.isActive);
        }
        b.tvLine1.setText(r.description != null && !r.description.isEmpty() ? r.description : getString(R.string.no_description));
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(getString(R.string.role_meta, r.userCount, r.permissions != null ? r.permissions.size() : 0));
        UiUtils.visible(b.layoutFooter, false);
        UiUtils.visible(b.switchActive, false);
        b.getRoot().setAlpha(r.isActive ? 1f : 0.6f);
        b.getRoot().setOnClickListener(v -> detailLauncher.launch(RoleDetailActivity.intent(requireContext(), r)));
    }

    /** Tạo vai trò (tên + mô tả), rồi mở ngay màn phân quyền cho vai trò vừa tạo. */
    private void createRole() {
        DialogAmenityFormBinding d = DialogAmenityFormBinding.inflate(getLayoutInflater());
        d.tilName.setHint(R.string.role_name);
        androidx.appcompat.app.AlertDialog dialog = new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.add_role)
                .setMessage(R.string.add_role_hint)
                .setView(d.getRoot())
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.create, null)
                .create();
        dialog.setOnShowListener(x -> dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String name = String.valueOf(d.etName.getText()).trim();
            String desc = String.valueOf(d.etDescription.getText()).trim();
            if (name.isEmpty()) { d.tilName.setError(getString(R.string.err_required)); return; }
            SingleObserver.observe(getViewLifecycleOwner(), repository.createRole(name, desc.isEmpty() ? null : desc), res -> {
                if (res.isError()) d.tilName.setError(res.message);
                if (res.isSuccess() && res.data != null) {
                    dialog.dismiss();
                    reload();
                    detailLauncher.launch(RoleDetailActivity.intent(requireContext(), res.data));
                }
            });
        }));
        dialog.show();
    }

    @Override protected int emptyIcon() { return R.drawable.ic_badge; }
    @Override protected int emptyText() { return R.string.no_roles; }
}
