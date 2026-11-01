import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { absoluteApiUrl, authApi } from '../../services/authApi';
import { Field } from './AccountShell';

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
    try { await updateProfile(form); setMessage('Thông tin hồ sơ đã được cập nhật.'); setAvailability({}); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể cập nhật hồ sơ.'); }
    finally { setSaving(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (availability.email === false || availability.phone === false) { setError('Email hoặc số điện thoại đã được tài khoản khác sử dụng.'); return; }
    if (identityChanged) { setReauthPassword(''); setReauthOpen(true); return; }
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

  return <main className="min-h-screen bg-background px-margin-mobile pb-20 pt-32 md:px-margin">
    <div className="mx-auto max-w-6xl">
      <p className="text-label-sm font-semibold uppercase text-primary">Tài khoản của tôi</p>
      <h1 className="mt-2 font-headline-lg text-3xl font-semibold md:text-4xl">Hồ sơ cá nhân</h1>
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
          <p className="mt-1 break-all text-sm text-outline">{profile?.email || session.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">{session.roles.map((role) => <span key={role} className="rounded-full bg-secondary-fixed px-3 py-1 text-xs font-semibold text-on-secondary-fixed">{role}</span>)}</div>
          <div className="mt-6 border-t border-outline-variant/30 pt-5">
            <button onClick={onBookings} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-surface-container-low"><span className="material-symbols-outlined">luggage</span>Đặt phòng của tôi</button>
            <button onClick={() => { void logout(); onLogin(); }} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-error hover:bg-error-container"><span className="material-symbols-outlined">logout</span>Đăng xuất</button>
          </div>
        </aside>
        <div className="space-y-6">
          {(message || error) && <div role={error ? 'alert' : 'status'} className={`flex gap-2 rounded-lg px-4 py-3 text-sm ${error ? 'bg-error-container text-on-error-container' : 'bg-secondary-fixed text-on-secondary-fixed'}`}><span className="material-symbols-outlined text-xl">{error ? 'error' : 'check_circle'}</span>{error || message}</div>}
          <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="border-b border-outline-variant/30 pb-5"><h2 className="font-headline-sm text-2xl font-semibold">Thông tin liên hệ</h2><p className="mt-1 text-sm text-on-surface-variant">Thay đổi email hoặc số điện thoại cần xác thực lại bằng mật khẩu.</p></div>
            <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Họ và tên" icon="person" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} minLength={2} maxLength={150} required /></div>
              <div><Field label="Email" icon="mail" type="email" value={form.email} onChange={(e) => { setForm({ ...form, email: e.target.value }); setAvailability({ ...availability, email: undefined }); }} onBlur={() => void checkAvailability('email')} required /> <Availability value={availability.email} label="email" /></div>
              <div><Field label="Số điện thoại" icon="call" value={form.phone} onChange={(e) => { setForm({ ...form, phone: e.target.value }); setAvailability({ ...availability, phone: undefined }); }} onBlur={() => void checkAvailability('phone')} maxLength={20} type="tel" /> <Availability value={availability.phone} label="số điện thoại" /></div>
              <Field label="Ngày sinh" icon="cake" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} max={new Date().toISOString().slice(0, 10)} type="date" />
              <div className="flex items-end justify-end"><button disabled={saving} className="flex h-11 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-on-primary disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
            </form>
          </section>
          <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm md:p-8">
            <div className="border-b border-outline-variant/30 pb-5"><h2 className="font-headline-sm text-2xl font-semibold">Bảo mật tài khoản</h2><p className="mt-1 text-sm text-on-surface-variant">Đổi mật khẩu sẽ đăng xuất tài khoản khỏi tất cả thiết bị.</p></div>
            <form onSubmit={changePassword} className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2"><Field label="Mật khẩu hiện tại" icon="lock" type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required autoComplete="current-password" /></div>
              <Field label="Mật khẩu mới" icon="password" type="password" minLength={8} value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} required autoComplete="new-password" />
              <Field label="Xác nhận mật khẩu mới" icon="verified_user" type="password" minLength={8} value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required autoComplete="new-password" />
              <div className="sm:col-span-2 flex flex-wrap justify-between gap-3"><button type="button" onClick={() => { void logoutAll().catch(() => undefined); onLogin(); }} className="rounded-full border border-error px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-container">Đăng xuất tất cả thiết bị</button><button disabled={saving} className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary disabled:opacity-70">Đổi mật khẩu</button></div>
            </form>
          </section>
        </div>
      </div>
    </div>
    {reauthOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/50 p-5" role="dialog" aria-modal="true" aria-labelledby="reauth-title"><form onSubmit={confirmReauthentication} className="w-full max-w-md rounded-lg bg-surface-container-lowest p-6 shadow-2xl"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed"><span className="material-symbols-outlined">verified_user</span></div><h2 id="reauth-title" className="mt-4 text-xl font-semibold">Xác thực thay đổi quan trọng</h2><p className="mt-2 text-sm text-on-surface-variant">Nhập mật khẩu hiện tại để thay đổi email hoặc số điện thoại.</p><div className="mt-5"><Field label="Mật khẩu hiện tại" icon="lock" type="password" value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} required autoFocus autoComplete="current-password" /></div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setReauthOpen(false)} className="rounded-full px-5 py-2.5 font-semibold text-on-surface-variant hover:bg-surface-container">Hủy</button><button disabled={saving} className="rounded-full bg-primary px-5 py-2.5 font-semibold text-on-primary disabled:opacity-70">Xác nhận và lưu</button></div></form></div>}
  </main>;
};

const Availability: React.FC<{ value?: boolean; label: string }> = ({ value, label }) => value === undefined ? null : <p className={`mt-1.5 flex items-center gap-1 text-xs ${value ? 'text-primary' : 'text-error'}`}><span className="material-symbols-outlined text-base">{value ? 'check_circle' : 'cancel'}</span>{value ? `Có thể sử dụng ${label} này` : `${label} này đã được sử dụng`}</p>;
