import React from 'react';
export const PrivilegeBanner: React.FC<{ onExplore?: () => void }> = ({ onExplore }) => (
  <section className="mx-auto mb-12 mt-16 w-full max-w-[1440px] px-5"><div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-surface-container-high p-8 md:flex-row md:items-center md:p-12"><div><h2 className="text-3xl font-semibold">Lên kế hoạch cho kỳ nghỉ</h2><p className="mt-3 text-on-surface-variant">Tìm phòng theo ngày lưu trú, số khách và ngân sách của bạn.</p></div><button type="button" onClick={onExplore} className="shrink-0 rounded-full bg-primary px-6 py-3 text-on-primary">Khám phá phòng trống</button></div></section>
);
export default PrivilegeBanner;
