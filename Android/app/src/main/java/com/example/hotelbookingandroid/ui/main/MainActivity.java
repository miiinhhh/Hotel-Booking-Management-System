package com.example.hotelbookingandroid.ui.main;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.ui.portal.PortalRouter;
import com.example.hotelbookingandroid.databinding.ActivityMainBinding;
import com.example.hotelbookingandroid.ui.account.AccountFragment;
import com.example.hotelbookingandroid.ui.booking.list.BookingsFragment;
import com.example.hotelbookingandroid.ui.home.HomeFragment;
import com.example.hotelbookingandroid.ui.offers.OffersFragment;

/** Màn hình chính: 4 tab dưới cùng (Khám phá, Đơn của tôi, Ưu đãi, Tài khoản). */
public class MainActivity extends AppCompatActivity {
    private static final String TAG_PREFIX = "tab_";
    public static final String EXTRA_STAY_CUSTOMER = "stayCustomer";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Tài khoản Admin/Staff mở app -> vào thẳng Portal.
        if (!getIntent().getBooleanExtra(EXTRA_STAY_CUSTOMER, false) && SessionManager.get().isPortalUser()) {
            PortalRouter.openHome(this);
            finish();
            return;
        }
        ActivityMainBinding binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.bottomNav.setOnItemSelectedListener(item -> {
            showTab(item.getItemId());
            return true;
        });
        if (savedInstanceState == null) binding.bottomNav.setSelectedItemId(R.id.nav_home);
    }

    /** Giữ instance từng tab bằng show/hide để không mất trạng thái khi chuyển tab. */
    private void showTab(int itemId) {
        String tag = TAG_PREFIX + itemId;
        var fm = getSupportFragmentManager();
        var tx = fm.beginTransaction();
        for (Fragment f : fm.getFragments()) tx.hide(f);
        Fragment target = fm.findFragmentByTag(tag);
        if (target == null) {
            target = createTab(itemId);
            tx.add(R.id.fragmentContainer, target, tag);
        } else {
            tx.show(target);
        }
        tx.commit();
    }

    private Fragment createTab(int itemId) {
        if (itemId == R.id.nav_bookings) return new BookingsFragment();
        if (itemId == R.id.nav_offers) return new OffersFragment();
        if (itemId == R.id.nav_account) return new AccountFragment();
        return new HomeFragment();
    }
}
