import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Modal, PageHeading, Toast, Toggle } from '../components/AdminUi';
import {
  createVoucher,
  deleteVoucher,
  getVouchersList,
  toggleVoucherStatus,
  VoucherResponseDto,
} from '../../../services/voucherAdminApi';
import {
  CancellationPolicyDto,
  createCancellationPolicy,
  deleteCancellationPolicy,
  getCancellationPoliciesByHotel,
} from '../../../services/cancellationAdminApi';

export const AdminVouchers: React.FC = () => {
  const [tab, setTab] = useState<'voucher' | 'policy'>('voucher');
  const [selectedHotelId] = useState<number>(1);

  // Vouchers state
  const [vouchers, setVouchers] = useState<VoucherResponseDto[]>([]);
  const [voucherFilter, setVoucherFilter] = useState<'all' | 'active' | 'paused' | 'limit'>('all');
  const [voucherLoading, setVoucherLoading] = useState<boolean>(true);
  const [voucherModalOpen, setVoucherModalOpen] = useState<boolean>(false);

  // Policies state
  const [policies, setPolicies] = useState<CancellationPolicyDto[]>([]);
  const [policyLoading, setPolicyLoading] = useState<boolean>(false);
  const [policyModalOpen, setPolicyModalOpen] = useState<boolean>(false);

  // Shared state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' ₫';
  };

  // 1. Tải danh sách Voucher từ Backend API
  const fetchVouchers = async () => {
    setVoucherLoading(true);
    setError(null);
    try {
      const res = await getVouchersList({ page: 1, pageSize: 50 });
      if (res.success && res.data) {
        setVouchers(res.data.items);
      } else {
        setError(res.message || 'Không thể tải danh sách voucher.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tải voucher.');
    } finally {
      setVoucherLoading(false);
    }
  };

  // 2. Tải danh sách Chính sách hủy từ Backend API
  const fetchPolicies = async () => {
    setPolicyLoading(true);
    setError(null);
    try {
      const res = await getCancellationPoliciesByHotel(selectedHotelId, false);
      if (res.success && res.data) {
        setPolicies(res.data);
      } else {
        setError(res.message || 'Không thể tải chính sách hủy phòng.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tải chính sách hủy.');
    } finally {
      setPolicyLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    fetchPolicies();
  }, [selectedHotelId]);

  // Bộ lọc vouchers phía client cho trải nghiệm tức thời
  const filteredVouchers = useMemo(() => {
    return vouchers.filter((v) => {
      if (voucherFilter === 'active') return v.isActive;
      if (voucherFilter === 'paused') return !v.isActive;
      if (voucherFilter === 'limit') return v.usageLimit ? v.usedCount / v.usageLimit >= 0.8 : false;
      return true;
    });
  }, [vouchers, voucherFilter]);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      notify(`Đã sao chép mã ${code}.`);
    } catch {
      notify(`Mã voucher: ${code}`);
    }
  };

  // Tạo Voucher mới gọi API Backend thật
  const handleCreateVoucher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const code = String(form.get('code')).trim().toUpperCase();
    const voucherType = String(form.get('voucherType') || 'Percentage');
    const discountValue = Number(form.get('discountValue')) || 0;
    const minimumOrderAmount = Number(form.get('minimumOrderAmount')) || 0;
    const maxDiscountAmountRaw = form.get('maxDiscountAmount');
    const maxDiscountAmount = maxDiscountAmountRaw ? Number(maxDiscountAmountRaw) : null;
    const usageLimit = form.get('usageLimit') ? Number(form.get('usageLimit')) : null;
    const usageLimitPerCustomer = Number(form.get('usageLimitPerCustomer')) || 1;
    const startAtRaw = String(form.get('startAt') || '');
    const endAtRaw = String(form.get('endAt') || '');

    if (!code || discountValue <= 0 || !startAtRaw || !endAtRaw) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    const startAt = new Date(startAtRaw).toISOString();
    const endAt = new Date(endAtRaw).toISOString();

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createVoucher({
        code,
        voucherType,
        discountValue,
        minimumOrderAmount,
        maxDiscountAmount,
        usageLimit,
        usageLimitPerCustomer,
        startAt,
        endAt,
      });

      if (res.success && res.data) {
        notify(`Đã tạo và kích hoạt mã voucher ${code} thành công.`);
        setVoucherModalOpen(false);
        await fetchVouchers();
      } else {
        setError(res.message || 'Không thể tạo voucher.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tạo voucher.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bật/tắt trạng thái kích hoạt voucher
  const handleToggleVoucher = async (voucherId: number) => {
    try {
      const res = await toggleVoucherStatus(voucherId);
      if (res.success && res.data) {
        setVouchers((prev) =>
          prev.map((item) =>
            item.voucherId === voucherId ? { ...item, isActive: res.data!.isActive } : item
          )
        );
        notify(`Đã cập nhật trạng thái voucher.`);
      } else {
        setError(res.message || 'Không thể cập nhật trạng thái.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi đổi trạng thái.');
    }
  };

  // Xóa / vô hiệu hóa voucher
  const handleDeleteVoucher = async (voucherId: number, code: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa/ngừng kích hoạt voucher ${code}?`)) return;
    try {
      const res = await deleteVoucher(voucherId);
      if (res.success) {
        notify(`Đã ngừng kích hoạt voucher ${code}.`);
        await fetchVouchers();
      } else {
        setError(res.message || 'Không thể xóa voucher.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi xóa voucher.');
    }
  };

  // Tạo Chính sách hủy mới gọi API Backend thật
  const handleCreatePolicy = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const policyName = String(form.get('policyName')).trim();
    const daysBeforeCheckIn = Number(form.get('daysBeforeCheckIn'));
    const refundPercentage = Number(form.get('refundPercentage'));
    const depositPenaltyPercentage = Number(form.get('depositPenaltyPercentage'));

    if (!policyName || isNaN(daysBeforeCheckIn) || isNaN(refundPercentage)) {
      setError('Vui lòng điền đầy đủ thông tin chính sách hủy.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createCancellationPolicy({
        hotelId: selectedHotelId,
        policyName,
        daysBeforeCheckIn,
        refundPercentage,
        depositPenaltyPercentage,
        isActive: true,
      });

      if (res.success && res.data) {
        notify(`Đã thêm chính sách hủy "${policyName}" thành công.`);
        setPolicyModalOpen(false);
        await fetchPolicies();
      } else {
        setError(res.message || 'Không thể tạo chính sách hủy.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi tạo chính sách hủy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa chính sách hủy
  const handleDeletePolicy = async (policyId: number, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa chính sách "${name}"?`)) return;
    try {
      const res = await deleteCancellationPolicy(policyId);
      if (res.success) {
        notify(`Đã xóa chính sách "${name}".`);
        await fetchPolicies();
      } else {
        setError(res.message || 'Không thể xóa chính sách.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối khi xóa chính sách.');
    }
  };

  return (
    <>
      <PageHeading
        title="Ưu đãi Voucher & Chính sách Hoàn / Hủy"
        description="Kiểm soát ngân sách khuyến mãi và quy tắc hoàn cọc đồng bộ với hệ thống Backend & CSDL SQL Server."
        actions={
          <>
            <button
              onClick={() => {
                if (tab === 'voucher') fetchVouchers();
                else fetchPolicies();
                notify('Đã làm mới dữ liệu từ máy chủ.');
              }}
              className="flex items-center gap-2 rounded-full bg-surface-container-high px-5 py-2.5 font-semibold text-on-surface hover:bg-surface-container-highest"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Làm mới
            </button>
            {tab === 'voucher' ? (
              <button
                onClick={() => setVoucherModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Tạo voucher
              </button>
            ) : (
              <button
                onClick={() => setPolicyModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary hover:bg-primary/90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                Thêm chính sách hủy
              </button>
            )}
          </>
        }
      />

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-error-container p-4 text-on-error-container">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">error</span>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-bold uppercase tracking-wider hover:opacity-80"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 inline-flex rounded-full bg-surface-container p-1">
        <button
          onClick={() => setTab('voucher')}
          className={`rounded-full px-6 py-2.5 font-semibold ${
            tab === 'voucher'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined mr-2 align-middle text-lg">
            confirmation_number
          </span>
          Quản lý Voucher ({vouchers.length})
        </button>
        <button
          onClick={() => setTab('policy')}
          className={`rounded-full px-6 py-2.5 font-semibold ${
            tab === 'policy'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined mr-2 align-middle text-lg">policy</span>
          Chính sách Hủy / Hoàn ({policies.length})
        </button>
      </div>

      {/* TAB 1: QUẢN LÝ VOUCHER */}
      {tab === 'voucher' ? (
        <>
          {/* Thống kê Voucher từ dữ liệu thật */}
          <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article className="flex items-center gap-4 rounded-lg bg-surface-container-lowest p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-fixed text-primary">
                <span className="material-symbols-outlined">confirmation_number</span>
              </span>
              <div>
                <strong className="text-2xl">{vouchers.length}</strong>
                <p className="text-xs text-outline">Tổng mã voucher</p>
              </div>
            </article>

            <article className="flex items-center gap-4 rounded-lg bg-surface-container-lowest p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <span className="material-symbols-outlined">toggle_on</span>
              </span>
              <div>
                <strong className="text-2xl">{vouchers.filter((v) => v.isActive).length}</strong>
                <p className="text-xs text-outline">Đang kích hoạt</p>
              </div>
            </article>

            <article className="flex items-center gap-4 rounded-lg bg-surface-container-lowest p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary-fixed text-secondary">
                <span className="material-symbols-outlined">how_to_reg</span>
              </span>
              <div>
                <strong className="text-2xl">
                  {vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0)}
                </strong>
                <p className="text-xs text-outline">Tổng lượt khách đã dùng</p>
              </div>
            </article>
          </section>

          {/* Bộ lọc */}
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              ['all', `Tất cả (${vouchers.length})`],
              ['active', `Đang kích hoạt (${vouchers.filter((v) => v.isActive).length})`],
              ['paused', `Đã tạm ngưng (${vouchers.filter((v) => !v.isActive).length})`],
              ['limit', 'Gần hết lượt dùng'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setVoucherFilter(id as any)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  voucherFilter === id
                    ? 'bg-primary-container text-on-primary'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Danh sách Voucher Cards */}
          {voucherLoading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg bg-surface-container-lowest shadow-sm">
              <span className="material-symbols-outlined animate-spin text-3xl text-primary">
                progress_activity
              </span>
              <p className="text-sm text-outline">Đang tải danh sách voucher từ máy chủ...</p>
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="rounded-lg bg-surface-container-lowest p-8 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-outline">
                confirmation_number
              </span>
              <h3 className="mt-2 text-lg font-bold">Không tìm thấy voucher phù hợp</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                Chưa có mã khuyến mãi nào trong danh mục hoặc bộ lọc hiện tại.
              </p>
            </div>
          ) : (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredVouchers.map((voucher) => {
                const limit = voucher.usageLimit || 100;
                const progress = Math.min(Math.round((voucher.usedCount / limit) * 100), 100);
                const discountDisplay =
                  voucher.voucherType === 'Percentage'
                    ? `Giảm ${voucher.discountValue}%`
                    : `Giảm ${formatCurrency(voucher.discountValue)}`;

                return (
                  <article
                    key={voucher.voucherId}
                    className="relative overflow-hidden rounded-lg bg-surface-container-lowest p-6 shadow-sm border border-surface-container/60"
                  >
                    <div className="mb-4 flex items-start justify-between border-b border-dashed border-surface-container-highest pb-4">
                      <div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            voucher.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          <i
                            className={`h-1.5 w-1.5 rounded-full ${
                              voucher.isActive ? 'bg-emerald-600' : 'bg-error'
                            }`}
                          />
                          {voucher.isActive ? 'Còn hiệu lực' : 'Tạm ngưng'}
                        </span>
                        <p className="mt-2 text-xs text-outline">
                          HSD: {new Date(voucher.endAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Toggle
                          checked={voucher.isActive}
                          label={`Trạng thái ${voucher.code}`}
                          onChange={() => handleToggleVoucher(voucher.voucherId)}
                        />
                        <button
                          onClick={() => handleDeleteVoucher(voucher.voucherId, voucher.code)}
                          title="Xóa voucher"
                          className="text-outline hover:text-error"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
                      <strong className="font-headline-sm text-xl text-primary font-mono tracking-wider">
                        {voucher.code}
                      </strong>
                      <button
                        onClick={() => copy(voucher.code)}
                        title="Sao chép mã"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-lg">content_copy</span>
                      </button>
                    </div>

                    <h3 className="text-2xl font-bold text-on-surface">{discountDisplay}</h3>
                    <p className="mt-1 text-sm font-semibold text-secondary">
                      Đơn tối thiểu: {formatCurrency(voucher.minimumOrderAmount)}
                    </p>
                    {voucher.maxDiscountAmount && (
                      <p className="mt-0.5 text-xs text-outline">
                        Giảm tối đa: {formatCurrency(voucher.maxDiscountAmount)}
                      </p>
                    )}

                    <div className="mt-5 border-t border-dashed border-surface-container-highest pt-4">
                      <div className="mb-2 flex justify-between text-xs text-outline">
                        <span>Đã sử dụng</span>
                        <strong className="text-on-surface">
                          {voucher.usedCount}
                          {voucher.usageLimit ? `/${voucher.usageLimit}` : ' lượt'} ({progress}%)
                        </strong>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress >= 90 ? 'bg-error' : 'bg-primary-container'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </>
      ) : (
        /* TAB 2: QUẢN LÝ CHÍNH SÁCH HỦY / HOÀN (CancellationPolicies) */
        <section className="space-y-6">
          <div className="rounded-lg bg-surface-container-lowest p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">
                  Cancellation Policies · SQL Server
                </p>
                <h2 className="mt-1 font-headline-md text-2xl font-semibold">
                  Chính sách Hoàn / Hủy Khách sạn
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Quy tắc hoàn trả cọc và phí phạt được áp dụng tự động trong luồng Hủy phòng của Khách hàng.
                </p>
              </div>
              <button
                onClick={() => setPolicyModalOpen(true)}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 font-semibold text-on-primary hover:bg-primary/90 text-sm"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Thêm mốc chính sách
              </button>
            </div>

            {policyLoading ? (
              <div className="py-12 text-center text-sm text-outline">
                <span className="material-symbols-outlined animate-spin text-3xl text-primary mb-2 block">
                  progress_activity
                </span>
                Đang tải chính sách hủy từ cơ sở dữ liệu...
              </div>
            ) : policies.length === 0 ? (
              <div className="rounded-lg bg-surface-container-low/50 py-12 text-center text-on-surface-variant mt-6">
                <span className="material-symbols-outlined text-4xl text-outline mb-2 block">
                  policy
                </span>
                <p className="font-semibold">Chưa có chính sách hủy phòng nào được thiết lập.</p>
                <p className="text-xs text-outline mt-1 max-w-md mx-auto">
                  Khi khách hủy phòng mà không có chính sách riêng, hệ thống sẽ áp dụng quy tắc mặc định (phạt 100% tiền cọc).
                </p>
                <button
                  onClick={() => setPolicyModalOpen(true)}
                  className="mt-4 rounded-full bg-primary px-5 py-2 text-xs font-bold text-on-primary"
                >
                  Tạo chính sách đầu tiên
                </button>
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-container text-xs uppercase text-outline">
                      <th className="pb-3 font-semibold">Tên chính sách</th>
                      <th className="pb-3 font-semibold">Số ngày trước Check-in</th>
                      <th className="pb-3 font-semibold">Tỷ lệ hoàn tiền (%)</th>
                      <th className="pb-3 font-semibold">Phí phạt cọc (%)</th>
                      <th className="pb-3 font-semibold">Trạng thái</th>
                      <th className="pb-3 font-semibold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {policies.map((pol) => (
                      <tr key={pol.cancellationPolicyId} className="hover:bg-surface-container-low/40">
                        <td className="py-4 font-semibold text-on-surface">
                          {pol.policyName}
                          <span className="block text-xs font-normal text-outline">
                            ID: #{pol.cancellationPolicyId}
                          </span>
                        </td>
                        <td className="py-4 font-mono font-bold text-primary">
                          ≥ {pol.daysBeforeCheckIn} ngày
                        </td>
                        <td className="py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            Hoàn {pol.refundPercentage}%
                          </span>
                        </td>
                        <td className="py-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-bold text-xs">
                            Phạt {pol.depositPenaltyPercentage}%
                          </span>
                        </td>
                        <td className="py-4">
                          <span
                            className={`text-xs font-semibold ${
                              pol.isActive ? 'text-emerald-700' : 'text-outline'
                            }`}
                          >
                            {pol.isActive ? 'Đang áp dụng' : 'Tạm dừng'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDeletePolicy(pol.cancellationPolicyId, pol.policyName)}
                            className="text-outline hover:text-error p-1 rounded-full hover:bg-error-container/20"
                            title="Xóa chính sách"
                          >
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL 1: TẠO VOUCHER */}
      <Modal
        title="Khởi tạo mã Voucher khuyến mãi (Backend)"
        open={voucherModalOpen}
        onClose={() => setVoucherModalOpen(false)}
      >
        <form onSubmit={handleCreateVoucher} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Mã voucher *
            <input
              required
              name="code"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 uppercase font-mono font-bold"
              placeholder="SUMMER2026"
            />
          </label>

          <label className="text-sm font-semibold">
            Loại ưu đãi *
            <select
              name="voucherType"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4 font-normal"
            >
              <option value="Percentage">Phần trăm (%)</option>
              <option value="FixedAmount">Số tiền cố định (VNĐ)</option>
            </select>
          </label>

          <label className="text-sm font-semibold">
            Giá trị giảm *
            <input
              required
              name="discountValue"
              type="number"
              min="0.01"
              step="any"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
              placeholder="Ví dụ: 20 hoặc 100000"
            />
          </label>

          <label className="text-sm font-semibold">
            Đơn hàng tối thiểu (VNĐ) *
            <input
              required
              name="minimumOrderAmount"
              type="number"
              min="0"
              defaultValue="0"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
          </label>

          <label className="text-sm font-semibold">
            Mức giảm tối đa (VNĐ)
            <input
              name="maxDiscountAmount"
              type="number"
              min="0"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
              placeholder="Không giới hạn nếu để trống"
            />
          </label>

          <label className="text-sm font-semibold">
            Tổng lượt sử dụng tối đa
            <input
              name="usageLimit"
              type="number"
              min="1"
              defaultValue="100"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
          </label>

          <label className="text-sm font-semibold">
            Ngày bắt đầu hiệu lực *
            <input
              required
              name="startAt"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
          </label>

          <label className="text-sm font-semibold">
            Ngày kết thúc hiệu lực *
            <input
              required
              name="endAt"
              type="date"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
          </label>

          <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-surface-container">
            <button
              type="button"
              onClick={() => setVoucherModalOpen(false)}
              className="rounded-full bg-surface-container px-5 py-2.5 font-semibold text-on-surface"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo & Lưu vào CSDL'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TẠO CHÍNH SÁCH HỦY */}
      <Modal
        title="Thêm mốc chính sách hoàn / hủy phòng"
        open={policyModalOpen}
        onClose={() => setPolicyModalOpen(false)}
      >
        <form onSubmit={handleCreatePolicy} className="grid gap-4 sm:grid-cols-2">
          <label className="col-span-full text-sm font-semibold">
            Tên chính sách *
            <input
              required
              name="policyName"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
              placeholder="Ví dụ: Hoàn 100% trước 14 ngày"
            />
          </label>

          <label className="text-sm font-semibold">
            Số ngày trước Check-in (Mốc ngưỡng) *
            <input
              required
              name="daysBeforeCheckIn"
              type="number"
              min="0"
              defaultValue="7"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
            <span className="text-xs text-outline block mt-1">
              Áp dụng khi khách hủy trước ngày nhận phòng ≥ số ngày này
            </span>
          </label>

          <label className="text-sm font-semibold">
            Tỷ lệ hoàn tiền (%) *
            <input
              required
              name="refundPercentage"
              type="number"
              min="0"
              max="100"
              defaultValue="50"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
          </label>

          <label className="col-span-full text-sm font-semibold">
            Tỷ lệ phạt cọc (%) *
            <input
              required
              name="depositPenaltyPercentage"
              type="number"
              min="0"
              max="100"
              defaultValue="50"
              className="mt-1 h-11 w-full rounded-lg bg-surface-container-low px-4"
            />
            <span className="text-xs text-outline block mt-1">
              (Thường bằng 100% - Tỷ lệ hoàn tiền)
            </span>
          </label>

          <div className="col-span-full flex justify-end gap-3 pt-4 border-t border-surface-container">
            <button
              type="button"
              onClick={() => setPolicyModalOpen(false)}
              className="rounded-full bg-surface-container px-5 py-2.5 font-semibold text-on-surface"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-primary px-6 py-2.5 font-semibold text-on-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu...' : 'Thêm chính sách'}
            </button>
          </div>
        </form>
      </Modal>

      <Toast message={toast} />
    </>
  );
};
