import React, { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Field } from './AccountShell';

interface ProfilePageProps { onLogin: () => void; onBookings: () => void; }

const dateValue = (value: string | null | undefined) => value ? value.slice(0, 10) : '';

export const ProfilePage: React.FC<ProfilePageProps> = ({ onLogin, onBookings }) => {
  const { session, profile, loading, updateProfile, logout } = useAuth();
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) setForm({ fullName: profile.fullName, phone: profile.phone || '', dateOfBirth: dateValue(profile.dateOfBirth) });
  }, [profile]);

  if (!session) return <main className="min-h-[70vh] bg-background px-5 pt-36 text-center"><span className="material-symbols-outlined text-5xl text-primary">lock</span><h1 className="mt-4 font-headline-md text-3xl font-semibold">Đăng nhập để xem hồ sơ</h1><button onClick={onLogin} className="mt-6 rounded-full bg-primary px-7 py-3 font-semibold text-on-primary">Đăng nhập</button></main>;
  if (loading && !profile) return <main className="flex min-h-[70vh] items-center justify-center pt-20"><span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span></main>;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    try { await updateProfile(form); setMessage('Thông tin hồ sơ đã được cập nhật.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể cập nhật hồ sơ.'); }
    finally { setSaving(false); }
  };
  const initials = (profile?.fullName || session.fullName).split(' ').filter(Boolean).map((part) => part[0]).slice(-2).join('').toUpperCase();

  return <main className="min-h-screen bg-background px-margin-mobile pb-20 pt-32 md:px-margin">
    <div className="mx-auto max-w-6xl">
      <p className="text-label-sm font-semibold uppercase text-primary">Tài khoản của tôi</p>
      <h1 className="mt-2 font-headline-lg text-3xl font-semibold md:text-4xl">Hồ sơ cá nhân</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-lg bg-surface-container-lowest p-6 shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-fixed text-2xl font-semibold text-on-primary-fixed">{initials}</div>
          <h2 className="mt-4 text-lg font-semibold">{profile?.fullName || session.fullName}</h2>
          <p className="mt-1 break-all text-sm text-outline">{session.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">{session.roles.map((role) => <span key={role} className="rounded-full bg-secondary-fixed px-3 py-1 text-xs font-semibold text-on-secondary-fixed">{role}</span>)}</div>
          <div className="mt-6 border-t border-outline-variant/30 pt-5">
            <button onClick={onBookings} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-surface-container-low"><span className="material-symbols-outlined">luggage</span>Đặt phòng của tôi</button>
            <button onClick={() => { logout(); onLogin(); }} className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-error hover:bg-error-container"><span className="material-symbols-outlined">logout</span>Đăng xuất</button>
          </div>
        </aside>
        <section className="rounded-lg bg-surface-container-lowest p-6 shadow-sm md:p-8">
          <div className="border-b border-outline-variant/30 pb-5"><h2 className="font-headline-sm text-2xl font-semibold">Thông tin liên hệ</h2><p className="mt-1 text-sm text-on-surface-variant">Thông tin được dùng cho xác nhận và hỗ trợ đặt phòng.</p></div>
          <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
            {message && <div className="col-span-full flex gap-2 rounded-lg bg-secondary-fixed px-4 py-3 text-sm text-on-secondary-fixed"><span className="material-symbols-outlined text-xl">check_circle</span>{message}</div>}
            {error && <div className="col-span-full rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{error}</div>}
            <div className="sm:col-span-2"><Field label="Họ và tên" icon="person" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} minLength={2} maxLength={150} required /></div>
            <Field label="Số điện thoại" icon="call" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} type="tel" />
            <Field label="Ngày sinh" icon="cake" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} max={new Date().toISOString().slice(0, 10)} type="date" />
            <div className="sm:col-span-2"><Field label="Email" icon="mail" value={session.email} readOnly className="cursor-not-allowed bg-surface-container text-outline" /></div>
            <div className="sm:col-span-2 flex justify-end"><button disabled={saving} className="flex h-11 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-on-primary disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${saving ? 'animate-spin' : ''}`}>{saving ? 'progress_activity' : 'save'}</span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
          </form>
        </section>
      </div>
    </div>
  </main>;
};
