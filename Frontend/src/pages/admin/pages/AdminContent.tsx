import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { RoomDto, RoomTypeDto, roomApi } from '../../../services/roomApi';
import {
  AmenityDto, ContentScope, ImageDto, propertyContentApi, propertyImageUrl,
} from '../../../services/propertyContentApi';
import { getHotelsList } from '../../../services/pricingAdminApi';
import { Modal, PageHeading, Toast } from '../components/AdminUi';

type Tab = 'images' | 'amenities';
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

const formatFileSize = (value: number | null) => {
  if (!value) return '';
  return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`;
};
/** Mô tả ảnh mặc định lấy từ tên file: "ho-boi_dem.jpg" -> "ho boi dem". */
const altFromFileName = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 255);

export const AdminContent: React.FC = () => {
  const [hotels, setHotels] = useState<{ hotelId: number; hotelName: string }[]>([]);
  const [hotelId, setHotelId] = useState(0);
  const [roomTypes, setRoomTypes] = useState<RoomTypeDto[]>([]);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomTypeId, setRoomTypeId] = useState(0); // 0 = toàn khách sạn
  const [roomId, setRoomId] = useState(0);
  const [applyToType, setApplyToType] = useState(false);
  const [tab, setTab] = useState<Tab>('images');

  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
  const [images, setImages] = useState<ImageDto[]>([]);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityDto | 'new' | null>(null);
  const [editingAlt, setEditingAlt] = useState<ImageDto | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Ảnh đầu tiên (theo tên file) của lần tải lên thay ảnh đại diện hiện tại. */
  const [firstAsPrimary, setFirstAsPrimary] = useState(true);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const typeRooms = useMemo(() => rooms.filter(room => room.roomTypeId === roomTypeId), [rooms, roomTypeId]);
  const scope = useMemo<ContentScope | null>(() => {
    if (!hotelId) return null;
    if (!roomTypeId) return { hotelId };
    return roomId > 0 ? { hotelId, roomId } : null;
  }, [hotelId, roomTypeId, roomId]);
  /** Các phạm vi nhận thay đổi: phòng đang chọn, hoặc mọi phòng cùng hạng khi bật "áp dụng cho cả hạng". */
  const targets = useMemo<ContentScope[]>(() => {
    if (!scope) return [];
    if (!roomTypeId || !applyToType) return [scope];
    return typeRooms.map(room => ({ hotelId, roomId: room.roomId }));
  }, [scope, roomTypeId, applyToType, typeRooms, hotelId]);

  const hotelName = hotels.find(h => h.hotelId === hotelId)?.hotelName || (hotelId ? `Khách sạn #${hotelId}` : '');
  const typeName = roomTypes.find(t => t.roomTypeId === roomTypeId)?.name;
  const roomNumber = rooms.find(r => r.roomId === roomId)?.roomNumber;
  const scopeLabel = !roomTypeId ? hotelName : applyToType ? `${typeRooms.length} phòng ${typeName}` : `Phòng ${roomNumber || `#${roomId}`}`;

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600); };
  const fail = (reason: unknown, fallback: string) => setError(reason instanceof Error ? reason.message : fallback);

  // Danh sách khách sạn + danh mục tiện ích
  useEffect(() => {
    getHotelsList().then(res => {
      if (res.success && res.data) {
        const list = res.data.items.map(h => ({ hotelId: h.hotelId, hotelName: h.hotelName }));
        setHotels(list);
        setHotelId(current => current || list[0]?.hotelId || 0);
      } else setError(res.message || 'Không tải được danh sách khách sạn.');
    });
    propertyContentApi.amenities().then(setAmenities).catch(reason => fail(reason, 'Không tải được danh mục tiện ích.'));
  }, []);

  // Hạng phòng và phòng của khách sạn
  useEffect(() => {
    if (!hotelId) return;
    let active = true;
    Promise.all([roomApi.types(hotelId), roomApi.rooms(hotelId)])
      .then(([types, roomData]) => {
        if (!active) return;
        setRoomTypes(types.filter(t => t.isActive)); setRooms(roomData);
        setRoomTypeId(0); setRoomId(0);
      })
      .catch(reason => { if (active) fail(reason, 'Không tải được phòng của khách sạn.'); });
    return () => { active = false; };
  }, [hotelId, revision]);

  // Khi đổi hạng phòng, chọn sẵn phòng đầu tiên của hạng đó
  useEffect(() => {
    setRoomId(current => typeRooms.some(r => r.roomId === current) ? current : typeRooms[0]?.roomId ?? 0);
  }, [typeRooms]);

  // Ảnh + tiện ích của phạm vi đang xem
  useEffect(() => {
    let active = true;
    if (!scope) { setLinkedIds(new Set()); setImages([]); setLoading(false); return; }
    setLoading(true); setError('');
    Promise.all([propertyContentApi.linkedAmenities(scope), propertyContentApi.images(scope)])
      .then(([linked, gallery]) => {
        if (!active) return;
        setLinkedIds(new Set(linked.map(item => item.amenityId)));
        setImages([...gallery].sort((a, b) => a.displayOrder - b.displayOrder));
      })
      .catch(reason => { if (active) fail(reason, 'Không tải được tiện ích và thư viện ảnh.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope, revision]);

  const reloadImages = async () => {
    if (scope) setImages([...(await propertyContentApi.images(scope))].sort((a, b) => a.displayOrder - b.displayOrder));
  };

  // ---------- Ảnh ----------
  const uploadFiles = async (fileList: FileList | File[]) => {
    if (!targets.length || saving) return;
    const files = Array.from(fileList);
    const invalid = files.filter(f => !ACCEPTED.includes(f.type) || f.size > MAX_SIZE);
    if (invalid.length) { setError(`Bỏ qua ${invalid.map(f => f.name).join(', ')}: chỉ nhận JPG, PNG, WebP tối đa 5 MB.`); }
    // Tải theo thứ tự tên file (1, 2, 10…), không theo thứ tự trình duyệt trả về.
    const valid = files.filter(f => !invalid.includes(f))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' }));
    if (!valid.length) return;
    setSaving(true); if (!invalid.length) setError('');
    try {
      let done = 0;
      const total = valid.length * targets.length;
      for (const target of targets) {
        for (const [index, file] of valid.entries()) {
          setProgress(`Đang tải ${++done}/${total}…`);
          await propertyContentApi.uploadImage(target, file, altFromFileName(file.name), firstAsPrimary && index === 0);
        }
      }
      await reloadImages();
      const cover = firstAsPrimary ? ` Ảnh đại diện mới: ${valid[0].name}.` : '';
      notify((targets.length > 1 ? `Đã tải ${valid.length} ảnh lên ${targets.length} phòng.` : `Đã tải ${valid.length} ảnh lên.`) + cover);
    } catch (reason) { fail(reason, 'Không tải được ảnh.'); }
    finally { setSaving(false); setProgress(''); if (fileInput.current) fileInput.current.value = ''; }
  };

  const makePrimary = async (imageId: number) => {
    if (!scope || saving) return;
    setSaving(true); setError('');
    try {
      await propertyContentApi.selectPrimary(scope, imageId);
      setImages(current => current.map(image => ({ ...image, isPrimary: image.imageId === imageId })));
      notify('Đã chọn ảnh đại diện.');
    } catch (reason) { fail(reason, 'Không chọn được ảnh đại diện.'); }
    finally { setSaving(false); }
  };

  const removeImage = async (image: ImageDto) => {
    if (!scope || saving || !window.confirm('Xóa ảnh này khỏi thư viện?')) return;
    setSaving(true); setError('');
    try { await propertyContentApi.deleteImage(scope, image.imageId); await reloadImages(); notify('Đã xóa ảnh.'); }
    catch (reason) { fail(reason, 'Không xóa được ảnh.'); }
    finally { setSaving(false); }
  };

  const reorder = async (from: number, to: number) => {
    if (!scope || saving || from === to || to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const previous = images;
    setImages(next.map((image, order) => ({ ...image, displayOrder: order })));
    setSaving(true); setError('');
    try { await propertyContentApi.reorderImages(scope, next.map(image => image.imageId)); }
    catch (reason) { setImages(previous); fail(reason, 'Không sắp xếp được ảnh.'); }
    finally { setSaving(false); }
  };

  const saveAlt = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // API hiện không có endpoint sửa mô tả ảnh; mô tả được đặt khi tải lên.
    setEditingAlt(null);
  };

  // ---------- Tiện ích ----------
  const toggleAmenity = async (amenityId: number) => {
    if (!targets.length || saving) return;
    const assigned = !linkedIds.has(amenityId);
    setSaving(true); setError('');
    try {
      for (const target of targets) await propertyContentApi.setAmenity(target, amenityId, assigned);
      setLinkedIds(current => { const next = new Set(current); assigned ? next.add(amenityId) : next.delete(amenityId); return next; });
      notify(`${assigned ? 'Đã gán' : 'Đã gỡ'} tiện ích${targets.length > 1 ? ` cho ${targets.length} phòng` : ''}.`);
    } catch (reason) { fail(reason, 'Không cập nhật được tiện ích.'); }
    finally { setSaving(false); }
  };

  const saveAmenity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAmenity || saving) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name')).trim();
    const description = String(data.get('description')).trim() || null;
    setSaving(true); setModalError('');
    try {
      const saved = editingAmenity === 'new'
        ? await propertyContentApi.createAmenity(name, description)
        : await propertyContentApi.updateAmenity(editingAmenity.amenityId, name, description);
      setAmenities(current => (editingAmenity === 'new' ? [...current, saved] : current.map(item => item.amenityId === saved.amenityId ? saved : item))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')));
      setEditingAmenity(null); notify('Đã lưu tiện ích.');
    } catch (reason) { setModalError(reason instanceof Error ? reason.message : 'Không lưu được tiện ích.'); }
    finally { setSaving(false); }
  };

  const removeAmenity = async (amenity: AmenityDto) => {
    if (saving || !window.confirm(`Vô hiệu hóa tiện ích “${amenity.name}”?`)) return;
    setSaving(true); setError('');
    try {
      await propertyContentApi.deleteAmenity(amenity.amenityId);
      setAmenities(current => current.filter(item => item.amenityId !== amenity.amenityId));
      setLinkedIds(current => { const next = new Set(current); next.delete(amenity.amenityId); return next; });
      notify('Đã vô hiệu hóa tiện ích.');
    } catch (reason) { fail(reason, 'Không thể vô hiệu hóa tiện ích.'); }
    finally { setSaving(false); }
  };

  const tabButton = (id: Tab, icon: string, label: string, count: number) => (
    <button type="button" onClick={() => setTab(id)}
      className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold ${tab === id ? 'bg-primary-container text-on-primary shadow-sm' : 'text-on-surface-variant'}`}>
      <span className="material-symbols-outlined text-lg">{icon}</span>{label}
      <span className={`rounded-full px-2 text-xs ${tab === id ? 'bg-on-primary/20' : 'bg-surface-container-high'}`}>{count}</span>
    </button>
  );

  return <>
    <PageHeading title="Tiện ích & Hình ảnh" description="Chọn khách sạn hoặc phòng, rồi quản lý thư viện ảnh và tiện ích hiển thị với khách hàng." />

    {/* Thanh chọn phạm vi — dính dưới header khi cuộn */}
    <section className="sticky top-16 z-20 -mx-1 mb-5 rounded-lg bg-surface-container-lowest/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1 text-sm font-semibold">Khách sạn
          <select value={hotelId} disabled={saving} onChange={e => setHotelId(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-surface-container-low p-2.5 font-normal">
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        </label>
        <label className="min-w-[180px] flex-1 text-sm font-semibold">Phạm vi
          <select value={roomTypeId} disabled={saving} onChange={e => { setRoomTypeId(Number(e.target.value)); setApplyToType(false); }} className="mt-1 w-full rounded-lg bg-surface-container-low p-2.5 font-normal">
            <option value={0}>Toàn khách sạn</option>
            {roomTypes.map(t => <option key={t.roomTypeId} value={t.roomTypeId}>Hạng phòng: {t.name}</option>)}
          </select>
        </label>
        {roomTypeId > 0 && (
          <label className="min-w-[140px] text-sm font-semibold">Phòng
            <select value={roomId} disabled={saving || !typeRooms.length} onChange={e => setRoomId(Number(e.target.value))} className="mt-1 w-full rounded-lg bg-surface-container-low p-2.5 font-normal">
              {!typeRooms.length && <option value={0}>Không có phòng</option>}
              {typeRooms.map(r => <option key={r.roomId} value={r.roomId}>{r.roomNumber}</option>)}
            </select>
          </label>
        )}
        <button type="button" disabled={loading || saving} onClick={() => setRevision(v => v + 1)} className="rounded-full bg-surface-container px-4 py-2.5 text-sm disabled:opacity-50">Làm mới</button>
      </div>
      {roomTypeId > 0 && typeRooms.length > 1 && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={applyToType} disabled={saving} onChange={e => setApplyToType(e.target.checked)} className="h-4 w-4 accent-primary" />
          Áp dụng thao tác tải ảnh / gán tiện ích cho <strong>tất cả {typeRooms.length} phòng {typeName}</strong>
          <span className="text-outline">(đang xem: phòng {roomNumber})</span>
        </label>
      )}
    </section>

    {error && <p role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-error-container p-3 text-sm text-on-error-container"><span>{error}</span><button type="button" onClick={() => setError('')} className="font-semibold">Đóng</button></p>}

    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex rounded-full bg-surface-container p-1">
        {tabButton('images', 'photo_library', 'Hình ảnh', images.length)}
        {tabButton('amenities', 'checklist', 'Tiện ích', linkedIds.size)}
      </div>
      <span className="text-sm text-on-surface-variant">Đang chỉnh sửa: <strong className="text-on-surface">{scopeLabel || '—'}</strong></span>
    </div>

    {!scope ? <p className="rounded-lg bg-surface-container p-4">Hạng phòng này chưa có phòng nào để quản lý nội dung.</p> : tab === 'images' ? (
      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
        {/* Kéo-thả hoặc bấm để chọn nhiều ảnh */}
        <div
          role="button" tabIndex={0}
          onClick={() => !saving && fileInput.current?.click()}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !saving) fileInput.current?.click(); }}
          onDragOver={e => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setDragOver(false); void uploadFiles(e.dataTransfer.files); }}
          className={`mb-5 flex cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed px-4 py-4 text-sm transition-colors ${dragOver ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant bg-surface-container-low hover:border-primary'} ${saving ? 'cursor-wait opacity-60' : ''}`}
        >
          <span className="material-symbols-outlined text-2xl text-primary">add_photo_alternate</span>
          <span>{progress || <>Kéo ảnh vào đây hoặc <strong className="text-primary">bấm để chọn</strong> (nhiều ảnh) · JPG, PNG, WebP ≤ 5 MB</>}</span>
          <input ref={fileInput} type="file" multiple accept={ACCEPTED.join(',')} className="hidden" onChange={e => e.target.files && void uploadFiles(e.target.files)} />
        </div>
        <label className="-mt-2 mb-5 flex items-center gap-2 text-sm text-on-surface-variant">
          <input type="checkbox" checked={firstAsPrimary} onChange={e => setFirstAsPrimary(e.target.checked)} disabled={saving} className="h-4 w-4 accent-primary" />
          Dùng ảnh đầu tiên (theo tên file) làm <strong className="text-on-surface">ảnh đại diện</strong> hiển thị trên website
        </label>

        {loading ? <p role="status">Đang tải thư viện ảnh…</p>
          : !images.length ? <p className="py-8 text-center text-on-surface-variant">Chưa có ảnh. Ảnh đầu tiên (theo tên file) sẽ làm ảnh đại diện.</p>
          : <>
            <p className="mb-3 text-xs text-outline">Kéo thả ảnh để đổi thứ tự. Rê chuột vào ảnh để đặt ảnh đại diện hoặc xóa.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {images.map((image, index) => (
                <article key={image.imageId}
                  draggable={!saving}
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={e => { if (dragIndex !== null) e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); if (dragIndex !== null) void reorder(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`group relative overflow-hidden rounded-lg border bg-surface-container ${dragIndex === index ? 'opacity-40' : ''} ${image.isPrimary ? 'border-primary ring-2 ring-primary/40' : 'border-outline-variant/30'}`}>
                  <div className="aspect-[4/3]">
                    <img src={propertyImageUrl(image.url)} alt={image.altText || `Ảnh ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
                  </div>
                  <span className="absolute left-2 top-2 rounded-full bg-inverse-surface/70 px-2 py-0.5 text-[11px] text-inverse-on-surface">{index + 1}</span>
                  {image.isPrimary && <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">Ảnh chính</span>}
                  {/* Thao tác hiện khi rê chuột (luôn hiện trên màn hình cảm ứng/nhỏ) */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/75 to-transparent px-2 pb-2 pt-6 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                    <div className="flex gap-1">
                      <button type="button" aria-label="Chuyển ảnh lên trước" disabled={saving || index === 0} onClick={() => void reorder(index, index - 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-on-surface disabled:opacity-30"><span className="material-symbols-outlined text-base">chevron_left</span></button>
                      <button type="button" aria-label="Chuyển ảnh ra sau" disabled={saving || index === images.length - 1} onClick={() => void reorder(index, index + 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-on-surface disabled:opacity-30"><span className="material-symbols-outlined text-base">chevron_right</span></button>
                    </div>
                    <div className="flex gap-1">
                      {!image.isPrimary && <button type="button" title="Đặt làm ảnh chính" aria-label="Đặt làm ảnh chính" disabled={saving} onClick={() => void makePrimary(image.imageId)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-primary"><span className="material-symbols-outlined text-base">star</span></button>}
                      <button type="button" title="Thông tin ảnh" aria-label="Thông tin ảnh" onClick={() => setEditingAlt(image)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-on-surface"><span className="material-symbols-outlined text-base">info</span></button>
                      <button type="button" title="Xóa ảnh" aria-label="Xóa ảnh" disabled={saving} onClick={() => void removeImage(image)} className="flex h-7 w-7 items-center justify-center rounded-full bg-error-container text-on-error-container"><span className="material-symbols-outlined text-base">delete</span></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>}
      </section>
    ) : (
      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">Bấm vào tiện ích để bật/tắt hiển thị cho <strong className="text-on-surface">{scopeLabel}</strong>.</p>
          <button type="button" onClick={() => setCatalogOpen(true)} className="flex items-center gap-1.5 rounded-full bg-surface-container px-4 py-2 text-sm"><span className="material-symbols-outlined text-lg">tune</span>Quản lý danh mục</button>
        </div>
        {loading ? <p role="status">Đang tải tiện ích…</p>
          : !amenities.length ? <p>Chưa có tiện ích trong danh mục. Bấm “Quản lý danh mục” để thêm.</p>
          : <div className="flex flex-wrap gap-2">
            {amenities.map(amenity => {
              const on = linkedIds.has(amenity.amenityId);
              return (
                <button key={amenity.amenityId} type="button" disabled={saving} aria-pressed={on} title={amenity.description || undefined}
                  onClick={() => void toggleAmenity(amenity.amenityId)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-60 ${on ? 'border-primary bg-primary-container font-semibold text-on-primary' : 'border-outline-variant/50 bg-surface-container-low text-on-surface-variant hover:border-primary'}`}>
                  <span className="material-symbols-outlined text-base">{on ? 'check' : 'add'}</span>{amenity.name}
                </button>
              );
            })}
          </div>}
      </section>
    )}

    {/* Danh mục tiện ích gốc (ít dùng) */}
    <Modal title="Danh mục tiện ích" open={catalogOpen} onClose={() => { if (!saving) setCatalogOpen(false); }}
      footer={<button type="button" onClick={() => { setEditingAmenity('new'); setModalError(''); }} className="rounded-full bg-primary px-5 py-2 text-on-primary">Thêm tiện ích</button>}>
      {!amenities.length ? <p>Chưa có tiện ích.</p> : <ul className="divide-y divide-outline-variant/30">
        {amenities.map(amenity => (
          <li key={amenity.amenityId} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0"><p className="font-semibold">{amenity.name}</p><p className="truncate text-xs text-on-surface-variant">{amenity.description || 'Chưa có mô tả.'}</p></div>
            <div className="flex shrink-0 gap-2">
              <button type="button" disabled={saving} onClick={() => { setEditingAmenity(amenity); setModalError(''); }} className="rounded-full bg-surface-container px-3 py-1 text-sm">Sửa</button>
              <button type="button" disabled={saving} onClick={() => void removeAmenity(amenity)} className="rounded-full bg-error-container px-3 py-1 text-sm text-on-error-container">Vô hiệu hóa</button>
            </div>
          </li>
        ))}
      </ul>}
    </Modal>

    <Modal title={editingAmenity === 'new' ? 'Thêm tiện ích' : 'Cập nhật tiện ích'} open={Boolean(editingAmenity)} onClose={() => { if (!saving) setEditingAmenity(null); }}>
      {editingAmenity && <form key={editingAmenity === 'new' ? 'new' : editingAmenity.amenityId} onSubmit={saveAmenity} className="space-y-4">
        {modalError && <p role="alert" className="text-error">{modalError}</p>}
        <label className="block">Tên tiện ích<input name="name" required maxLength={100} defaultValue={editingAmenity === 'new' ? '' : editingAmenity.name} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label className="block">Mô tả<textarea name="description" maxLength={255} defaultValue={editingAmenity === 'new' ? '' : editingAmenity.description || ''} className="mt-1 min-h-24 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <button disabled={saving} className="w-full rounded-full bg-primary p-3 font-semibold text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu tiện ích'}</button>
      </form>}
    </Modal>

    <Modal title="Thông tin ảnh" open={editingAlt !== null} onClose={() => setEditingAlt(null)}>
      {editingAlt && <form onSubmit={saveAlt} className="space-y-3 text-sm">
        <img src={propertyImageUrl(editingAlt.url)} alt={editingAlt.altText || ''} className="max-h-72 w-full rounded-lg object-cover" />
        <p><strong>Mô tả:</strong> {editingAlt.altText || '—'}</p>
        <p><strong>Tệp gốc:</strong> {editingAlt.originalFileName || '—'}</p>
        <p><strong>Kích thước:</strong> {editingAlt.width && editingAlt.height ? `${editingAlt.width} × ${editingAlt.height} px` : '—'} {formatFileSize(editingAlt.fileSize) && `· ${formatFileSize(editingAlt.fileSize)}`}</p>
        <button className="w-full rounded-full bg-surface-container p-2.5">Đóng</button>
      </form>}
    </Modal>
    <Toast message={toast} />
  </>;
};

export default AdminContent;
