import React, { useState } from 'react';
import { RoomCategorySchedule, EmergencyLockFormData } from '../types';
import { MOCK_CALENDAR_DAYS, MOCK_ROOM_SCHEDULES } from '../data/mockStaffCalendar';
import { EmergencyLockModal } from './EmergencyLockModal';

interface StaffCalendarViewProps {
  onShowToast?: (message: string) => void;
}

export const StaffCalendarView: React.FC<StaffCalendarViewProps> = ({ onShowToast }) => {
  const [schedules] = useState<RoomCategorySchedule[]>(MOCK_ROOM_SCHEDULES);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'7days' | '14days' | 'month'>('7days');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockModalTarget, setLockModalTarget] = useState<{
    category: string;
    roomNumber: string;
  }>({
    category: 'Tòa A · Premier Ocean Suite',
    roomNumber: 'P.305',
  });

  const handleOpenLockModal = (category = 'Tòa A · Premier Ocean Suite', roomNumber = 'P.305') => {
    setLockModalTarget({ category, roomNumber });
    setIsLockModalOpen(true);
  };

  const handleConfirmLock = (data: EmergencyLockFormData) => {
    onShowToast?.(
      `Đã kích hoạt khóa phòng khẩn cấp cho ${data.roomNumbers.join(', ')} thuộc ${data.buildingAndCategory}. Đã gỡ khỏi OTA.`
    );
  };

  const handleExportCapacityReport = () => {
    onShowToast?.('Đang kết xuất báo cáo tỷ lệ lấp đầy & công suất buồng phòng...');
  };

  const handleManualSync = () => {
    onShowToast?.('Đã đồng bộ thời gian thực PMS và các kênh Channel Manager OTA!');
  };

  const filteredSchedules = schedules.filter((sch) => {
    if (selectedZone === 'all') return true;
    if (selectedZone === 'Tòa A') return sch.building === 'Tòa A';
    if (selectedZone === 'Tòa B') return sch.building === 'Tòa B';
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6">
      {/* SECTION 1: TOP OPERATIONAL HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Khu vực phụ trách: Tòa A &amp; Tòa B · Cập nhật phòng thời gian thực
            </span>
            <span className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-primary-container/10">
              <span className="material-symbols-outlined text-[14px]">sync</span>
              Đồng bộ PMS: Vừa xong
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Lịch Tình Trạng Phòng &amp; Khóa Bán
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Theo dõi tình trạng trống phòng theo ngày, công suất buồng phòng và xử lý khóa đóng bán phòng khẩn cấp theo
            phân khu được phân công.
          </p>
        </div>

        {/* Top Action Group */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCapacityReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-lowest text-on-surface font-label-lg text-label-lg shadow-sm hover:bg-surface-container transition-all duration-200 border border-[#eae8e5] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[19px] text-secondary">file_download</span>
            <span>Xuất báo cáo công suất</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenLockModal()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg shadow-[0_8px_20px_-4px_rgba(194,65,12,0.35)] hover:bg-primary transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">shield_lock</span>
            <span>+ Khóa phòng khẩn cấp</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: COMPACT CONTROL & FILTER ROW */}
      <div className="bg-surface-container-lowest rounded-lg p-4 shadow-[0_4px_20px_-2px_rgba(120,53,15,0.04)] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 border border-[#eae8e5]">
        {/* Left: Zone & Date Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone Selector Dropdown */}
          <div className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low text-on-surface font-label-md text-label-md border border-[#eae8e5]">
            <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent border-none outline-none font-semibold text-on-surface cursor-pointer pr-4"
            >
              <option value="all">Tất cả: Tòa A (Villa/Suite) &amp; Tòa B (Deluxe)</option>
              <option value="Tòa A">Chỉ Tòa A (Villa &amp; Suite)</option>
              <option value="Tòa B">Chỉ Tòa B (Deluxe Category)</option>
            </select>
          </div>

          {/* Date Range Controls */}
          <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-[#eae8e5]">
            <button
              type="button"
              onClick={() => onShowToast?.('Chuyển sang tuần trước (17/10 - 23/10)')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Tuần trước"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-label-md text-label-md text-on-surface font-semibold">
              <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
              <span>Hôm nay (24/10 - 30/10/2025)</span>
            </div>
            <button
              type="button"
              onClick={() => onShowToast?.('Chuyển sang tuần sau (31/10 - 06/11)')}
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Tuần sau"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Quick Filter Jump Chips */}
          <div className="hidden sm:flex items-center gap-1.5 pl-2">
            <button
              type="button"
              onClick={() => setPeriodFilter('7days')}
              className={`px-3.5 py-1 rounded-full font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                periodFilter === '7days'
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              7 ngày tới
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('14days')}
              className={`px-3.5 py-1 rounded-full font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                periodFilter === '14days'
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              14 ngày
            </button>
            <button
              type="button"
              onClick={() => setPeriodFilter('month')}
              className={`px-3.5 py-1 rounded-full font-label-sm text-label-sm font-semibold transition-all cursor-pointer ${
                periodFilter === 'month'
                  ? 'bg-primary-container text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Tháng 10
            </button>
          </div>
        </div>

        {/* Right: Legend Pills & KPI Counters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-[11px] font-label-sm text-on-surface">
              <span className="w-2 h-2 rounded-full bg-emerald-600" /> Còn trống (&gt;5)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed/40 text-[11px] font-label-sm text-on-secondary-fixed-variant">
              <span className="w-2 h-2 rounded-full bg-secondary-container" /> Sắp hết (1-4)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest text-[11px] font-label-sm text-on-surface-variant">
              <span className="w-2 h-2 rounded-full bg-inverse-surface" /> Kín phòng (0)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-[11px] font-label-sm text-on-error-container">
              <span className="w-2 h-2 rounded-full bg-error" /> Đang khóa bán
            </span>
          </div>

          {/* Summary metrics badge */}
          <div className="hidden 2xl:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
            <span>64 phòng</span>
            <span className="text-outline">·</span>
            <span>Công suất 88.5%</span>
            <span className="text-outline">·</span>
            <span className="text-error font-bold">3 phòng khóa</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: CALENDAR AVAILABILITY MATRIX */}
      <div className="bg-surface-container-lowest rounded-lg shadow-[0_4px_24px_-4px_rgba(120,53,15,0.06)] overflow-hidden border border-[#eae8e5]">
        {/* Visual Micro-Header */}
        <div className="px-6 py-3.5 bg-surface-container-low flex items-center justify-between border-b border-[#eae8e5]">
          <div className="flex items-center gap-3">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Bảng Tình Trạng Buồng Phòng 7 Ngày
            </span>
            <span className="text-on-surface-variant text-label-sm font-label-sm hidden sm:inline">
              • Tự động cập nhật qua kênh Channel Manager OTA
            </span>
          </div>
          <div className="flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-primary">touch_app</span>
            <span>Nhấp vào ô để quản lý trạng thái khóa bán cụ thể</span>
          </div>
        </div>

        {/* Spreadsheet Matrix Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-surface-container-high/60 text-on-surface border-b border-[#eae8e5]">
                {/* Room Category Header */}
                <th className="p-4 w-72 font-headline-sm text-[15px] tracking-tight text-on-surface">
                  <div className="flex items-center justify-between">
                    <span>Hạng phòng / Phân khu</span>
                    <span className="font-label-sm text-[11px] uppercase tracking-wider text-on-surface-variant">
                      Quy mô
                    </span>
                  </div>
                </th>

                {/* 7 Day Columns */}
                {MOCK_CALENDAR_DAYS.map((day, idx) => (
                  <th
                    key={idx}
                    className={`p-3 w-40 text-center ${
                      day.isToday ? 'bg-primary-fixed/30 text-on-primary-fixed border-x border-primary-container/20' : 'text-on-surface'
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-label-sm text-[10px] uppercase font-bold tracking-wider mb-1 ${
                          day.isToday
                            ? 'bg-primary-container text-on-primary'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {day.dayTag}
                      </span>
                      <span className="font-headline-sm text-headline-sm leading-tight text-on-surface">
                        {day.dayOfWeek}
                      </span>
                      <span
                        className={`font-label-md text-label-md font-semibold ${
                          day.isToday ? 'text-primary' : 'text-on-surface-variant'
                        }`}
                      >
                        {day.dateFormatted}
                      </span>
                      <span
                        className={`mt-1.5 px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold shadow-xs ${
                          day.isToday
                            ? 'bg-surface-container-lowest text-primary'
                            : day.occupancyPercent >= 90
                            ? 'bg-surface-container text-error'
                            : 'bg-surface-container text-secondary'
                        }`}
                      >
                        {day.occupancyLabel}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eae8e5]">
              {/* Group 1: TÒA B */}
              {filteredSchedules.some((s) => s.building === 'Tòa B') && (
                <tr className="bg-surface-container-high/40">
                  <td className="px-6 py-2.5" colSpan={8}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">apartment</span>
                      <span className="font-headline-sm text-[14px] uppercase tracking-wider text-primary font-bold">
                        Phân khu Tòa B · Deluxe Category
                      </span>
                      <span className="text-on-surface-variant font-label-sm text-label-sm">
                        (32 phòng tiêu chuẩn)
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {filteredSchedules
                .filter((s) => s.building === 'Tòa B')
                .map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                    {/* Room Info */}
                    <td className="p-4 bg-surface-container-lowest border-r border-[#eae8e5]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-headline-sm text-[16px] text-on-surface font-bold">{row.name}</span>
                          <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-semibold text-on-surface-variant">
                            {row.totalRooms} phòng
                          </span>
                        </div>
                        <div className="text-[12px] font-body-md text-on-surface-variant">{row.roomSpecs}</div>
                      </div>
                    </td>

                    {/* 7 Days Cells */}
                    {row.days.map((cell, cIdx) => {
                      const isToday = cell.isToday;
                      return (
                        <td
                          key={cIdx}
                          onClick={() => handleOpenLockModal(row.name, 'P.201')}
                          className={`p-2.5 cursor-pointer ${isToday ? 'bg-primary-fixed/10' : ''}`}
                        >
                          <div
                            className={`h-full p-2.5 rounded-DEFAULT transition-all flex flex-col justify-between gap-1 shadow-xs hover:shadow-md ${
                              cell.status === 'full'
                                ? 'bg-surface-container-highest'
                                : cell.status === 'low'
                                ? 'bg-secondary-fixed/40'
                                : 'bg-surface-container hover:bg-surface-container-high'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-headline-sm text-[15px] font-bold ${
                                  cell.status === 'full'
                                    ? 'text-inverse-surface'
                                    : cell.status === 'low'
                                    ? 'text-on-secondary-fixed-variant'
                                    : 'text-on-surface'
                                }`}
                              >
                                Còn {cell.availableCount} / {cell.totalCount}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  cell.status === 'full'
                                    ? 'bg-inverse-surface'
                                    : cell.status === 'low'
                                    ? 'bg-secondary-container'
                                    : 'bg-emerald-600'
                                }`}
                              />
                            </div>
                            <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  cell.status === 'full'
                                    ? 'bg-inverse-surface'
                                    : cell.status === 'low'
                                    ? 'bg-secondary'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${cell.occupancyPercent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-label-sm text-on-surface-variant mt-1">
                              {cell.statusNote || `Trống ${cell.availableCount} phòng`}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

              {/* Group 2: TÒA A */}
              {filteredSchedules.some((s) => s.building === 'Tòa A') && (
                <tr className="bg-surface-container-high/40">
                  <td className="px-6 py-2.5" colSpan={8}>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-primary">villa</span>
                      <span className="font-headline-sm text-[14px] uppercase tracking-wider text-primary font-bold">
                        Phân khu Tòa A · Villa &amp; Suite Category
                      </span>
                      <span className="text-on-surface-variant font-label-sm text-label-sm">
                        (26 phòng hạng sang)
                      </span>
                    </div>
                  </td>
                </tr>
              )}

              {filteredSchedules
                .filter((s) => s.building === 'Tòa A')
                .map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                    {/* Room Info */}
                    <td className="p-4 bg-surface-container-lowest border-r border-[#eae8e5]">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-headline-sm text-[16px] text-on-surface font-bold">{row.name}</span>
                          <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-surface-container font-semibold text-on-surface-variant">
                            {row.totalRooms} phòng
                          </span>
                        </div>
                        <div className="text-[12px] font-body-md text-on-surface-variant">{row.roomSpecs}</div>
                      </div>
                    </td>

                    {/* 7 Days Cells */}
                    {row.days.map((cell, cIdx) => {
                      const isToday = cell.isToday;
                      return (
                        <td
                          key={cIdx}
                          onClick={() => handleOpenLockModal(row.name, cell.lockedRoomNumber || 'P.305')}
                          className={`p-2.5 cursor-pointer ${isToday ? 'bg-primary-fixed/10' : ''}`}
                        >
                          <div
                            className={`h-full p-2.5 rounded-DEFAULT transition-all flex flex-col justify-between gap-1 shadow-xs hover:shadow-md ${
                              cell.isEmergencyLocked
                                ? 'bg-secondary-fixed/40 ring-1 ring-error/30'
                                : cell.status === 'full'
                                ? 'bg-surface-container-highest'
                                : cell.status === 'low'
                                ? 'bg-secondary-fixed/40'
                                : 'bg-surface-container hover:bg-surface-container-high'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`font-headline-sm text-[15px] font-bold ${
                                  cell.status === 'full'
                                    ? 'text-inverse-surface'
                                    : cell.status === 'low' || cell.isEmergencyLocked
                                    ? 'text-on-secondary-fixed-variant'
                                    : 'text-on-surface'
                                }`}
                              >
                                Còn {cell.availableCount} / {cell.totalCount}
                              </span>
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  cell.status === 'full'
                                    ? 'bg-inverse-surface'
                                    : cell.isEmergencyLocked
                                    ? 'bg-error animate-pulse'
                                    : cell.status === 'low'
                                    ? 'bg-secondary-container'
                                    : 'bg-emerald-600'
                                }`}
                              />
                            </div>
                            <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  cell.status === 'full'
                                    ? 'bg-inverse-surface'
                                    : cell.isEmergencyLocked
                                    ? 'bg-secondary'
                                    : cell.status === 'low'
                                    ? 'bg-secondary'
                                    : 'bg-emerald-600'
                                }`}
                                style={{ width: `${cell.occupancyPercent}%` }}
                              />
                            </div>

                            {/* Locked Tag Callout */}
                            {cell.isEmergencyLocked ? (
                              <div className="flex items-center gap-1 mt-1 text-[11px] font-label-sm text-error bg-error-container/70 px-1.5 py-0.5 rounded font-semibold truncate">
                                <span className="material-symbols-outlined text-[12px]">lock</span>
                                <span>{cell.statusNote || `Khóa ${cell.lockedRoomNumber}`}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] font-label-sm text-on-surface-variant mt-1 truncate">
                                {cell.statusNote || `Trống ${cell.availableCount} phòng`}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Calendar Table Footer / Summary Bar */}
        <div className="p-4 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#eae8e5]">
          <div className="flex items-center gap-4 text-on-surface-variant font-label-md text-label-md">
            <span>
              Tổng công suất toàn khu nghỉ dưỡng: <strong className="text-on-surface font-semibold">88.5%</strong>
            </span>
            <span>•</span>
            <span>
              Doanh thu dự kiến tuần: <strong className="text-primary font-semibold">1,420,000,000 VND</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm hover:bg-surface-container transition-colors border border-[#eae8e5] cursor-pointer"
            >
              Đồng bộ thủ công PMS
            </button>
            <button
              type="button"
              onClick={() => onShowToast?.('Mở cấu hình thiết lập thời gian lưu trú tối thiểu (Min-stay) & giá động...')}
              className="px-4 py-1.5 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm shadow-sm hover:bg-primary transition-colors cursor-pointer font-semibold"
            >
              Cài đặt Min-stay / Giá động
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Lock Modal Overlay */}
      <EmergencyLockModal
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
        onConfirmLock={handleConfirmLock}
        initialCategory={lockModalTarget.category}
        initialRoomNumber={lockModalTarget.roomNumber}
      />
    </div>
  );
};
