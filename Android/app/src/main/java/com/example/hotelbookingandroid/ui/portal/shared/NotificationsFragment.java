package com.example.hotelbookingandroid.ui.portal.shared;

import android.graphics.Typeface;

import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.PortalModels.Notification;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.LoadViewModel;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;

import java.util.ArrayList;
import java.util.List;

/** Thông báo công việc: chưa đọc in đậm; chạm để đánh dấu đã đọc, có nút "Đọc tất cả". */
public class NotificationsFragment extends PortalListFragment {
    private static final int FILTER_ALL = 0;
    private static final int FILTER_UNREAD = 1;

    private final PortalRepository repository = new PortalRepository();
    private LoadViewModel<List<Notification>> viewModel;
    private BindingAdapter<Notification, ItemPortalRowBinding> adapter;
    private List<Notification> all = new ArrayList<>();
    private int filter = FILTER_ALL;

    @Override
    protected RecyclerView.Adapter<?> createAdapter() {
        adapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bind);
        return adapter;
    }

    @SuppressWarnings("unchecked")
    @Override
    protected void setup() {
        viewModel = new ViewModelProvider(this).get(LoadViewModel.class);
        enableChips(new int[]{R.string.status_all, R.string.unread}, i -> { filter = i; apply(); });
        binding.tvSummary.setOnClickListener(v -> markAllRead());
        viewModel.data().observe(getViewLifecycleOwner(), res -> {
            if (!handle(res)) return;
            all = res.data != null ? res.data : new ArrayList<>();
            apply();
        });
        if (viewModel.needsInitialLoad()) reload();
    }

    @Override
    protected void reload() { viewModel.load(repository.notifications()); }

    private void apply() {
        List<Notification> list = new ArrayList<>();
        int unread = 0;
        for (Notification n : all) {
            if (!n.isRead) unread++;
            if (filter == FILTER_ALL || !n.isRead) list.add(n);
        }
        adapter.submit(list);
        setSummary(unread > 0 ? getString(R.string.unread_summary, unread) : getString(R.string.all_read));
        binding.tvSummary.setTextColor(getResources().getColor(unread > 0 ? R.color.md_primary : R.color.text_secondary, null));
        showEmpty(list.isEmpty());
    }

    private void bind(ItemPortalRowBinding b, Notification n, int pos) {
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(R.drawable.ic_notifications);
        b.ivAvatar.setAlpha(n.isRead ? 0.5f : 1f);
        b.tvTitle.setText(n.title);
        b.tvTitle.setTypeface(null, n.isRead ? Typeface.NORMAL : Typeface.BOLD);
        b.tvLine1.setText(n.description);
        UiUtils.visible(b.tvLine2, true);
        b.tvLine2.setText(n.occurredAt != null ? DateUtils.display(n.occurredAt) + " " + time(n.occurredAt) : "");

        // Badge: "Cần xử lý" (Admin, severity=action) ưu tiên hơn "Mới" (chưa đọc).
        boolean isAction = "action".equals(n.severity);
        UiUtils.visible(b.tvBadge, isAction || !n.isRead);
        b.tvBadge.setText(isAction ? R.string.needs_action : R.string.new_label);
        PortalStyle.severity(b.tvBadge, isAction);

        b.getRoot().setOnClickListener(v -> {
            if (n.isRead) return;
            n.isRead = true;
            List<String> keys = new ArrayList<>();
            keys.add(n.id);
            repository.markRead(keys);
            apply();
        });
    }

    private void markAllRead() {
        List<String> keys = new ArrayList<>();
        for (Notification n : all) if (!n.isRead) { keys.add(n.id); n.isRead = true; }
        if (keys.isEmpty()) return;
        repository.markRead(keys.size() > 200 ? keys.subList(0, 200) : keys);
        apply();
    }

    /** "2026-11-20T08:30:00Z" -> "08:30" */
    private static String time(String iso) {
        return iso.length() >= 16 ? iso.substring(11, 16) : "";
    }

    @Override protected int emptyIcon() { return R.drawable.ic_notifications; }
    @Override protected int emptyText() { return R.string.no_notifications; }
}
