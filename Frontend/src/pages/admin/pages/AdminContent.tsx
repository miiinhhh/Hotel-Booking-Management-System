import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { RoomDto, roomApi } from '../../../services/roomApi';
import {
  AmenityDto, ContentScope, ImageDto, propertyContentApi, propertyImageUrl,
} from '../../../services/propertyContentApi';
import { Modal, PageHeading, Toast } from '../components/AdminUi';

type ScopeType = 'hotel' | 'room';

const formatFileSize = (value: number | null) => {
  if (!value) return 'Không rõ dung lượng';
  return value < 1024 * 1024
    ? `${Math.ceil(value / 1024)} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`;
};

export const AdminContent: React.FC = () => {
  const [hotelId, setHotelId] = useState(1);
  const [scopeType, setScopeType] = useState<ScopeType>('hotel');
  const [roomId, setRoomId] = useState(0);
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [amenities, setAmenities] = useState<AmenityDto[]>([]);
  const [linkedIds, setLinkedIds] = useState<Set<number>>(new Set());
  const [images, setImages] = useState<ImageDto[]>([]);
  const [editingAmenity, setEditingAmenity] = useState<AmenityDto | 'new' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const uploadForm = useRef<HTMLFormElement>(null);

  const scope = useMemo<ContentScope | null>(() => {
    if (scopeType === 'room' && roomId <= 0) return null;
    return { hotelId, ...(scopeType === 'room' ? { roomId } : {}) };
  }, [hotelId, roomId, scopeType]);

  const scopeLabel = scopeType === 'hotel'
    ? `Khách sạn #${hotelId}`
    : `Phòng ${rooms.find(room => room.roomId === roomId)?.roomNumber || `#${roomId}`}`;

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([roomApi.rooms(hotelId), propertyContentApi.amenities()])
      .then(([roomData, amenityData]) => {
        if (!active) return;
        setRooms(roomData); setAmenities(amenityData);
        setRoomId(current => roomData.some(room => room.roomId === current)
          ? current : roomData[0]?.roomId ?? 0);
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu nội dung.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [hotelId, revision]);

  useEffect(() => {
    let active = true;
    if (!scope) { setLinkedIds(new Set()); setImages([]); return; }
    setLoading(true); setError('');
    Promise.all([propertyContentApi.linkedAmenities(scope), propertyContentApi.images(scope)])
      .then(([linked, gallery]) => {
        if (!active) return;
        setLinkedIds(new Set(linked.map(item => item.amenityId)));
        setImages([...gallery].sort((a, b) => a.displayOrder - b.displayOrder));
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Không tải được tiện ích và thư viện ảnh.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scope]);

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
      setAmenities(current => editingAmenity === 'new'
        ? [...current, saved].sort((a, b) => a.name.localeCompare(b.name, 'vi'))
        : current.map(item => item.amenityId === saved.amenityId ? saved : item));
      setEditingAmenity(null); notify('Đã lưu tiện ích.');
    } catch (reason) {
      setModalError(reason instanceof Error ? reason.message : 'Không lưu được tiện ích.');
    } finally { setSaving(false); }
  };

  const removeAmenity = async (amenity: AmenityDto) => {
    if (saving || !window.confirm(`Vô hiệu hóa tiện ích “${amenity.name}”?`)) return;
    setSaving(true); setError('');
    try {
      await propertyContentApi.deleteAmenity(amenity.amenityId);
      setAmenities(current => current.filter(item => item.amenityId !== amenity.amenityId));
      setLinkedIds(current => {
        const next = new Set(current); next.delete(amenity.amenityId); return next;
      });
      notify('Đã vô hiệu hóa tiện ích.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể vô hiệu hóa tiện ích.');
    } finally { setSaving(false); }
  };

  const toggleAmenity = async (amenityId: number) => {
    if (!scope || saving) return;
    const assigned = !linkedIds.has(amenityId);
    setSaving(true); setError('');
    try {
      await propertyContentApi.setAmenity(scope, amenityId, assigned);
      setLinkedIds(current => {
        const next = new Set(current);
        assigned ? next.add(amenityId) : next.delete(amenityId);
        return next;
      });
      notify(assigned ? 'Đã gán tiện ích.' : 'Đã gỡ tiện ích.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không cập nhật được tiện ích.');
    } finally { setSaving(false); }
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scope || saving) return;
    const data = new FormData(event.currentTarget);
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) { setError('Vui lòng chọn ảnh.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Ảnh phải là JPG, PNG hoặc WebP và không vượt quá 5 MB.'); return;
    }
    setSaving(true); setError('');
    try {
      await propertyContentApi.uploadImage(
        scope, file, String(data.get('altText') || ''), data.get('isPrimary') === 'on');
      setImages(await propertyContentApi.images(scope));
      uploadForm.current?.reset(); notify('Đã tải ảnh lên.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không tải được ảnh.');
    } finally { setSaving(false); }
  };

  const makePrimary = async (imageId: number) => {
    if (!scope || saving) return;
    setSaving(true); setError('');
    try {
      await propertyContentApi.selectPrimary(scope, imageId);
      setImages(current => current.map(image => ({ ...image, isPrimary: image.imageId === imageId })));
      notify('Đã chọn ảnh đại diện.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không chọn được ảnh đại diện.');
    } finally { setSaving(false); }
  };

  const removeImage = async (image: ImageDto) => {
    if (!scope || saving || !window.confirm('Xóa ảnh này khỏi thư viện?')) return;
    setSaving(true); setError('');
    try {
      await propertyContentApi.deleteImage(scope, image.imageId);
      setImages(await propertyContentApi.images(scope)); notify('Đã xóa ảnh.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không xóa được ảnh.');
    } finally { setSaving(false); }
  };

  const moveImage = async (index: number, direction: -1 | 1) => {
    if (!scope || saving) return;
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setSaving(true); setError('');
    try {
      await propertyContentApi.reorderImages(scope, reordered.map(image => image.imageId));
      setImages(reordered.map((image, order) => ({ ...image, displayOrder: order })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không sắp xếp được ảnh.');
    } finally { setSaving(false); }
  };

  return <>
    <PageHeading
      title="Tiện ích & Hình ảnh"
      description="Quản lý danh mục tiện ích, gán nội dung và thư viện ảnh riêng cho từng khách sạn hoặc phòng."
      actions={<button disabled={loading || saving} onClick={() => { setEditingAmenity('new'); setModalError(''); }} className="rounded-full bg-primary px-5 py-2 text-on-primary disabled:opacity-40">Thêm tiện ích</button>}
    />

    <section className="mb-6 rounded-lg bg-surface-container-lowest p-5 shadow-sm">
      <div className="grid gap-4 md:grid-cols-3">
        <form onSubmit={event => {
          event.preventDefault();
          const id = Number(new FormData(event.currentTarget).get('hotel'));
          if (Number.isSafeInteger(id) && id > 0) {
            setRoomId(0);
            setHotelId(id);
          }
        }}>
          <label className="text-sm font-semibold">Mã khách sạn</label>
          <div className="mt-1 flex gap-2"><input key={hotelId} name="hotel" type="number" min="1" required defaultValue={hotelId} className="min-w-0 flex-1 rounded-lg bg-surface-container-low p-3" /><button className="rounded-full bg-primary px-4 text-on-primary">Xem</button></div>
        </form>
        <label className="text-sm font-semibold">Phạm vi nội dung<select value={scopeType} onChange={event => setScopeType(event.target.value as ScopeType)} className="mt-1 w-full rounded-lg bg-surface-container-low p-3"><option value="hotel">Khách sạn</option><option value="room">Phòng cụ thể</option></select></label>
        <label className="text-sm font-semibold">Phòng<select disabled={scopeType !== 'room' || !rooms.length} value={roomId} onChange={event => setRoomId(Number(event.target.value))} className="mt-1 w-full rounded-lg bg-surface-container-low p-3 disabled:opacity-50"><option value={0}>Chọn phòng</option>{rooms.map(room => <option key={room.roomId} value={room.roomId}>Phòng {room.roomNumber} · #{room.roomId}</option>)}</select></label>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3"><span><strong>Đang chỉnh sửa:</strong> {scopeLabel}</span><button disabled={loading || saving} onClick={() => setRevision(value => value + 1)} className="rounded-full bg-surface-container px-4 py-2">Làm mới</button></div>
    </section>

    {error && <p role="alert" className="mb-5 rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
    {!scope && <p className="mb-5 rounded-lg bg-surface-container p-4">Chọn một phòng để quản lý nội dung riêng của phòng.</p>}

    <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.7fr)]">
      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
        <div className="mb-4"><h2 className="text-xl font-semibold">Tiện ích của {scopeLabel}</h2><p className="text-sm text-on-surface-variant">Bật hoặc tắt tiện ích được hiển thị với khách hàng.</p></div>
        {loading ? <p role="status">Đang tải tiện ích…</p> : !amenities.length ? <p>Chưa có tiện ích trong danh mục.</p> : <div className="space-y-3">{amenities.map(amenity => <article key={amenity.amenityId} className="rounded-lg border border-outline-variant/30 p-4">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{amenity.name}</h3><p className="text-sm text-on-surface-variant">{amenity.description || 'Chưa có mô tả.'}</p></div><input aria-label={`Gán ${amenity.name}`} type="checkbox" disabled={!scope || saving} checked={linkedIds.has(amenity.amenityId)} onChange={() => void toggleAmenity(amenity.amenityId)} className="h-5 w-5 accent-primary" /></div>
          <div className="mt-3 flex gap-2"><button disabled={saving} onClick={() => { setEditingAmenity(amenity); setModalError(''); }} className="rounded-full bg-surface-container px-3 py-1 text-sm">Sửa</button><button disabled={saving} onClick={() => void removeAmenity(amenity)} className="rounded-full bg-error-container px-3 py-1 text-sm text-on-error-container">Vô hiệu hóa</button></div>
        </article>)}</div>}
      </section>

      <section className="rounded-lg bg-surface-container-lowest p-5 shadow-sm">
        <div className="mb-5"><h2 className="text-xl font-semibold">Thư viện ảnh {scopeLabel}</h2><p className="text-sm text-on-surface-variant">JPG, PNG hoặc WebP · tối đa 5 MB · ảnh đầu tiên tự động làm ảnh đại diện.</p></div>
        <form ref={uploadForm} onSubmit={upload} className="mb-6 grid gap-3 rounded-lg bg-surface-container-low p-4 md:grid-cols-2">
          <label className="md:col-span-2">Chọn ảnh<input name="file" type="file" required accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full rounded-lg bg-surface-container-lowest p-3" /></label>
          <label>Văn bản thay thế<input name="altText" maxLength={255} placeholder="Mô tả ngắn nội dung ảnh" className="mt-1 w-full rounded-lg bg-surface-container-lowest p-3" /></label>
          <label className="flex items-center gap-3 self-end rounded-lg bg-surface-container-lowest p-3"><input name="isPrimary" type="checkbox" className="h-5 w-5 accent-primary" /> Chọn làm ảnh đại diện</label>
          <button disabled={!scope || saving} className="md:col-span-2 rounded-full bg-primary p-3 font-semibold text-on-primary disabled:opacity-40">{saving ? 'Đang xử lý…' : 'Tải ảnh lên'}</button>
        </form>

        {loading ? <p role="status">Đang tải thư viện ảnh…</p> : !images.length ? <div className="rounded-lg border border-dashed border-outline-variant p-8 text-center text-on-surface-variant"><span className="material-symbols-outlined mb-2 text-4xl">add_photo_alternate</span><p>Chưa có ảnh trong phạm vi này.</p></div> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{images.map((image, index) => <article key={image.imageId} className="overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-low">
          <div className="relative aspect-[4/3] bg-surface-container"><img src={propertyImageUrl(image.url)} alt={image.altText || `Ảnh ${index + 1}`} className="h-full w-full object-cover" />{image.isPrimary && <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-on-primary">Ảnh đại diện</span>}</div>
          <div className="p-4"><p className="truncate font-semibold">{image.altText || image.originalFileName || `Ảnh #${image.imageId}`}</p><p className="mt-1 text-xs text-outline">{image.width && image.height ? `${image.width} × ${image.height} px · ` : ''}{formatFileSize(image.fileSize)}</p>
            <div className="mt-4 flex flex-wrap gap-2"><button aria-label="Chuyển ảnh lên" disabled={saving || index === 0} onClick={() => void moveImage(index, -1)} className="rounded-full bg-surface-container px-3 py-1 disabled:opacity-30">↑</button><button aria-label="Chuyển ảnh xuống" disabled={saving || index === images.length - 1} onClick={() => void moveImage(index, 1)} className="rounded-full bg-surface-container px-3 py-1 disabled:opacity-30">↓</button>{!image.isPrimary && <button disabled={saving} onClick={() => void makePrimary(image.imageId)} className="rounded-full bg-primary-container px-3 py-1 text-on-primary-container">Đặt làm ảnh chính</button>}<button disabled={saving} onClick={() => void removeImage(image)} className="rounded-full bg-error-container px-3 py-1 text-on-error-container">Xóa</button></div>
          </div>
        </article>)}</div>}
      </section>
    </div>

    <Modal title={editingAmenity === 'new' ? 'Thêm tiện ích' : 'Cập nhật tiện ích'} open={Boolean(editingAmenity)} onClose={() => { if (!saving) setEditingAmenity(null); }}>
      {editingAmenity && <form key={editingAmenity === 'new' ? 'new' : editingAmenity.amenityId} onSubmit={saveAmenity} className="space-y-4">
        {modalError && <p role="alert" className="text-error">{modalError}</p>}
        <label className="block">Tên tiện ích<input name="name" required maxLength={100} defaultValue={editingAmenity === 'new' ? '' : editingAmenity.name} className="mt-1 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <label className="block">Mô tả<textarea name="description" maxLength={255} defaultValue={editingAmenity === 'new' ? '' : editingAmenity.description || ''} className="mt-1 min-h-24 w-full rounded-lg bg-surface-container-low p-3" /></label>
        <button disabled={saving} className="w-full rounded-full bg-primary p-3 font-semibold text-on-primary disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu tiện ích'}</button>
      </form>}
    </Modal>
    <Toast message={toast} />
  </>;
};

export default AdminContent;
