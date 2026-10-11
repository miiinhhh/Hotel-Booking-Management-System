import React, { useState } from 'react';

export const PrivilegeBanner: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setIsSubscribed(true);
      setEmail('');
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto w-full px-margin-mobile md:px-margin mt-20 md:mt-28 mb-12">
      <div className="relative rounded-2xl bg-surface-container-high p-8 md:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Decorative background accent */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-primary-fixed/30 blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <span className="font-label-sm text-label-sm font-semibold text-primary uppercase tracking-widest">
            Đặc quyền hội viên StayLuxe
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface mt-2 tracking-tight">
            Nhận ngay 15% ưu đãi cho kỳ nghỉ đầu tiên
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Đăng ký để mở khóa mức giá thành viên độc quyền và dịch vụ nâng cấp phòng miễn phí tại hơn 500 khách sạn hàng đầu.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {isSubscribed ? (
            <div className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-primary/10 text-primary font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>Cảm ơn bạn! Ưu đãi đã được gửi tới email.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-center gap-3 w-full">
              <input
                className="w-full sm:w-80 px-5 py-3.5 rounded-full bg-surface-container-lowest text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm border-0"
                placeholder="Nhập địa chỉ email của bạn..."
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 px-7 py-3.5 rounded-full bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-semibold transition-colors shadow-sm cursor-pointer border-0"
              >
                Nhận ưu đãi
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
export default PrivilegeBanner;
