import React, { FormEvent, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AccountShell, Field } from './AccountShell';

interface LoginPageProps {
  onRegister: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onRegister, onSuccess }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      await login(String(data.get('email')), String(data.get('password')), data.get('remember') === 'on');
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Đăng nhập không thành công.');
    } finally {
      setSubmitting(false);
    }
  };

  return <AccountShell eyebrow="Tài khoản StayLuxe" title="Chào mừng bạn trở lại" description="Đăng nhập để quản lý hồ sơ và các kỳ nghỉ đã đặt.">
    <form onSubmit={submit} className="space-y-5">
      {error && <div role="alert" className="flex gap-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container"><span className="material-symbols-outlined text-xl">error</span><span>{error}</span></div>}
      <Field name="email" label="Email" icon="mail" type="email" autoComplete="email" required placeholder="tenban@email.com" />
      <div>
        <Field name="password" label="Mật khẩu" icon="lock" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="pr-12" />
        <button type="button" onClick={() => setShowPassword((value) => !value)} className="float-right -mt-10 mr-3 flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-container" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface-variant"><input name="remember" type="checkbox" className="h-4 w-4 accent-primary" /><span>Duy trì đăng nhập trên thiết bị này</span></label>
      <button disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary shadow-sm transition hover:bg-primary-container disabled:cursor-wait disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${submitting ? 'animate-spin' : ''}`}>{submitting ? 'progress_activity' : 'login'}</span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
    </form>
    <p className="mt-7 text-center text-sm text-on-surface-variant">Chưa có tài khoản? <button onClick={onRegister} className="font-semibold text-primary hover:underline">Đăng ký ngay</button></p>
  </AccountShell>;
};
