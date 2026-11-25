package com.example.hotelbookingandroid.ui.portal;

import androidx.annotation.DrawableRes;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.ui.portal.admin.AccountsFragment;
import com.example.hotelbookingandroid.ui.portal.admin.AdminOverviewFragment;
import com.example.hotelbookingandroid.ui.portal.admin.RolesFragment;
import com.example.hotelbookingandroid.ui.portal.admin.ContentFragment;
import com.example.hotelbookingandroid.ui.portal.admin.PricingFragment;
import com.example.hotelbookingandroid.ui.portal.admin.StaffAccountsFragment;
import com.example.hotelbookingandroid.ui.portal.admin.VouchersFragment;
import com.example.hotelbookingandroid.ui.portal.bookings.PortalBookingsFragment;
import com.example.hotelbookingandroid.ui.portal.calendar.CalendarFragment;
import com.example.hotelbookingandroid.ui.portal.inventory.InventoryFragment;
import com.example.hotelbookingandroid.ui.portal.shared.CustomersFragment;
import com.example.hotelbookingandroid.ui.portal.shared.NotificationsFragment;
import com.example.hotelbookingandroid.ui.portal.shared.ReviewModerationFragment;

import java.util.ArrayList;
import java.util.List;

/**
 * Các mục menu Portal — tương đương ADMIN_NAVIGATION / STAFF_NAVIGATION của web.
 * Mỗi mục khai báo cổng hiển thị và quyền tối thiểu; menu chỉ hiện mục người dùng được phép.
 */
public enum PortalSection {
    OVERVIEW(R.string.section_overview, R.drawable.ic_dashboard, Audience.ADMIN, Permissions.REPORTS_VIEW),
    BOOKINGS(R.string.section_bookings, R.drawable.ic_booking, Audience.BOTH, Permissions.BOOKING_VIEW, Permissions.PAYMENT_VIEW),
    CALENDAR(R.string.section_calendar, R.drawable.ic_lock, Audience.BOTH, Permissions.INVENTORY_VIEW),
    INVENTORY(R.string.section_inventory, R.drawable.ic_apartment, Audience.BOTH,
            Permissions.HOTEL_MANAGE, Permissions.AREA_MANAGE, Permissions.ROOM_MANAGE, Permissions.INVENTORY_VIEW),
    CUSTOMERS(R.string.section_customers, R.drawable.ic_group, Audience.STAFF, Permissions.BOOKING_VIEW),
    CONTENT(R.string.section_content, R.drawable.ic_photo, Audience.ADMIN, Permissions.CONTENT_MANAGE),
    PRICING(R.string.section_pricing, R.drawable.ic_price, Audience.ADMIN, Permissions.PRICING_VIEW),
    VOUCHERS(R.string.section_vouchers, R.drawable.ic_offer, Audience.ADMIN, Permissions.VOUCHER_VIEW),
    REVIEWS(R.string.section_reviews, R.drawable.ic_star, Audience.BOTH, Permissions.REVIEWS_MANAGE),
    STAFF(R.string.section_staff, R.drawable.ic_badge, Audience.ADMIN, Permissions.STAFF_VIEW),
    ACCOUNTS(R.string.section_accounts, R.drawable.ic_group, Audience.ADMIN, Permissions.ACCOUNTS_MANAGE),
    ROLES(R.string.section_roles, R.drawable.ic_lock, Audience.ADMIN, Permissions.ROLES_MANAGE),
    NOTIFICATIONS(R.string.notifications, R.drawable.ic_notifications, Audience.BOTH);

    enum Audience { ADMIN, STAFF, BOTH }

    @StringRes public final int title;
    @DrawableRes public final int icon;
    private final Audience audience;
    private final String[] permissions;

    PortalSection(int title, int icon, Audience audience, String... permissions) {
        this.title = title;
        this.icon = icon;
        this.audience = audience;
        this.permissions = permissions;
    }

    public Fragment createFragment() {
        switch (this) {
            case OVERVIEW: return new AdminOverviewFragment();
            case CALENDAR: return new CalendarFragment();
            case INVENTORY: return new InventoryFragment();
            case CUSTOMERS: return new CustomersFragment();
            case CONTENT: return new ContentFragment();
            case PRICING: return new PricingFragment();
            case VOUCHERS: return new VouchersFragment();
            case REVIEWS: return new ReviewModerationFragment();
            case STAFF: return new StaffAccountsFragment();
            case ACCOUNTS: return new AccountsFragment();
            case ROLES: return new RolesFragment();
            case NOTIFICATIONS: return new NotificationsFragment();
            default: return new PortalBookingsFragment();
        }
    }

    private boolean visibleFor(SessionManager s) {
        boolean audienceOk = audience == Audience.BOTH
                || (audience == Audience.ADMIN && s.isAdmin())
                || (audience == Audience.STAFF && !s.isAdmin());
        return audienceOk && s.hasAnyPermission(permissions);
    }

    public static List<PortalSection> available(SessionManager s) {
        List<PortalSection> list = new ArrayList<>();
        for (PortalSection section : values()) if (section.visibleFor(s)) list.add(section);
        return list;
    }
}
