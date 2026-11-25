package com.example.hotelbookingandroid.ui.portal.shared;

import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.DrawableRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.databinding.FragmentPortalListBinding;
import com.google.android.material.chip.Chip;

import java.util.function.Consumer;

/**
 * Lớp cơ sở cho các màn danh sách trong Portal: kéo để tải lại, trạng thái rỗng,
 * và các bộ lọc tùy chọn (tìm kiếm, chip, dropdown). Lớp con chỉ cần cấu hình và gọi {@link #render}.
 */
public abstract class PortalListFragment extends Fragment {
    protected FragmentPortalListBinding binding;

    @Nullable
    @Override
    public final View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentPortalListBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public final void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        binding.recycler.setLayoutManager(new LinearLayoutManager(requireContext()));
        binding.recycler.setAdapter(createAdapter());
        binding.swipeRefresh.setOnRefreshListener(this::reload);
        binding.ivEmpty.setImageResource(emptyIcon());
        binding.tvEmpty.setText(emptyText());
        setup();
    }

    protected abstract RecyclerView.Adapter<?> createAdapter();
    /** Cấu hình bộ lọc + bắt đầu quan sát dữ liệu. */
    protected abstract void setup();
    protected abstract void reload();
    @DrawableRes protected abstract int emptyIcon();
    @StringRes protected abstract int emptyText();

    /** Cập nhật vòng tải, thông báo lỗi; trả về true khi có dữ liệu thành công. */
    protected boolean handle(Resource<?> res) {
        binding.swipeRefresh.setRefreshing(res.isLoading());
        if (res.isError()) UiUtils.toast(requireContext(), res.message);
        return res.isSuccess();
    }

    protected void showEmpty(boolean empty) {
        UiUtils.visible(binding.emptyView, empty);
    }

    protected void setSummary(CharSequence text) {
        UiUtils.visible(binding.tvSummary, text != null && text.length() > 0);
        binding.tvSummary.setText(text);
    }

    protected void enableSearch(@StringRes int hint, Consumer<String> onChange) {
        UiUtils.visible(binding.tilSearch, true);
        binding.tilSearch.setHint(hint);
        binding.etSearch.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) { }
            @Override public void afterTextChanged(Editable s) { onChange.accept(s.toString().trim()); }
        });
    }

    /** Hiện nút nổi (vd. "Thêm vai trò"). */
    protected void enableFab(@StringRes int text, Runnable onClick) {
        UiUtils.visible(binding.fab, true);
        binding.fab.setText(text);
        binding.fab.setOnClickListener(v -> onClick.run());
    }

    /** Thêm các chip lọc; chip đầu tiên được chọn sẵn. Callback nhận vị trí chip. */
    protected void enableChips(int[] labels, Consumer<Integer> onSelect) {
        UiUtils.visible(binding.scrollChips, true);
        binding.chipGroup.removeAllViews();
        for (int i = 0; i < labels.length; i++) {
            Chip chip = new Chip(requireContext());
            chip.setId(View.generateViewId());
            chip.setText(labels[i]);
            chip.setCheckable(true);
            chip.setTag(i);
            if (i == 0) chip.setChecked(true);
            binding.chipGroup.addView(chip);
        }
        binding.chipGroup.setOnCheckedStateChangeListener((group, ids) -> {
            if (ids.isEmpty()) return;
            Object tag = group.findViewById(ids.get(0)).getTag();
            onSelect.accept((Integer) tag);
        });
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
