import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { absoluteApiUrl, authApi } from '../../services/authApi';
import { maskBirthDate, maskEmail, maskPhone } from '../../utils/privacy';
import { Field, PasswordField } from './AccountShell';

interface ProfilePageProps { onLogin: () => void; onBookings: () => void; }
const dateValue = (value: string | null | undefined) => value ? value.slice(0, 10) : '';

export const ProfilePage: React.FC<ProfilePageProps> = ({ onLogin, onBookings }) => {
  const { session, profile, loading, updateProfile, updateAvatar, deleteAvatar, logout, logoutAll } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', dateOfBirth: '' });
  const [availability, setAvailability] = useState<{ email?: boolean; phone?: boolean }>({});
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutAllOpen, setLogoutAllOpen] = useState(false);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setForm({ fullName: profile.fullName, email: profile.email, phone: profile.phone || '', dateOfBirth: dateValue(profile.dateOfBirth) });
  }, [profile]);

  if (!session) return <main className="min-h-[70vh] bg-background px-5 pt-36 text-center"><span className="material-symbols-outlined text-5xl text-primary">lock</span><h1 className="mt-4 font-headline-md text-3xl font-semibold">Đăng nhập để xem hồ sơ</h1><button onClick={onLogin} className="mt-6 rounded-full bg-primary px-7 py-3 font-semibold text-on-primary">Đăng nhập</button></main>;
  if (loading && !profile) return <main className="flex min-h-[70vh] items-center justify-center pt-20"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></main>;

  const identityChanged = Boolean(profile && (form.email.trim().toLowerCase() !== profile.email.toLowerCase() || form.phone.trim() !== (profile.phone || '')));
  const initials = (profile?.fullName || session.fullName).split(' ').filter(Boolean).map((part) => part[0]).slice(-2).join('').toUpperCase();
  const avatarUrl = profile?.avatarUrl ? `${absoluteApiUrl(profile.avatarUrl)}?v=${encodeURIComponent(profile.avatarUpdatedAt || '')}` : null;

  const openEditor = () => {
    if (profile) setForm({ fullName: profile.fullName, email: profile.email, phone: profile.phone || '', dateOfBirth: dateValue(profile.dateOfBirth) });
    setAvailability({}); setError(''); setMessage(''); setEditOpen(true);
  };

  const openPasswordEditor = () => {
    setPasswords({ current: '', next: '', confirm: '' }); setError(''); setMessage(''); setPasswordOpen(true);
  };

  const checkAvailability = async (kind: 'email' | 'phone') => {
    if (!profile) return;
    const value = form[kind].trim();
    if (!value || value.toLowerCase() === String(profile[kind] || '').toLowerCase()) {
      setAvailability((current) => ({ ...current, [kind]: undefined })); return;
    }
    try {
      const result = await authApi.availability(session.accessToken, kind === 'email' ? value : undefined, kind === 'phone' ? value : undefined);
      setAvailability((current) => ({ ...current, [kind]: kind === 'email' ? result.emailAvailable : result.phoneAvailable }));
    } catch { setAvailability((current) => ({ ...current, [kind]: undefined })); }
  };

  const save = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      await updateProfile(form); setAvailability({}); setEditOpen(false);
      setMessage('Thông tin hồ sơ đã được cập nhật.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể cập nhật hồ sơ.'); }
    finally { setSaving(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (availability.email === false || availability.phone === false) { setError('Email hoặc số điện thoại đã được tài khoản khác sử dụng.'); return; }
    if (identityChanged) { setReauthPassword(''); setError(''); setReauthOpen(true); return; }
    await save();
  };

  const confirmReauthentication = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try { await authApi.reauthenticate(session.accessToken, reauthPassword); setReauthOpen(false); await save(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Mật khẩu hiện tại không đúng.'); setSaving(false); }
  };

  const onAvatar = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Ảnh đại diện phải là JPG, PNG hoặc WebP và không vượt quá 5 MB.'); return; }
    setAvatarBusy(true); setError(''); setMessage('');
    try { await updateAvatar(file); setMessage('Ảnh đại diện đã được cập nhật.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tải ảnh đại diện.'); }
    finally { setAvatarBusy(false); if (avatarInput.current) avatarInput.current.value = ''; }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true); setError('');
    try { await deleteAvatar(); setMessage('Đã xóa ảnh đại diện.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể xóa ảnh đại diện.'); }
    finally { setAvatarBusy(false); }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setMessage('');
    if (passwords.next !== passwords.confirm) { setError('Mật khẩu xác nhận chưa trùng khớp.'); return; }
    setSaving(true);
    try { await authApi.changePassword(session.accessToken, passwords.current, passwords.next); await logout(); onLogin(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đổi mật khẩu.'); setSaving(false); }
  };

  const signOutEverywhere = async () => {
    setLogoutAllBusy(true); setError(''); setMessage('');
    try { await logoutAll(); setLogoutAllOpen(false); onLogin(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng xuất khỏi mọi thiết bị. Vui lòng thử lại.'); }
    finally { setLogoutAllBusy(false); }
  };

  return <main className="min-h-screen bg-background px-margin-mobile pb-20 pt-32 md:px-margin">
    <div className="mx-auto max-w-6xl">
      <p className="text-label-sm font-semibold uppercase text-primary">Tài khoản của tôi</p>
      <h1 className="mt-2 font-headline-lg text-3xl font-semibold md:text-4xl">Hồ sơ cá nhân</h1>
      <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">Thông tin nhạy cảm được ẩn mặc định và chỉ hiển thị khi bạn chủ động chỉnh sửa.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-lg bg-surface-container-lowest p-6 shadow-sm">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-primary-fixed text-on-primary-fixed">
            {avatarUrl ? <img src={avatarUrl} alt={`Ảnh đại diện ${profile?.fullName || session.fullName}`} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-2xl font-semibold">{initials}</span>}
            {avatarBusy && <span className="absolute inset-0 flex items-center justify-center bg-inverse-surface/60 text-inverse-on-surface"><span className="material-symbols-outlined animate-spin">progress_activity</span></span>}
          </div>
          <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void onAvatar(event.target.files?.[0])} />
          <div className="mt-3 flex gap-2"><button disabled={avatarBusy} onClick={() => avatarInput.current?.click()} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary">Đổi ảnh</button>{profile?.avatarUrl && <button disabled={avatarBusy} onClick={() => void removeAvatar()} className="rounded-full bg-error-container px-3 py-1.5 text-xs font-semibold text-on-error-container">Xóa</button>}</div>
          <p className="mt-2 text-xs text-outline">JPG, PNG hoặc WebP · tối đa 5 MB</p>
          <h2 className="mt-4 text-lg font-semibold">{profile?.fullName || session.fullName}</h2>
          <p className="mt-1 break-all text-sm text-outline">{maskEmail(profile?.email || session.email)}</p>
          <div className="mt-4 flex flex-wrap gap-2">{session.roles.map((role) => <span key={role} className="rounded-full bg-secondary-fixed px-3 py-1 text-xs font-semibold text-on-secondary-fixed">{role}</span>)}</div>
          <div className="mt-6 border-t border-outline-variant/30 pt-5">
            <button onClick={onBookings} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-surface-container-low"><span className="material-symbols-outlined">luggage</span>Đặt phòng của tôi</button>
            <button onClick={() => { void logout(); onLogin(); }} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-error hover:bg-error-container"><span className="material-symbols-outlined">logout</span>Đăng xuất</button>
          </div>
        </aside>
        <div className="space-y-6">
          {(message || error) && <Feedback error={error} message={message} />}
          <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-4 border-b border-outline-variant/30 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-headline-sm text-2xl font-semibold">Thông tin cá nhân</h2><p className="mt-1 text-sm text-on-surface-variant">Dữ liệu liên hệ được che để bảo vệ quyền riêng tư.</p></div><button type="button" onClick={openEditor} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary"><span className="material-symbols-outlined text-xl">edit</span>Chỉnh sửa thông tin</button></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoItem icon="person" label="Họ và tên" value={profile?.fullName || session.fullName} />
              <InfoItem icon="mail" label="Email" value={maskEmail(profile?.email || session.email)} privateValue />
              <InfoItem icon="call" label="Số điện thoại" value={maskPhone(profile?.phone)} privateValue />
              <InfoItem icon="cake" label="Ngày sinh" value={maskBirthDate(profile?.dateOfBirth)} privateValue />
            </div>
          </section>
          <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="border-b border-outline-variant/30 pb-5"><h2 className="font-headline-sm text-2xl font-semibold">Bảo mật tài khoản</h2><p className="mt-1 text-sm text-on-surface-variant">Các thao tác bảo mật chỉ mở khi bạn chủ động yêu cầu.</p></div>
            <div className="mt-6 flex flex-col gap-5 rounded-lg bg-surface-container-low p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed"><span className="material-symbols-outlined">shield_lock</span></span><div><p className="font-semibold">Mật khẩu đăng nhập</p><p className="mt-1 text-sm text-on-surface-variant">Mật khẩu luôn được mã hóa và không hiển thị trên trang.</p></div></div>
              <button type="button" onClick={openPasswordEditor} className="shrink-0 rounded-full border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-fixed">Đổi mật khẩu</button>
            </div>
            <div className="mt-4 flex flex-col gap-4 rounded-lg border border-outline-variant/40 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Phiên đăng nhập</p><p className="mt-1 text-sm text-on-surface-variant">Thu hồi toàn bộ access token và refresh token đang hoạt động.</p></div><button type="button" onClick={() => { setError(''); setLogoutAllOpen(true); }} className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-container">Đăng xuất mọi thiết bị</button></div>
          </section>
        </div>
      </div>
    </div>

    <Modal open={editOpen} title="Chỉnh sửa thông tin" description="Thông tin đầy đủ chỉ hiển thị trong lúc bạn chỉnh sửa." onClose={() => { setEditOpen(false); setError(''); }} size="max-w-2xl">
      <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
        {error && <div className="sm:col-span-2"><Feedback error={error} message="" /></div>}
        <div className="sm:col-span-2"><Field label="Họ và tên" icon="person" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} minLength={2} maxLength={150} required /></div>
        <div><Field label="Email" icon="mail" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setAvailability({ ...availability, email: undefined }); }} onBlur={() => void checkAvailability('email')} required /><Availability value={availability.email} label="email" /></div>
        <div><Field label="Số điện thoại" icon="call" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setAvailability({ ...availability, phone: undefined }); }} onBlur={() => void checkAvailability('phone')} maxLength={20} type="tel" /><Availability value={availability.phone} label="số điện thoại" /></div>
        <Field label="Ngày sinh" icon="cake" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} max={new Date().toISOString().slice(0, 10)} type="date" />
        <div className="flex items-end justify-end"><button disabled={saving} className="flex h-11 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-on-primary disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
      </form>
    </Modal>

    <Modal open={passwordOpen} title="Đổi mật khẩu" description="Sau khi đổi mật khẩu, tài khoản sẽ đăng xuất khỏi mọi thiết bị." onClose={() => { setPasswordOpen(false); setError(''); }}>
      <form onSubmit={changePassword} className="space-y-5">
        {error && <Feedback error={error} message="" />}
        <PasswordField label="Mật khẩu hiện tại" icon="lock" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required autoComplete="current-password" />
        <PasswordField label="Mật khẩu mới" icon="password" minLength={8} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} required autoComplete="new-password" />
        <PasswordField label="Xác nhận mật khẩu mới" icon="verified_user" minLength={8} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required autoComplete="new-password" />
        <div className="flex justify-end gap-3"><button type="button" onClick={() => setPasswordOpen(false)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button><button disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-70">{saving ? 'Đang xử lý...' : 'Đổi mật khẩu'}</button></div>
      </form>
    </Modal>

    <Modal open={logoutAllOpen} title="Đăng xuất mọi thiết bị?" description="Tất cả phiên đăng nhập, bao gồm thiết bị hiện tại, sẽ bị thu hồi." onClose={() => { if (!logoutAllBusy) setLogoutAllOpen(false); setError(''); }}>
      <div className="space-y-5">
        {error && <Feedback error={error} message="" />}
        <div className="flex gap-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container"><span className="material-symbols-outlined">warning</span><p>Bạn sẽ phải đăng nhập lại trên tất cả trình duyệt và thiết bị sau thao tác này.</p></div>
        <div className="flex justify-end gap-3"><button type="button" disabled={logoutAllBusy} onClick={() => setLogoutAllOpen(false)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container disabled:opacity-60">Hủy</button><button type="button" disabled={logoutAllBusy} onClick={() => void signOutEverywhere()} className="inline-flex items-center gap-2 rounded-full bg-error px-6 py-2.5 font-semibold text-on-error disabled:opacity-60"><span className={`material-symbols-outlined text-xl ${logoutAllBusy ? 'animate-spin' : ''}`}>{logoutAllBusy ? 'progress_activity' : 'logout'}</span>{logoutAllBusy ? 'Đang thu hồi...' : 'Đăng xuất mọi thiết bị'}</button></div>
      </div>
    </Modal>

    {reauthOpen && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-inverse-surface/60 p-5" role="dialog" aria-modal="true" aria-labelledby="reauth-title"><form onSubmit={confirmReauthentication} className="w-full max-w-md rounded-lg bg-surface-container-lowest p-6 shadow-2xl">{error && <div className="mb-4"><Feedback error={error} message="" /></div>}<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed"><span className="material-symbols-outlined">verified_user</span></div><h2 id="reauth-title" className="mt-4 text-xl font-semibold">Xác thực thay đổi quan trọng</h2><p className="mt-2 text-sm text-on-surface-variant">Nhập mật khẩu hiện tại để thay đổi email hoặc số điện thoại.</p><div className="mt-5"><PasswordField label="Mật khẩu hiện tại" icon="lock" value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} required autoFocus autoComplete="current-password" /></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setReauthOpen(false); setError(''); }} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button><button disabled={saving} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary disabled:opacity-70">Xác nhận và lưu</button></div></form></div>}
  </main>;
};

const InfoItem: React.FC<{ icon: string; label: string; value: string; privateValue?: boolean }> = ({ icon, label, value, privateValue }) => <div className="flex items-center gap-4 rounded-lg bg-surface-container-low p-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed"><span className="material-symbols-outlined text-xl">{icon}</span></span><div className="min-w-0"><p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-outline">{label}{privateValue && <span className="material-symbols-outlined text-sm" title="Thông tin đã được che">visibility_off</span>}</p><p className="mt-1 truncate font-semibold text-on-surface">{value}</p></div></div>;

const Feedback: React.FC<{ error: string; message: string }> = ({ error, message }) => <div role={error ? 'alert' : 'status'} className={`flex gap-2 rounded-lg px-4 py-3 text-sm ${error ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed'}`}><span className="material-symbols-outlined text-xl">{error ? 'error' : 'check_circle'}</span>{error || message}</div>;

const Modal: React.FC<{ open: boolean; title: string; description: string; onClose: () => void; children: React.ReactNode; size?: string }> = ({ open, title, description, onClose, children, size = 'max-w-lg' }) => {
  const titleId = React.useId();
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-inverse-surface/60 p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className={`my-auto w-full ${size} rounded-lg bg-surface-container-lowest p-6 shadow-2xl md:p-8`}><div className="mb-6 flex items-start justify-between gap-4"><div><h2 id={titleId} className="font-headline-sm text-2xl font-semibold">{title}</h2><p className="mt-1 text-sm text-on-surface-variant">{description}</p></div><button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-outline hover:bg-surface-container" aria-label={`Đóng ${title}`}><span className="material-symbols-outlined">close</span></button></div>{children}</div></div>;
};

const Availability: React.FC<{ value?: boolean; label: string }> = ({ value, label }) => value === undefined ? null : <p className={`mt-1.5 flex items-center gap-1 text-xs ${value ? 'text-primary' : 'text-error'}`}><span className="material-symbols-outlined text-base">{value ? 'check_circle' : 'cancel'}</span>{value ? `Có thể sử dụng ${label} này` : `${label} này đã được sử dụng`}</p>;
