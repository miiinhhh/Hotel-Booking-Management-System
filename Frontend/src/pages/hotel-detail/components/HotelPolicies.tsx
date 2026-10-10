import React from 'react';

export const HotelPolicies: React.FC = () => {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-space-md pt-space-md">
      {/* Policy 1 */}
      <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex items-start gap-4 border border-surface-container/60">
        <div className="w-12 h-12 rounded-2xl bg-primary-fixed/50 flex items-center justify-center text-primary shrink-0">
          <span className="material-symbols-outlined text-[24px]">
            event_repeat
          </span>
        </div>
        <div className="flex flex-col">
          <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
            Chính sách hủy linh hoạt
          </h4>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Hủy phòng miễn phí hoàn toàn trước 24 giờ nhận phòng đối với hầu hết
            các hạng phòng tiêu chuẩn.
          </p>
        </div>
      </div>

      {/* Policy 2 */}
      <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex items-start gap-4 border border-surface-container/60">
        <div className="w-12 h-12 rounded-2xl bg-secondary-fixed/50 flex items-center justify-center text-secondary shrink-0">
          <span className="material-symbols-outlined text-[24px]">verified</span>
        </div>
        <div className="flex flex-col">
          <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
            Cam kết giá tốt nhất
          </h4>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Thành viên StayLuxe luôn được đảm bảo mức giá ưu đãi độc quyền kèm
            quyền nâng hạng phòng tùy tình trạng.
          </p>
        </div>
      </div>

      {/* Policy 3 */}
      <div className="p-space-md rounded-2xl bg-surface-container-lowest shadow-sm flex items-start gap-4 border border-surface-container/60">
        <div className="w-12 h-12 rounded-2xl bg-tertiary-fixed/50 flex items-center justify-center text-tertiary shrink-0">
          <span className="material-symbols-outlined text-[24px]">lock</span>
        </div>
        <div className="flex flex-col">
          <h4 className="font-label-lg text-label-lg font-bold text-on-surface">
            Bảo mật thanh toán
          </h4>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Giao dịch mã hóa an toàn tiêu chuẩn quốc tế PCI-DSS. Hỗ trợ đa dạng
            phương thức thanh toán linh hoạt.
          </p>
        </div>
      </div>
    </section>
  );
};
export default HotelPolicies;
