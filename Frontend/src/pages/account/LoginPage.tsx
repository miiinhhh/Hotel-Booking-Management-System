import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi, OtpChannel } from '../../services/authApi';
import { AccountShell, Field } from './AccountShell';

interface LoginPageProps { onRegister: () => void; onSuccess: () => void; }
type Mode = 'password' | 'otp' | 'reset';

declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    } } };
  }
}

export const LoginPage: React.FC<LoginPageProps> = ({ onRegister, onSuccess }) => {
  const { login, loginWithOtp, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [channel, setChannel] = useState<OtpChannel>('Email');
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

  useEffect(() => {
    if (!googleClientId || !googleButton.current) return;
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
  }, [googleClientId, loginWithGoogle, onSuccess]);

  const startMode = (next: Mode) => {
    setMode(next); setChallengeId(''); setCode(''); setNewPassword(''); setMessage(''); setError('');
  };

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    setSubmitting(true); setError('');
    try { await login(String(data.get('email')), String(data.get('password')), remember); onSuccess(); }
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

  return <AccountShell eyebrow="Tài khoản StayLuxe" title={mode === 'password' ? 'Chào mừng bạn trở lại' : mode === 'otp' ? 'Đăng nhập bằng mã OTP' : 'Khôi phục mật khẩu'} description={mode === 'password' ? 'Đăng nhập để quản lý hồ sơ và các kỳ nghỉ đã đặt.' : 'Mã xác thực 6 chữ số sẽ được gửi đến thông tin đã đăng ký.'}>
    {mode === 'password' ? <form onSubmit={submitPassword} className="space-y-5">
      {notice}
      <Field name="email" label="Email" icon="mail" type="email" autoComplete="email" required placeholder="tenban@email.com" />
      <div>
        <Field name="password" label="Mật khẩu" icon="lock" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required className="pr-12" />
        <button type="button" onClick={() => setShowPassword((value) => !value)} className="float-right -mt-10 mr-3 flex h-8 w-8 items-center justify-center rounded-full text-outline hover:bg-surface-container" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}><span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Remember checked={remember} onChange={setRemember} />
        <button type="button" onClick={() => startMode('reset')} className="text-sm font-semibold text-primary hover:underline">Quên mật khẩu?</button>
      </div>
      <PrimaryButton loading={submitting} icon="login">Đăng nhập</PrimaryButton>
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-outline"><span className="h-px flex-1 bg-outline-variant/50" />Hoặc<span className="h-px flex-1 bg-outline-variant/50" /></div>
      <button type="button" onClick={() => startMode('otp')} className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest font-semibold text-on-surface hover:bg-surface-container-low"><span className="material-symbols-outlined">password</span>Đăng nhập bằng OTP</button>
      {googleClientId && <div className="flex justify-center overflow-hidden" ref={googleButton} />}
    </form> : <form onSubmit={challengeId ? verifyCode : requestCode} className="space-y-5">
      {notice}
      {!challengeId ? <>
        <div className="grid grid-cols-2 gap-2 rounded-full bg-surface-container p-1">
          {(['Email', 'Phone'] as OtpChannel[]).map((item) => <button key={item} type="button" onClick={() => setChannel(item)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${channel === item ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant'}`}>{item === 'Email' ? 'Email' : 'Điện thoại'}</button>)}
        </div>
        <Field label={channel === 'Email' ? 'Email đã đăng ký' : 'Số điện thoại đã đăng ký'} icon={channel === 'Email' ? 'mail' : 'call'} type={channel === 'Email' ? 'email' : 'tel'} value={destination} onChange={(event) => setDestination(event.target.value)} required autoComplete={channel === 'Email' ? 'email' : 'tel'} />
        <PrimaryButton loading={submitting} icon="send">Gửi mã xác thực</PrimaryButton>
      </> : <>
        <Field label="Mã xác thực" icon="pin" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="one-time-code" />
        {mode === 'reset' && <Field label="Mật khẩu mới" icon="lock_reset" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={100} required autoComplete="new-password" />}
        {mode === 'otp' && <Remember checked={remember} onChange={setRemember} />}
        <PrimaryButton loading={submitting} icon={mode === 'otp' ? 'login' : 'lock_reset'}>{mode === 'otp' ? 'Xác thực và đăng nhập' : 'Đặt lại mật khẩu'}</PrimaryButton>
        <button type="button" onClick={() => setChallengeId('')} className="w-full text-sm font-semibold text-primary hover:underline">Gửi lại hoặc đổi thông tin nhận mã</button>
      </>}
      <button type="button" onClick={() => startMode('password')} className="flex w-full items-center justify-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-lg">arrow_back</span>Quay lại đăng nhập</button>
    </form>}
    <p className="mt-7 text-center text-sm text-on-surface-variant">Chưa có tài khoản? <button onClick={onRegister} className="font-semibold text-primary hover:underline">Đăng ký ngay</button></p>
  </AccountShell>;
};

const Remember: React.FC<{ checked: boolean; onChange: (value: boolean) => void }> = ({ checked, onChange }) => <label className="flex cursor-pointer items-center gap-3 text-sm text-on-surface-variant"><input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" className="h-4 w-4 accent-primary" /><span>Duy trì đăng nhập</span></label>;

const PrimaryButton: React.FC<{ loading: boolean; icon: string; children: React.ReactNode }> = ({ loading, icon, children }) => <button disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold text-on-primary shadow-sm transition hover:bg-primary-container disabled:cursor-wait disabled:opacity-70"><span className={`material-symbols-outlined text-xl ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : icon}</span>{loading ? 'Đang xử lý...' : children}</button>;
