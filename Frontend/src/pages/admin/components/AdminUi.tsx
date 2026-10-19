import React from 'react';

export const PageHeading: React.FC<{ title: string; description: string; actions?: React.ReactNode }> = ({ title, description, actions }) => (
  <div className="flex flex-col gap-4 py-8 xl:flex-row xl:items-center xl:justify-between">
    <div><p className="mb-2 text-xs font-semibold uppercase text-primary">StayLuxe Operations</p><h1 className="font-headline-lg text-3xl font-semibold md:text-4xl">{title}</h1><p className="mt-2 max-w-3xl text-on-surface-variant">{description}</p></div>
    {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
  </div>
);

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string }> = ({ icon, label, className = '', ...props }) => (
  <button aria-label={label} title={label} className={`flex h-9 w-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:text-primary ${className}`} {...props}><span className="material-symbols-outlined text-lg">{icon}</span></button>
);

export const Toggle: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({ checked, onChange, label }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange} className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-primary-container' : 'bg-surface-container-highest'}`}><span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} /></button>
);

export const Modal: React.FC<{ title: string; open: boolean; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }> = ({ title, open, onClose, children, footer }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-inverse-surface/45 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-surface-container-lowest shadow-2xl"><header className="sticky top-0 flex items-center justify-between bg-surface-container-lowest px-6 py-5"><h2 className="font-headline-sm text-xl font-semibold">{title}</h2><IconButton icon="close" label="Đóng" onClick={onClose} /></header><div className="px-6 pb-6">{children}</div>{footer && <footer className="sticky bottom-0 flex justify-end gap-3 bg-surface-container-low px-6 py-4">{footer}</footer>}</section></div>;
};

export const Toast: React.FC<{ message: string | null }> = ({ message }) => message ? <div className="fixed bottom-6 right-6 z-[80] flex items-center gap-2 rounded-lg bg-inverse-surface px-5 py-3 text-sm text-inverse-on-surface shadow-xl"><span className="material-symbols-outlined text-emerald-300">check_circle</span>{message}</div> : null;
