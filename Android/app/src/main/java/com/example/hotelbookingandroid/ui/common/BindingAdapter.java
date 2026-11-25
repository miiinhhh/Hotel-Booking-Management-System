package com.example.hotelbookingandroid.ui.common;

import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;
import androidx.viewbinding.ViewBinding;

import java.util.ArrayList;
import java.util.List;

/**
 * Adapter dùng chung: chỉ cần truyền hàm inflate ViewBinding và hàm bind dữ liệu.
 * Ví dụ: new BindingAdapter<>(ItemCustomerBinding::inflate, (b, item, pos) -> b.tvName.setText(item.name));
 */
public class BindingAdapter<T, B extends ViewBinding> extends RecyclerView.Adapter<BindingAdapter.Holder<B>> {

    public interface Inflate<B> { B inflate(LayoutInflater inflater, ViewGroup parent, boolean attach); }
    public interface Bind<T, B> { void bind(B binding, T item, int position); }

    private final Inflate<B> inflate;
    private final Bind<T, B> bind;
    private final List<T> items = new ArrayList<>();

    public BindingAdapter(Inflate<B> inflate, Bind<T, B> bind) {
        this.inflate = inflate;
        this.bind = bind;
    }

    public void submit(List<T> list) {
        items.clear();
        if (list != null) items.addAll(list);
        notifyDataSetChanged();
    }

    public List<T> items() { return items; }

    @NonNull
    @Override
    public Holder<B> onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new Holder<>(inflate.inflate(LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull Holder<B> holder, int position) {
        bind.bind(holder.binding, items.get(position), position);
    }

    @Override
    public int getItemCount() { return items.size(); }

    public static class Holder<B extends ViewBinding> extends RecyclerView.ViewHolder {
        public final B binding;
        Holder(B binding) { super(binding.getRoot()); this.binding = binding; }
    }
}
