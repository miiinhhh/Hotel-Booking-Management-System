import React from 'react';

export const FloatingSupport: React.FC = () => {
  return (
    <div className="fixed bottom-6 right-6 md:right-12 z-40">
      <div className="relative group">
        <a
          href="tel:18006868"
          className="flex items-center gap-3 bg-inverse-surface text-inverse-on-surface pl-3 pr-5 py-2.5 rounded-full shadow-[0_12px_32px_-4px_rgba(0,0,0,0.3)] hover:opacity-95 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-label-sm text-[10px] text-inverse-primary uppercase tracking-wider font-semibold">
              HỖ TRỢ 24/7
            </span>
            <span className="font-label-md text-label-md leading-tight">Hỗ trợ riêng 24/7</span>
          </div>
        </a>
      </div>
    </div>
  );
};
