import React, { useState, useEffect } from 'react';
import { RoomCategorySchedule, EmergencyLockFormData } from '../types';
import { EmergencyLockModal } from './EmergencyLockModal';
import { getStaffCalendar } from '../../../services/staffPortalApi';
import { roomApi } from '../../../services/roomApi';

interface StaffCalendarViewProps {
  onShowToast?: (message: string) => void;
}

export const StaffCalendarView: React.FC<StaffCalendarViewProps> = ({ onShowToast }) => {
  const [schedules, setSchedules] = useState<RoomCategorySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<'7days' | '14days' | 'month'>('7days');
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [hotelNames, setHotelNames] = useState<Record<number, string>>({});

  useEffect(() => {
    const daysCount = periodFilter === 'month' ? 30 : (periodFilter === '14days' ? 14 : 7);
    setLoading(true);
    setError('');
    getStaffCalendar(daysCount).then(async (data) => {
      const hotelIds = Array.from(new Set(data.map(item => item.hotelId)));
      const hotels = await Promise.all(hotelIds.map(id => roomApi.hotel(id)));
      setHotelNames(Object.fromEntries(hotels.map(hotel => [hotel.hotelId, hotel.hotelName])));
      setSchedules(data);
    }).catch((reason) => {
      setSchedules([]);
      setError(reason instanceof Error ? reason.message : 'Không tải được lịch phòng.');
    }).finally(() => setLoading(false));
  }, [periodFilter, revision]);
  const [lockModalTarget, setLockModalTarget] = useState<{
    category: string;
    roomNumber: string;
    hotelId?: number;
    allowedRoomIds: number[];
  }>({
    category: '',
    roomNumber: '',
    allowedRoomIds: [],
  });

  const handleOpenLockModal = (category = '', roomNumber = '', hotelId?: number, allowedRoomIds: number[] = []) => {
    if (!hotelId) {
      onShowToast?.('Vui lòng chọn một phân khu có phòng trước khi khóa bán.');
      return;
    }
    setLockModalTarget({ category, roomNumber, hotelId, allowedRoomIds });
    setIsLockModalOpen(true);
  };

  const handleConfirmLock = (data: EmergencyLockFormData) => {
    setRevision(value => value + 1);
    onShowToast?.(
      `Đã kích hoạt khóa phòng khẩn cấp cho ${data.roomNumbers.join(', ')} thuộc ${data.buildingAndCategory}. Đã lưu lệnh khóa trong hệ thống.`
    );
  };

  const handleExportCapacityReport = () => {
    if (!filteredSchedules.length) {
      onShowToast?.('Không có dữ liệu lịch phòng để xuất.');
      return;
    }
    const rows = [
      ['Phân khu', 'Hạng phòng', 'Ngày', 'Tổng phòng', 'Phòng trống', 'Phòng khóa', 'Công suất'],
      ...filteredSchedules.flatMap(schedule => schedule.days.map(day => [
        schedule.building, schedule.name, day.date, String(day.totalCount),
        String(day.availableCount), String(day.lockedCount || 0), `${day.occupancyPercent}%`,
      ])),
    ];
    const csv = `\uFEFF${rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `cong-suat-phong-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast?.('Đã xuất báo cáo công suất từ dữ liệu hiện tại.');
  };

  const handleManualSync = () => {
    setRevision((value) => value + 1);
    onShowToast?.('Đang tải lại dữ liệu phòng từ máy chủ.');
  };

  const areaKey = (schedule: RoomCategorySchedule) => `${schedule.hotelId}:${schedule.areaId}`;
  const areaOptions = Array.from(new Map(schedules.map(schedule => [areaKey(schedule), {
    key: areaKey(schedule),
    label: `${hotelNames[schedule.hotelId] || `Khách sạn #${schedule.hotelId}`} · ${schedule.building}`,
  }])).values());
  const filteredSchedules = schedules.filter((sch) => {
    if (selectedZone === 'all') return true;
    return areaKey(sch) === selectedZone;
  });
  const headerDays = (filteredSchedules[0]?.days ?? []).map((day, index) => {
    const cells = filteredSchedules.map(schedule => schedule.days[index]).filter(Boolean);
    const totalCount = cells.reduce((sum, cell) => sum + cell.totalCount, 0);
    const availableCount = cells.reduce((sum, cell) => sum + cell.availableCount, 0);
    return {
      ...day,
      totalCount,
      availableCount,
      occupancyPercent: totalCount ? Math.round((totalCount - availableCount) * 100 / totalCount) : 0,
    };
  });
  const totalRooms = filteredSchedules.reduce((sum, item) => sum + item.totalRooms, 0);
  const todayBusy = filteredSchedules.reduce((sum, item) => {
    const day = item.days[0];
    return sum + (day ? day.totalCount - day.availableCount : 0);
  }, 0);
  const lockedRooms = filteredSchedules.reduce((sum, item) => sum + (item.days[0]?.lockedCount || 0), 0);
  const occupancy = totalRooms > 0 ? Math.round(todayBusy * 1000 / totalRooms) / 10 : 0;
  const assignedAreaLabel = areaOptions.length ? areaOptions.map(item => item.label).join(' · ') : 'Chưa có phân khu được giao';
  const lockableSchedules = filteredSchedules;
  const lockHotelIds = Array.from(new Set(lockableSchedules.map(item => item.hotelId)));
  const lockRoomIds = Array.from(new Set(lockableSchedules.flatMap(item => item.roomIds)));

  return (
    <div className="flex flex-col w-full gap-6">
      {/* SECTION 1: TOP OPERATIONAL HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div className="flex flex-col gap-2 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Khu vực phụ trách: {assignedAreaLabel}
            </span>
            <span className="inline-flex items-center gap-1 text-primary font-label-sm text-label-sm px-2.5 py-0.5 rounded-full bg-primary-container/10">
              <span className="material-symbols-outlined text-[14px]">sync</span>
              Dữ liệu trực tiếp từ hệ thống
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
            onClick={() => handleOpenLockModal(selectedZone === 'all' ? 'Tất cả phân khu được giao' : areaOptions.find(item => item.key === selectedZone)?.label || 'Phân khu được giao', '', lockHotelIds.length === 1 ? lockHotelIds[0] : undefined, lockRoomIds)}
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
              <option value="all">Tất cả phân khu được giao</option>
              {areaOptions.map(area => <option key={area.key} value={area.key}>{area.label}</option>)}
            </select>
          </div>

          {/* Date Range Controls */}
          <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-[#eae8e5]">
            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Tuần trước"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <div className="flex items-center gap-2 px-3 py-1 font-label-md text-label-md text-on-surface font-semibold">
              <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
              <span>{headerDays.length ? `${headerDays[0].dateFormatted} - ${headerDays[headerDays.length - 1].dateFormatted}` : 'Chưa có dữ liệu ngày'}</span>
            </div>
            <button
              type="button"
              disabled
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
              30 ngày
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
            <span>{totalRooms} phòng</span>
            <span className="text-outline">·</span>
            <span>Công suất {occupancy}%</span>
            <span className="text-outline">·</span>
            <span className="text-error font-bold">{lockedRooms} phòng khóa</span>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{error}</p>}
      {loading && <p role="status" className="rounded-lg bg-surface-container-low p-4 text-on-surface-variant">Đang tải lịch phòng trong phạm vi được phân công…</p>}
      {!loading && !error && schedules.length === 0 && <p className="rounded-lg bg-surface-container-low p-4 text-on-surface-variant">Chưa có hạng phòng hoạt động trong phạm vi được phân công.</p>}

      {/* SECTION 3: CALENDAR AVAILABILITY MATRIX */}
      <div className="bg-surface-container-lowest rounded-lg shadow-[0_4px_24px_-4px_rgba(120,53,15,0.06)] overflow-hidden border border-[#eae8e5]">
        {/* Visual Micro-Header */}
        <div className="px-6 py-3.5 bg-surface-container-low flex items-center justify-between border-b border-[#eae8e5]">
          <div className="flex items-center gap-3">
            <span className="font-headline-sm text-headline-sm text-on-surface">
              Bảng Tình Trạng Buồng Phòng {periodFilter === 'month' ? '30 Ngày' : periodFilter === '14days' ? '14 Ngày' : '7 Ngày'}
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
                {headerDays.map((day, idx) => (
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
                        {day.occupancyPercent}% kín
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eae8e5]">
              {filteredSchedules.map((row) => (
                <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="p-4 bg-surface-container-lowest border-r border-[#eae8e5]">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase text-primary">{hotelNames[row.hotelId] || `Khách sạn #${row.hotelId}`}</span>
                      <span className="text-xs text-on-surface-variant">{row.building}</span>
                      <div className="flex items-center justify-between gap-2"><strong>{row.name}</strong><span className="rounded-full bg-surface-container px-2 py-0.5 text-xs">{row.totalRooms} phòng</span></div>
                      <span className="text-xs text-on-surface-variant">{row.roomSpecs}</span>
                    </div>
                  </td>
                  {row.days.map((cell) => (
                    <td key={cell.date} onClick={() => handleOpenLockModal(row.name, cell.lockedRoomNumber || '', row.hotelId, row.roomIds)} className={`p-2.5 cursor-pointer ${cell.isToday ? 'bg-primary-fixed/10' : ''}`}>
                      <div className={`rounded-DEFAULT p-2.5 shadow-xs hover:shadow-md ${cell.isEmergencyLocked ? 'bg-error-container ring-1 ring-error/30' : cell.status === 'full' ? 'bg-surface-container-highest' : cell.status === 'low' ? 'bg-secondary-fixed/40' : 'bg-surface-container'}`}>
                        <div className="flex items-center justify-between"><strong className="text-sm">Còn {cell.availableCount} / {cell.totalCount}</strong><span className={`h-2 w-2 rounded-full ${cell.isEmergencyLocked ? 'bg-error' : cell.status === 'full' ? 'bg-inverse-surface' : cell.status === 'low' ? 'bg-secondary' : 'bg-emerald-600'}`} /></div>
                        <div className="my-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high"><div className={`h-full ${cell.isEmergencyLocked ? 'bg-error' : cell.status === 'low' ? 'bg-secondary' : 'bg-emerald-600'}`} style={{ width: `${cell.occupancyPercent}%` }} /></div>
                        <span className="text-[11px] text-on-surface-variant">{cell.statusNote || `Trống ${cell.availableCount} phòng`}</span>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calendar Table Footer / Summary Bar */}
        <div className="p-4 bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#eae8e5]">
          <div className="flex items-center gap-4 text-on-surface-variant font-label-md text-label-md">
            <span>
              Công suất hôm nay trong phạm vi được giao: <strong className="text-on-surface font-semibold">{occupancy}%</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              className="px-4 py-1.5 rounded-full bg-surface-container-lowest text-on-surface font-label-sm text-label-sm shadow-sm hover:bg-surface-container transition-colors border border-[#eae8e5] cursor-pointer"
            >
              Tải lại dữ liệu
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
        hotelId={lockModalTarget.hotelId}
        allowedRoomIds={lockModalTarget.allowedRoomIds}
      />
    </div>
  );
};
