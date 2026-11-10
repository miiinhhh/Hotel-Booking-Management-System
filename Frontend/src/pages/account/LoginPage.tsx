import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi, LoginPortal, OtpChannel } from '../../services/authApi';
import { AccountShell, Field, PasswordField } from './AccountShell';

interface LoginPageProps {
  portal?: LoginPortal;
  onRegister?: () => void;
  onSuccess: () => void;
}
type Mode = 'password' | 'otp' | 'reset';

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    } } };
  }
}

export const LoginPage: React.FC<LoginPageProps> = ({ portal = 'customer', onRegister, onSuccess }) => {
  const { login, loginWithOtp, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [remember, setRemember] = useState(false);
  const channel: OtpChannel = 'Email';
  const [destination, setDestination] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const googleButton = useRef<HTMLDivElement>(null);
  const rememberRef = useRef(remember);
  rememberRef.current = remember;
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const isCustomerPortal = portal === 'customer';
  const portalText = portal === 'admin'
    ? { eyebrow: 'Cổng quản trị StayLuxe', title: 'Đăng nhập quản trị', description: 'Chỉ tài khoản Admin được phép truy cập hệ thống quản trị.' }
    : portal === 'staff'
      ? { eyebrow: 'Cổng nhân viên StayLuxe', title: 'Đăng nhập nhân viên', description: 'Dành cho nhân viên khách sạn đã được quản trị viên cấp tài khoản.' }
      : { eyebrow: 'Tài khoản StayLuxe', title: 'Chào mừng bạn trở lại', description: 'Đăng nhập để quản lý hồ sơ và các kỳ nghỉ đã đặt.' };

  useEffect(() => {
    if (!isCustomerPortal || !googleClientId || !googleButton.current) return;
    const render = () => {
      if (!window.google || !googleButton.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setSubmitting(true); setError('');
          try { await loginWithGoogle(credential, rememberRef.current); onSuccess(); }
          catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập bằng Google.'); }
          finally { setSubmitting(false); }
        },
      });
      googleButton.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButton.current, { theme: 'outline', size: 'large', shape: 'pill', width: 360, text: 'continue_with' });
    };
    if (window.google) { render(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.onload = render;
    document.head.appendChild(script);
    return () => { script.onload = null; };
  }, [googleClientId, isCustomerPortal, loginWithGoogle, onSuccess]);

  const startMode = (next: Mode) => {
    setMode(next); setChallengeId(''); setCode(''); setNewPassword(''); setMessage(''); setError('');
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setSubmitting(true); setError('');
    try { await login(String(data.get('email')), String(data.get('password')), remember, portal); onSuccess(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Đăng nhập không thành công.'); }
    finally { setSubmitting(false); }
  };

  const requestCode = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(''); setMessage('');
    try {
      const result = await authApi.requestOtp(destination, channel, mode === 'otp' ? 'Login' : 'PasswordReset');
      setChallengeId(result.challengeId);
      setMessage(`Mã xác thực đã được gửi. Mã có hiệu lực đến ${new Date(result.expiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể gửi mã xác thực.'); }
    finally { setSubmitting(false); }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      if (mode === 'otp') { await loginWithOtp(challengeId, code, remember); onSuccess(); }
      else { await authApi.resetPassword(challengeId, code, newPassword); setMessage('Đổi mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'); setMode('password'); }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Mã xác thực không hợp lệ.'); }
    finally { setSubmitting(false); }
  };

  const notice = <>
    {message && <div role="status" className="flex gap-3 rounded-lg bg-secondary-fixed px-4 py-3 text-sm text-on-secondary-fixed"><span className="material-symbols-outlined text-xl">check_circle</span><span>{message}</span></div>}
    {error && <div role="alert" className="flex gap-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container"><span className="material-symbols-outlined text-xl">error</span><span>{error}</span></div>}
  </>;

  return <AccountShell eyebrow={portalText.eyebrow} title={mode === 'password' ? portalText.title : mode === 'otp' ? 'Đăng nhập bằng mã OTP' : 'Khôi phục mật khẩu'} description={mode === 'password' ? portalText.description : 'Mã xác thực 6 chữ số sẽ được gửi đến thông tin đã đăng ký.'}>
    {mode === 'password' ? <form onSubmit={submitPassword} className="space-y-5">
      {notice}
      <Field name="email" label="Email" icon="mail" type="email" autoComplete="email" required placeholder="tenban@email.com" />
      <PasswordField name="password" label="Mật khẩu" icon="lock" autoComplete="current-password" required />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Remember checked={remember} onChange={setRemember} />
        <button type="button" onClick={() => startMode('reset')} className="text-sm font-semibold text-primary hover:underline">Quên mật khẩu?</button>
      </div>
      <PrimaryButton loading={submitting} icon="login">Đăng nhập</PrimaryButton>
      {isCustomerPortal && <>
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-outline"><span className="h-px flex-1 bg-outline-variant/50" />Hoặc<span className="h-px flex-1 bg-outline-variant/50" /></div>
        <button type="button" onClick={() => startMode('otp')} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest font-semibold text-on-surface hover:bg-surface-container-low"><span className="material-symbols-outlined">password</span>Đăng nhập bằng OTP</button>
        {googleClientId && <div className="flex justify-center overflow-hidden" ref={googleButton} />}
      </>}
    </form> : <form onSubmit={challengeId ? verifyCode : requestCode} className="space-y-5">
      {notice}
      {!challengeId ? <>
        <div className="flex items-center gap-3 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant"><span className="material-symbols-outlined text-primary">mail</span>Mã OTP sẽ được gửi đến email đã đăng ký.</div>
        <Field label="Email đã đăng ký" icon="mail" type="email" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="tenban@email.com" required autoComplete="email" />
        <PrimaryButton loading={submitting} icon="send">Gửi mã xác thực</PrimaryButton>
      </> : <>
        <Field label="Mã xác thực" icon="pin" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="one-time-code" />
        {mode === 'reset' && <PasswordField label="Mật khẩu mới" icon="lock_reset" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={100} required autoComplete="new-password" />}
        {mode === 'otp' && <Remember checked={remember} onChange={setRemember} />}
        <PrimaryButton loading={submitting} icon={mode === 'otp' ? 'login' : 'lock_reset'}>{mode === 'otp' ? 'Xác thực và đăng nhập' : 'Đặt lại mật khẩu'}</PrimaryButton>
        <button type="button" onClick={() => setChallengeId('')} className="w-full text-sm font-semibold text-primary hover:underline">Gửi lại hoặc đổi thông tin nhận mã</button>
      </>}
      <button type="button" onClick={() => startMode('password')} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-lg">arrow_back</span>Quay lại đăng nhập</button>
    </form>}
    {isCustomerPortal && onRegister
      ? <p className="mt-7 text-center text-sm text-on-surface-variant">Chưa có tài khoản? <button onClick={onRegister} className="font-semibold text-primary hover:underline">Đăng ký ngay</button></p>
      : <p className="mt-7 rounded-lg bg-surface-container-low px-4 py-3 text-center text-sm text-on-surface-variant">Tài khoản {portal === 'admin' ? 'quản trị' : 'nhân viên'} do quản trị viên cấp, không hỗ trợ đăng ký tại đây.</p>}
  </AccountShell>;
};

const Remember: React.FC<{ checked: boolean; onChange: (value: boolean) => void }> = ({ checked, onChange }) => <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface-variant"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" className="h-4 w-4 accent-primary" /><span>Duy trì đăng nhập</span></label>;

const PrimaryButton: React.FC<{ loading: boolean; icon: string; children: React.ReactNode }> = ({ loading, icon, children }) => <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary shadow-sm transition hover:bg-primary-container disabled:cursor-wait disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : icon}</span>{loading ? 'Đang xử lý...' : children}</button>;
