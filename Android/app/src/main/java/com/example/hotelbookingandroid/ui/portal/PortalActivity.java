package com.example.hotelbookingandroid.ui.portal;

import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.fragment.app.Fragment;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.Formatters;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.data.model.auth.AuthResponse;
import com.example.hotelbookingandroid.data.repository.AuthRepository;
import com.example.hotelbookingandroid.databinding.ActivityPortalBinding;
import com.example.hotelbookingandroid.databinding.NavHeaderPortalBinding;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.util.List;

/** Khung chung cho Admin Portal và Staff Portal; nội dung là các Fragment theo {@link PortalSection}. */
public class PortalActivity extends AppCompatActivity {
    private static final String STATE_SECTION = "section";
    private static final int GROUP_SECTIONS = 1;
    private static final int GROUP_FOOTER = 2;
    private static final int ID_CUSTOMER_VIEW = 1000;
    private static final int ID_LOGOUT = 1001;

    private ActivityPortalBinding binding;
    private List<PortalSection> sections;
    private PortalSection current;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SessionManager session = SessionManager.get();
        if (!session.isPortalUser()) { // phiên hết hạn hoặc không còn quyền
            PortalRouter.openHome(this);
            finish();
            return;
        }
        binding = ActivityPortalBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        sections = PortalSection.available(session);
        bindHeader(session);
        buildMenu();

        binding.toolbar.setNavigationOnClickListener(v -> binding.drawerLayout.openDrawer(GravityCompat.START));
        binding.toolbar.inflateMenu(R.menu.portal_toolbar);
        binding.toolbar.setOnMenuItemClickListener(item -> {
            if (item.getItemId() == R.id.action_notifications) { show(PortalSection.NOTIFICATIONS); return true; }
            return false;
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (binding.drawerLayout.isDrawerOpen(GravityCompat.START)) {
                    binding.drawerLayout.closeDrawer(GravityCompat.START);
                } else if (!sections.isEmpty() && current != sections.get(0)) {
                    show(sections.get(0)); // quay về mục đầu tiên trước khi thoát app
                } else {
                    finish();
                }
            }
        });

        // Phiên bị thu hồi (refresh token hết hạn) -> về màn khách.
        session.loggedInState().observe(this, loggedIn -> {
            if (!Boolean.TRUE.equals(loggedIn)) PortalRouter.openHome(this);
        });

        PortalSection initial = sections.isEmpty() ? PortalSection.NOTIFICATIONS : sections.get(0);
        if (savedInstanceState != null) {
            initial = PortalSection.valueOf(savedInstanceState.getString(STATE_SECTION, initial.name()));
        }
        show(initial);
    }

    private void bindHeader(SessionManager session) {
        NavHeaderPortalBinding h = NavHeaderPortalBinding.bind(binding.navView.getHeaderView(0));
        AuthResponse auth = session.getAuth();
        h.tvPortalName.setText(session.isAdmin() ? R.string.admin_portal : R.string.staff_portal);
        h.tvRoles.setText(auth.roles != null && !auth.roles.isEmpty() ? String.join(", ", auth.roles) : "");
        h.tvPermissionCount.setText(getString(R.string.permission_count, auth.permissions != null ? auth.permissions.size() : 0));
        h.tvUserName.setText(auth.fullName);
        h.tvUserEmail.setText(auth.email);
        h.tvInitials.setText(Formatters.initials(auth.fullName, "NV"));
    }

    private void buildMenu() {
        Menu menu = binding.navView.getMenu();
        menu.clear();
        for (PortalSection s : sections) {
            menu.add(GROUP_SECTIONS, s.ordinal(), s.ordinal(), s.title).setIcon(s.icon).setCheckable(true);
        }
        menu.setGroupCheckable(GROUP_SECTIONS, true, true);
        menu.add(GROUP_FOOTER, ID_CUSTOMER_VIEW, 100, R.string.customer_view).setIcon(R.drawable.ic_storefront);
        menu.add(GROUP_FOOTER, ID_LOGOUT, 101, R.string.logout).setIcon(R.drawable.ic_logout);

        binding.navView.setNavigationItemSelectedListener(item -> {
            binding.drawerLayout.closeDrawer(GravityCompat.START);
            return onMenuItem(item);
        });
    }

    private boolean onMenuItem(MenuItem item) {
        if (item.getItemId() == ID_CUSTOMER_VIEW) {
            PortalRouter.openCustomerView(this);
            return false;
        }
        if (item.getItemId() == ID_LOGOUT) {
            confirmLogout();
            return false;
        }
        show(PortalSection.values()[item.getItemId()]);
        return true;
    }

    /** Giữ instance từng mục (show/hide) để không mất trạng thái khi chuyển qua lại. */
    public void show(PortalSection section) {
        current = section;
        binding.toolbar.setTitle(section.title);
        MenuItem item = binding.navView.getMenu().findItem(section.ordinal());
        if (item != null) item.setChecked(true);

        var fm = getSupportFragmentManager();
        var tx = fm.beginTransaction();
        for (Fragment f : fm.getFragments()) tx.hide(f);
        Fragment target = fm.findFragmentByTag(section.name());
        if (target == null) tx.add(R.id.portalContainer, section.createFragment(), section.name());
        else tx.show(target);
        tx.commit();
    }

    private void confirmLogout() {
        new MaterialAlertDialogBuilder(this)
                .setMessage(R.string.logout_confirm)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.logout, (d, w) -> new AuthRepository().logout())
                .show();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (current != null) outState.putString(STATE_SECTION, current.name());
    }

}
