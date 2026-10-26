import React from 'react';

interface AccountShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export const AccountShell: React.FC<AccountShellProps> = ({ eyebrow, title, description, children }) => (
  <main className="min-h-[calc(100vh-5rem)] bg-background pt-20">
    <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1440px] lg:grid-cols-[minmax(320px,0.9fr)_minmax(500px,1.1fr)]">
      <section className="relative hidden min-h-[680px] overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1400&q=85"
          alt="Không gian nghỉ dưỡng StayLuxe"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/85 via-inverse-surface/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-inverse-on-surface xl:p-14">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-on-primary">
            <span className="material-symbols-outlined">villa</span>
          </div>
          <p className="max-w-lg font-headline-md text-3xl font-semibold leading-tight">Mỗi hành trình đáng nhớ bắt đầu từ một nơi lưu trú vừa ý.</p>
          <p className="mt-4 max-w-md text-sm text-inverse-on-surface/80">Quản lý kỳ nghỉ, thông tin cá nhân và quyền truy cập StayLuxe trong cùng một tài khoản.</p>
        </div>
      </section>
      <section className="flex items-center px-margin-mobile py-10 md:px-margin lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-label-sm font-semibold uppercase text-primary">{eyebrow}</p>
          <h1 className="mt-3 font-headline-lg text-3xl font-semibold text-on-surface md:text-4xl">{title}</h1>
          <p className="mt-3 text-body-md text-on-surface-variant">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  </main>
);

export const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon: string }> = ({ label, icon, className = '', ...props }) => (
  <label className="block text-sm font-semibold text-on-surface">
    {label}
    <span className="relative mt-2 block">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-outline">{icon}</span>
      <input {...props} className={`h-12 w-full rounded-lg border border-outline-variant/60 bg-surface-container-lowest pl-12 pr-4 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 ${className}`} />
    </span>
  </label>
);
