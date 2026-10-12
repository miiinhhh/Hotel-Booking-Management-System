import React, { useState, useEffect } from 'react';

export const CheckoutUrgencyBanner: React.FC = () => {
  const [secondsLeft, setSecondsLeft] = useState(14 * 60 + 59);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="w-full bg-secondary-fixed/40 rounded-lg p-space-sm md:p-space-md flex items-center justify-between gap-space-sm shadow-sm transition-all duration-300">
      <div className="flex items-center gap-space-sm">
        <div className="w-8 h-8 rounded-full bg-primary-container/15 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
        </div>
        <p className="font-body-md text-body-md text-on-secondary-fixed">
          Phòng của quý khách được bảo lưu trong{' '}
          <span className="font-bold text-primary font-headline-sm text-headline-sm inline-block mx-1">
            {timeString}
          </span>{' '}
          phút. Hoàn tất thanh toán để đảm bảo mức giá ưu đãi đặc quyền.
        </p>
      </div>
      <div className="hidden lg:flex items-center gap-1 text-on-secondary-fixed-variant font-label-sm text-label-sm uppercase tracking-wider shrink-0">
        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
        Giá ưu đãi cố định
      </div>
    </div>
  );
};
