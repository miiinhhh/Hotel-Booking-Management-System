package com.example.hotelbookingandroid.ui.portal.admin;

import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.PopupMenu;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.bumptech.glide.Glide;
import com.example.hotelbookingandroid.R;
import com.example.hotelbookingandroid.core.network.ApiClient;
import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.core.session.Permissions;
import com.example.hotelbookingandroid.core.session.SessionManager;
import com.example.hotelbookingandroid.core.util.DateUtils;
import com.example.hotelbookingandroid.core.util.UiUtils;
import com.example.hotelbookingandroid.data.model.portal.ContentModels;
import com.example.hotelbookingandroid.data.model.portal.ContentModels.Amenity;
import com.example.hotelbookingandroid.data.model.portal.ContentModels.Image;
import com.example.hotelbookingandroid.data.model.portal.ContentModels.Scope;
import com.example.hotelbookingandroid.data.model.portal.PortalModels;
import com.example.hotelbookingandroid.data.repository.ContentRepository;
import com.example.hotelbookingandroid.data.repository.PortalRepository;
import com.example.hotelbookingandroid.databinding.DialogAmenityFormBinding;
import com.example.hotelbookingandroid.databinding.FragmentContentBinding;
import com.example.hotelbookingandroid.databinding.ItemContentImageBinding;
import com.example.hotelbookingandroid.databinding.ItemPortalRowBinding;
import com.example.hotelbookingandroid.ui.common.BindingAdapter;
import com.example.hotelbookingandroid.ui.common.SingleObserver;
import com.example.hotelbookingandroid.ui.portal.PortalStyle;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Tiện ích & hình ảnh (tương đương AdminContent của web).
 * Phạm vi: toàn khách sạn, hoặc một phòng thuộc hạng phòng; có thể áp dụng tải ảnh / gán tiện ích cho cả hạng.
 */
public class ContentFragment extends Fragment {
    private static final long MAX_UPLOAD_BYTES = 6L * 1024 * 1024; // giới hạn của Backend
    private static final int MENU_PRIMARY = 1, MENU_UP = 2, MENU_DOWN = 3, MENU_DELETE = 4, MENU_VIEW = 5;

    private FragmentContentBinding binding;
    private final PortalRepository portalRepository = new PortalRepository();
    private final ContentRepository repository = new ContentRepository();
    private BindingAdapter<Image, ItemContentImageBinding> imageAdapter;
    private BindingAdapter<Amenity, ItemPortalRowBinding> amenityAdapter;

    private final List<PortalModels.HotelSummary> hotels = new ArrayList<>();
    private final List<PortalModels.RoomType> roomTypes = new ArrayList<>();
    private final List<PortalModels.Room> rooms = new ArrayList<>();
    private List<PortalModels.Room> typeRooms = new ArrayList<>();
    private final List<Amenity> catalog = new ArrayList<>();
    private final Set<Integer> linkedIds = new HashSet<>();
    private List<Image> images = new ArrayList<>();

    private int hotelId;
    /** 0 = toàn khách sạn; i > 0 = roomTypes.get(i - 1). */
    private int scopeIndex;
    private Long roomId;
    private boolean imagesTab = true;
    private boolean canManage;

    private final ActivityResultLauncher<String> pickImages = registerForActivityResult(
            new ActivityResultContracts.GetMultipleContents(), this::uploadAll);

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle state) {
        binding = FragmentContentBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        canManage = SessionManager.get().hasAnyPermission(Permissions.CONTENT_MANAGE);
        imageAdapter = new BindingAdapter<>(ItemContentImageBinding::inflate, this::bindImage);
        amenityAdapter = new BindingAdapter<>(ItemPortalRowBinding::inflate, this::bindAmenity);
        binding.swipeRefresh.setOnRefreshListener(this::loadScope);

        binding.dropdownHotel.setOnItemClickListener((p, v, pos, id) -> {
            hotelId = hotels.get(pos).hotelId;
            loadHotelData();
        });
        binding.dropdownScope.setOnItemClickListener((p, v, pos, id) -> { scopeIndex = pos; onScopeTypeChanged(); });
        binding.dropdownRoom.setOnItemClickListener((p, v, pos, id) -> { roomId = typeRooms.get(pos).roomId; loadScope(); });
        binding.switchApplyType.setOnCheckedChangeListener((sw, checked) -> renderSummary());
        binding.toggleTab.addOnButtonCheckedListener((g, id, checked) -> {
            if (!checked) return;
            imagesTab = id == R.id.btnTabImages;
            renderTab();
        });
        binding.fab.setOnClickListener(v -> {
            if (imagesTab) pickImages.launch("image/*");
            else openAmenityForm(null);
        });

        loadHotels();
        loadCatalog();
        renderTab();
    }

    // ===================== Phạm vi =====================

    private Scope scope() {
        if (hotelId == 0) return null;
        if (scopeIndex == 0) return new Scope(hotelId, null);
        return roomId != null ? new Scope(hotelId, roomId) : null;
    }

    /** Phạm vi thực sự nhận thao tác: một phòng, hoặc mọi phòng cùng hạng khi bật "áp dụng cho cả hạng". */
    private List<Scope> targets() {
        Scope s = scope();
        List<Scope> list = new ArrayList<>();
        if (s == null) return list;
        if (scopeIndex > 0 && binding.switchApplyType.isChecked()) {
            for (PortalModels.Room r : typeRooms) list.add(new Scope(hotelId, r.roomId));
        } else {
            list.add(s);
        }
        return list;
    }

    private void loadHotels() {
        SingleObserver.observe(getViewLifecycleOwner(), portalRepository.hotels(), res -> {
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (!res.isSuccess() || res.data == null || res.data.items == null) return;
            hotels.clear();
            hotels.addAll(res.data.items);
            List<String> names = new ArrayList<>();
            for (PortalModels.HotelSummary h : hotels) names.add(h.hotelName);
            binding.dropdownHotel.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, names));
            UiUtils.visible(binding.tilHotel, hotels.size() > 1);
            if (!hotels.isEmpty() && hotelId == 0) {
                hotelId = hotels.get(0).hotelId;
                binding.dropdownHotel.setText(names.get(0), false);
                loadHotelData();
            }
        });
    }

    /** Hạng phòng + phòng của khách sạn để dựng bộ chọn phạm vi. */
    private void loadHotelData() {
        scopeIndex = 0;
        roomId = null;
        SingleObserver.observe(getViewLifecycleOwner(), portalRepository.roomTypes(hotelId), res -> {
            if (!res.isSuccess() || res.data == null) return;
            roomTypes.clear();
            for (PortalModels.RoomType t : res.data) if (t.isActive) roomTypes.add(t);
            List<String> labels = new ArrayList<>();
            labels.add(getString(R.string.scope_hotel));
            for (PortalModels.RoomType t : roomTypes) labels.add(t.name);
            binding.dropdownScope.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, labels));
            binding.dropdownScope.setText(labels.get(0), false);
            onScopeTypeChanged();
        });
        SingleObserver.observe(getViewLifecycleOwner(), portalRepository.rooms(hotelId), res -> {
            if (!res.isSuccess() || res.data == null) return;
            rooms.clear();
            for (PortalModels.Room r : res.data) if (r.isActive) rooms.add(r);
            if (scopeIndex > 0) onScopeTypeChanged();
        });
    }

    private void onScopeTypeChanged() {
        boolean typeScope = scopeIndex > 0;
        UiUtils.visible(binding.tilRoom, typeScope);
        UiUtils.visible(binding.switchApplyType, typeScope && canManage);
        roomId = null;
        typeRooms = new ArrayList<>();
        if (typeScope) {
            int typeId = roomTypes.get(scopeIndex - 1).roomTypeId;
            for (PortalModels.Room r : rooms) if (r.roomTypeId == typeId) typeRooms.add(r);
            typeRooms.sort((a, b) -> a.roomNumber.compareTo(b.roomNumber));
            List<String> labels = new ArrayList<>();
            for (PortalModels.Room r : typeRooms) labels.add(getString(R.string.room_value, r.roomNumber));
            binding.dropdownRoom.setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_list_item_1, labels));
            if (!typeRooms.isEmpty()) {
                roomId = typeRooms.get(0).roomId;
                binding.dropdownRoom.setText(labels.get(0), false);
            } else {
                binding.dropdownRoom.setText("", false);
            }
        }
        loadScope();
    }

    // ===================== Tải dữ liệu =====================

    private void loadCatalog() {
        SingleObserver.observe(getViewLifecycleOwner(), repository.catalog(), res -> {
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (!res.isSuccess() || res.data == null) return;
            catalog.clear();
            catalog.addAll(res.data);
            catalog.sort((a, b) -> a.name.compareToIgnoreCase(b.name));
            if (!imagesTab) render();
        });
    }

    private void loadScope() {
        Scope s = scope();
        if (s == null) {
            images = new ArrayList<>();
            linkedIds.clear();
            binding.swipeRefresh.setRefreshing(false);
            render();
            return;
        }
        SingleObserver.observe(getViewLifecycleOwner(), repository.images(s), res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (!res.isSuccess() || res.data == null) return;
            images = new ArrayList<>(res.data);
            images.sort((a, b) -> Integer.compare(a.displayOrder, b.displayOrder));
            render();
        });
        SingleObserver.observe(getViewLifecycleOwner(), repository.linkedAmenities(s), res -> {
            if (!res.isSuccess() || res.data == null) return;
            linkedIds.clear();
            for (Amenity a : res.data) linkedIds.add(a.amenityId);
            render();
        });
    }

    // ===================== Hiển thị =====================

    private void renderTab() {
        if (imagesTab) {
            binding.recycler.setLayoutManager(new GridLayoutManager(requireContext(), 2));
            binding.recycler.setAdapter(imageAdapter);
            binding.fab.setText(R.string.upload_images);
            binding.fab.setIconResource(R.drawable.ic_add);
        } else {
            binding.recycler.setLayoutManager(new LinearLayoutManager(requireContext()));
            binding.recycler.setAdapter(amenityAdapter);
            binding.fab.setText(R.string.add_amenity);
        }
        render();
    }

    private void render() {
        if (binding == null) return;
        boolean noScope = scope() == null;
        binding.btnTabImages.setText(getString(R.string.tab_images_count, images.size()));
        binding.btnTabAmenities.setText(getString(R.string.tab_amenities_count, linkedIds.size()));
        UiUtils.visible(binding.fab, canManage && (!imagesTab || !noScope));

        if (noScope) {
            imageAdapter.submit(null);
            amenityAdapter.submit(null);
            empty(true, R.string.no_rooms_for_type);
        } else if (imagesTab) {
            imageAdapter.submit(images);
            empty(images.isEmpty(), R.string.no_images);
        } else {
            amenityAdapter.submit(catalog);
            empty(catalog.isEmpty(), R.string.no_amenities);
        }
        renderSummary();
    }

    private void renderSummary() {
        List<Scope> t = targets();
        if (scope() == null) { binding.tvSummary.setText(""); return; }
        binding.tvSummary.setText(t.size() > 1
                ? getString(R.string.scope_summary_type, t.size())
                : scopeIndex == 0 ? getString(R.string.scope_summary_hotel) : getString(R.string.scope_summary_room));
    }

    private void bindImage(ItemContentImageBinding b, Image img, int pos) {
        Glide.with(b.ivImage).load(ApiClient.mediaUrl(img.url))
                .placeholder(R.drawable.bg_image_placeholder).error(R.drawable.bg_image_placeholder)
                .centerCrop().into(b.ivImage);
        UiUtils.visible(b.tvPrimary, img.isPrimary);
        b.tvOrder.setText("#" + (pos + 1));
        b.tvAlt.setText(img.altText != null && !img.altText.isEmpty() ? img.altText
                : (img.originalFileName != null ? img.originalFileName : getString(R.string.no_alt)));
        b.tvMeta.setText(meta(img));
        b.ivImage.setOnClickListener(v -> preview(img));
        b.btnMenu.setOnClickListener(v -> showImageMenu(v, img, pos));
    }

    private String meta(Image img) {
        List<String> parts = new ArrayList<>();
        if (img.width != null && img.height != null) parts.add(img.width + "×" + img.height);
        if (img.fileSize != null) parts.add(String.format(Locale.US, "%.1f MB", img.fileSize / 1024f / 1024f));
        if (img.createdAt != null) parts.add(DateUtils.display(img.createdAt));
        return String.join(" · ", parts);
    }

    private void bindAmenity(ItemPortalRowBinding b, Amenity a, int pos) {
        UiUtils.visible(b.tvAvatar, false);
        UiUtils.visible(b.ivAvatar, true);
        b.ivAvatar.setImageResource(R.drawable.ic_check);
        boolean linked = linkedIds.contains(a.amenityId);
        b.ivAvatar.setAlpha(linked ? 1f : 0.35f);
        b.tvTitle.setText(a.name);
        UiUtils.visible(b.tvBadge, !a.isActive);
        b.tvBadge.setText(R.string.inactive);
        PortalStyle.active(b.tvBadge, false);
        b.tvLine1.setText(a.description != null && !a.description.isEmpty() ? a.description : getString(R.string.no_description));
        UiUtils.visible(b.tvLine2, false);

        UiUtils.visible(b.layoutFooter, canManage);
        b.tvValue.setText(linked ? getString(R.string.amenity_linked) : "");
        b.tvValue.setTextColor(getResources().getColor(R.color.success, null));
        UiUtils.visible(b.btnAction, canManage);
        b.btnAction.setText(R.string.edit);
        b.btnAction.setOnClickListener(v -> openAmenityForm(a));

        UiUtils.visible(b.switchActive, canManage && scope() != null);
        b.switchActive.setOnCheckedChangeListener(null);
        b.switchActive.setChecked(linked);
        b.switchActive.setOnCheckedChangeListener((sw, checked) -> toggleAmenity(a, checked, sw));
    }

    private void empty(boolean empty, int text) {
        UiUtils.visible(binding.tvEmpty, empty);
        binding.tvEmpty.setText(text);
    }

    // ===================== Hình ảnh =====================

    private void showImageMenu(View anchor, Image img, int pos) {
        PopupMenu menu = new PopupMenu(requireContext(), anchor);
        Menu m = menu.getMenu();
        m.add(Menu.NONE, MENU_VIEW, 0, R.string.view_image);
        if (canManage) {
            if (!img.isPrimary) m.add(Menu.NONE, MENU_PRIMARY, 1, R.string.set_primary);
            if (pos > 0) m.add(Menu.NONE, MENU_UP, 2, R.string.move_up);
            if (pos < images.size() - 1) m.add(Menu.NONE, MENU_DOWN, 3, R.string.move_down);
            m.add(Menu.NONE, MENU_DELETE, 4, R.string.delete_image);
        }
        menu.setOnMenuItemClickListener(item -> {
            switch (item.getItemId()) {
                case MENU_VIEW: preview(img); break;
                case MENU_PRIMARY: run(repository.setPrimary(scope(), img.imageId), R.string.primary_set); break;
                case MENU_UP: move(pos, pos - 1); break;
                case MENU_DOWN: move(pos, pos + 1); break;
                case MENU_DELETE: confirmDelete(img); break;
                default: break;
            }
            return true;
        });
        menu.show();
    }

    private void preview(Image img) {
        ImageView view = new ImageView(requireContext());
        view.setAdjustViewBounds(true);
        Glide.with(view).load(ApiClient.mediaUrl(img.url)).into(view);
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(img.altText != null && !img.altText.isEmpty() ? img.altText : img.originalFileName)
                .setView(view)
                .setPositiveButton(R.string.close, null)
                .show();
    }

    /** Đổi thứ tự cục bộ rồi gửi toàn bộ danh sách id theo thứ tự mới. */
    private void move(int from, int to) {
        List<Image> reordered = new ArrayList<>(images);
        Image moved = reordered.remove(from);
        reordered.add(to, moved);
        List<Long> ids = new ArrayList<>();
        for (Image i : reordered) ids.add(i.imageId);
        images = reordered;
        render();
        run(repository.reorder(scope(), ids), R.string.order_saved);
    }

    private void confirmDelete(Image img) {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.delete_image)
                .setMessage(img.isPrimary ? R.string.confirm_delete_primary : R.string.confirm_delete_image)
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.delete_image, (d, w) -> run(repository.deleteImage(scope(), img.imageId), R.string.image_deleted))
                .show();
    }

    private void run(androidx.lifecycle.LiveData<Resource<Void>> call, int successMessage) {
        SingleObserver.observe(getViewLifecycleOwner(), call, res -> {
            binding.swipeRefresh.setRefreshing(res.isLoading());
            if (res.isError()) { UiUtils.toast(requireContext(), res.message); loadScope(); }
            if (res.isSuccess()) { UiUtils.toast(requireContext(), getString(successMessage)); loadScope(); }
        });
    }

    /** Tải lần lượt từng ảnh (tránh dồn nhiều request lớn cùng lúc). */
    private void uploadAll(List<Uri> uris) {
        if (uris == null || uris.isEmpty()) return;
        List<Scope> t = targets();
        if (t.isEmpty()) return;
        uploadNext(new ArrayList<>(uris), 0, t, 0);
    }

    private void uploadNext(List<Uri> uris, int index, List<Scope> t, int uploaded) {
        if (index >= uris.size()) {
            UiUtils.visible(binding.progressUpload, false);
            renderSummary();
            if (uploaded > 0) UiUtils.toast(requireContext(), getString(R.string.upload_done, uploaded, t.size()));
            loadScope();
            return;
        }
        UiUtils.visible(binding.progressUpload, true);
        binding.tvSummary.setText(getString(R.string.uploading, index + 1, uris.size()));
        Uri uri = uris.get(index);
        byte[] bytes = readBytes(uri);
        if (bytes == null) {
            UiUtils.toast(requireContext(), getString(R.string.err_read_image));
            uploadNext(uris, index + 1, t, uploaded);
            return;
        }
        if (bytes.length > MAX_UPLOAD_BYTES) {
            UiUtils.toast(requireContext(), getString(R.string.err_image_too_large, fileName(uri)));
            uploadNext(uris, index + 1, t, uploaded);
            return;
        }
        // Ảnh đầu tiên của phạm vi chưa có ảnh nào sẽ thành ảnh chính.
        boolean primary = images.isEmpty() && uploaded == 0;
        String mime = requireContext().getContentResolver().getType(uri);
        SingleObserver.observe(getViewLifecycleOwner(),
                repository.upload(t, bytes, fileName(uri), mime, null, primary), res -> {
                    if (res.isLoading()) return;
                    if (res.isError()) UiUtils.toast(requireContext(), res.message);
                    uploadNext(uris, index + 1, t, uploaded + (res.isSuccess() ? 1 : 0));
                });
    }

    @Nullable
    private byte[] readBytes(Uri uri) {
        try (InputStream in = requireContext().getContentResolver().openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buffer = new byte[16 * 1024];
            int n;
            long total = 0;
            while ((n = in.read(buffer)) != -1) {
                total += n;
                if (total > MAX_UPLOAD_BYTES + 1) return new byte[(int) MAX_UPLOAD_BYTES + 1]; // đủ để báo "quá lớn"
                out.write(buffer, 0, n);
            }
            return out.toByteArray();
        } catch (Exception e) {
            return null;
        }
    }

    private String fileName(Uri uri) {
        try (Cursor c = requireContext().getContentResolver().query(uri, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) return c.getString(idx);
            }
        } catch (Exception ignored) { }
        return "image.jpg";
    }

    // ===================== Tiện ích =====================

    private void toggleAmenity(Amenity a, boolean assigned, android.widget.CompoundButton sw) {
        List<Scope> t = targets();
        sw.setEnabled(false);
        SingleObserver.observe(getViewLifecycleOwner(), repository.setAmenity(t, a.amenityId, assigned), res -> {
            if (res.isLoading()) return;
            sw.setEnabled(true);
            if (res.isError()) UiUtils.toast(requireContext(), res.message);
            if (res.isSuccess()) {
                if (assigned) linkedIds.add(a.amenityId); else linkedIds.remove(a.amenityId);
                if (t.size() > 1) UiUtils.toast(requireContext(), getString(R.string.applied_to_rooms, res.data, t.size()));
            }
            render();
        });
    }

    private void openAmenityForm(@Nullable Amenity a) {
        DialogAmenityFormBinding d = DialogAmenityFormBinding.inflate(getLayoutInflater());
        if (a != null) {
            d.etName.setText(a.name);
            d.etDescription.setText(a.description);
        }
        MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(requireContext())
                .setTitle(a == null ? R.string.add_amenity : R.string.edit_amenity)
                .setMessage(R.string.amenity_catalog_hint)
                .setView(d.getRoot())
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.save, null);
        if (a != null) builder.setNeutralButton(R.string.delete, (x, w) -> confirmDeleteAmenity(a));
        androidx.appcompat.app.AlertDialog dialog = builder.create();
        dialog.setOnShowListener(x -> dialog.getButton(androidx.appcompat.app.AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            String name = String.valueOf(d.etName.getText()).trim();
            String desc = String.valueOf(d.etDescription.getText()).trim();
            if (name.isEmpty()) { d.tilName.setError(getString(R.string.err_required)); return; }
            SingleObserver.observe(getViewLifecycleOwner(),
                    repository.saveAmenity(a == null ? null : a.amenityId, name, desc.isEmpty() ? null : desc), res -> {
                        if (res.isError()) d.tilName.setError(res.message);
                        if (res.isSuccess()) {
                            dialog.dismiss();
                            UiUtils.toast(requireContext(), getString(R.string.amenity_saved));
                            loadCatalog();
                        }
                    });
        }));
        dialog.show();
    }

    private void confirmDeleteAmenity(Amenity a) {
        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(R.string.delete)
                .setMessage(getString(R.string.confirm_delete_amenity, a.name))
                .setNegativeButton(R.string.cancel, null)
                .setPositiveButton(R.string.delete, (d, w) ->
                        SingleObserver.observe(getViewLifecycleOwner(), repository.deleteAmenity(a.amenityId), res -> {
                            if (res.isError()) UiUtils.toast(requireContext(), res.message);
                            if (res.isSuccess()) {
                                UiUtils.toast(requireContext(), getString(R.string.amenity_deleted));
                                loadCatalog();
                                loadScope();
                            }
                        }))
                .show();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
