import React from 'react';

export const HeroBanner: React.FC = () => {
  return (
    <section className="relative w-full -mt-20 pt-32 pb-36 md:pb-44 bg-surface-container-low overflow-hidden">
      {/* Ambient architectural photography overlay */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none"
        data-alt="An ethereal high-end luxury sanctuary resort at morning dawn, minimal curved sandstone arches, infinity pool blending seamlessly with calm azure ocean horizon, organic warm terracotta pots, subtle mist, warm golden hour ambient lighting, architectural photography, hyper clean composition in warm ochre and linen beige tones"
        style={{
          backgroundImage:
            "url('https://lh3.googleusercontent.com/aida-public/AB6AXuA_NWmMQSJNU0BJRH4xRHp-tcvcI06hdtbztoUx_bfxm3LGLoRVFvYbhQgul3c7w6qC_ys10MVzdU912V9YhGV7r2GrfWlDlrek5Ajzr7rWkWymYV96ADkdRL1E1KWmVjmaOZi_V3GBAP_PVMWsoBYCUikmYpFMCdKrcm50GTZEq3DvnGRJCbONNpneE6smWbg7CbEEDRWdR3KFdPWN8Ajh7hADYFT5ztdR5UrZLKEQ')",
        }}
      />

      {/* Soft gradient scrims for luxury legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/40 to-surface" />
      <div className="absolute -right-24 top-1/4 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 bottom-10 w-80 h-80 rounded-full bg-primary-fixed/30 blur-3xl pointer-events-none" />

      <div className="relative max-w-[1440px] mx-auto px-margin-mobile md:px-margin text-center flex flex-col items-center">
        {/* Refined category pill */}
        <div className="inline-flex items-center gap-space-xs px-4 py-1.5 rounded-full bg-surface-container-lowest/80 backdrop-blur-md shadow-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
            Trải nghiệm nghỉ dưỡng độc bản
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-display-hero-mobile md:font-display-hero text-display-hero-mobile md:text-display-hero text-on-surface max-w-4xl tracking-tight leading-tight">
          Tìm nơi dừng chân <span className="text-primary italic font-normal">lý tưởng</span>
        </h1>

        {/* Subtitle */}
        <p className="mt-4 font-body-lg text-body-lg md:font-body-xl md:text-body-xl text-on-surface-variant max-w-2xl font-light">
          Khám phá bộ sưu tập khách sạn và khu nghỉ dưỡng cao cấp với giá ưu đãi độc quyền dành riêng cho bạn.
        </p>

        {/* Stat Badges */}
        <div className="mt-8 flex items-center justify-center gap-6 text-on-surface-variant font-label-md text-label-md flex-wrap">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
            <span>Tuyển chọn khắt khe</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-outline-variant" />
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">lock_reset</span>
            <span>Đảm bảo giá tốt nhất</span>
          </div>
          <span className="w-1 h-1 rounded-full bg-outline-variant hidden sm:inline-block" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">support_agent</span>
            <span>Hỗ trợ VIP 24/7</span>
          </div>
        </div>
      </div>
    </section>
  );
};
export default HeroBanner;
