import React, { FormEvent, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/authApi';
import { AccountShell, Field } from './AccountShell';

interface RegisterPageProps { onLogin: () => void; onSuccess: () => void; }

export const RegisterPage: React.FC<RegisterPageProps> = ({ onLogin, onSuccess }) => {
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<{ email?: boolean; phone?: boolean }>({});

  const checkAvailability = async (kind: 'email' | 'phone', value: string) => {
    if (!value.trim()) return;
    try {
      const result = await authApi.registrationAvailability(kind === 'email' ? value : undefined, kind === 'phone' ? value : undefined);
      setAvailability((current) => ({ ...current, [kind]: kind === 'email' ? result.emailAvailable : result.phoneAvailable }));
    } catch { setAvailability((current) => ({ ...current, [kind]: undefined })); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password'));
    if (password !== String(data.get('confirmPassword'))) {
      setError('Mật khẩu xác nhận chưa trùng khớp.');
      return;
    }
    if (availability.email === false || availability.phone === false) {
      setError('Email hoặc số điện thoại đã được tài khoản khác sử dụng.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await register({
        fullName: String(data.get('fullName')),
        email: String(data.get('email')),
        phone: String(data.get('phone')),
        dateOfBirth: String(data.get('dateOfBirth')),
        password,
      });
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tạo tài khoản.');
    } finally {
      setSubmitting(false);
    }
  };

  return <AccountShell eyebrow="Thành viên mới" title="Tạo tài khoản StayLuxe" description="Lưu thông tin một lần để các lần đặt phòng sau nhanh và thuận tiện hơn.">
    <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
      {error && <div role="alert" className="col-span-full flex gap-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container"><span className="material-symbols-outlined text-xl">error</span><span>{error}</span></div>}
      <div className="sm:col-span-2"><Field name="fullName" label="Họ và tên" icon="person" minLength={2} maxLength={150} required autoComplete="name" /></div>
      <div className="sm:col-span-2"><Field name="email" label="Email" icon="mail" type="email" maxLength={255} required autoComplete="email" onChange={() => setAvailability((current) => ({ ...current, email: undefined }))} onBlur={(event) => void checkAvailability('email', event.target.value)} />{availability.email !== undefined && <Availability available={availability.email} label="email" />}</div>
      <div><Field name="phone" label="Số điện thoại" icon="call" type="tel" maxLength={20} autoComplete="tel" onChange={() => setAvailability((current) => ({ ...current, phone: undefined }))} onBlur={(event) => void checkAvailability('phone', event.target.value)} />{availability.phone !== undefined && <Availability available={availability.phone} label="số điện thoại" />}</div>
      <Field name="dateOfBirth" label="Ngày sinh" icon="cake" type="date" max={new Date().toISOString().slice(0, 10)} />
      <Field name="password" label="Mật khẩu" icon="lock" type="password" minLength={8} maxLength={100} required autoComplete="new-password" />
      <Field name="confirmPassword" label="Xác nhận mật khẩu" icon="verified_user" type="password" minLength={8} required autoComplete="new-password" />
      <label className="col-span-full flex cursor-pointer items-start gap-3 text-sm text-on-surface-variant"><input required type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span>Tôi đồng ý với điều khoản sử dụng và chính sách bảo mật của StayLuxe.</span></label>
      <button disabled={submitting} className="col-span-full flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary shadow-sm hover:bg-primary-container disabled:cursor-wait disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${submitting ? 'animate-spin' : ''}`}>{submitting ? 'progress_activity' : 'person_add'}</span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
    </form>
    <p className="mt-7 text-center text-sm text-on-surface-variant">Đã có tài khoản? <button onClick={onLogin} className="font-semibold text-primary hover:underline">Đăng nhập</button></p>
  </AccountShell>;
};

const Availability: React.FC<{ available: boolean; label: string }> = ({ available, label }) => <p className={`mt-1.5 flex items-center gap-1 text-xs ${available ? 'text-primary' : 'text-error'}`}><span className="material-symbols-outlined text-base">{available ? 'check_circle' : 'cancel'}</span>{available ? `Có thể sử dụng ${label} này` : `${label} này đã được sử dụng`}</p>;
