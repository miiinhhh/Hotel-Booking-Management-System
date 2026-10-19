import React, { useState, useMemo } from 'react';
import { StaffZone } from '../types';
import { MOCK_STAFF_ZONES } from '../data/mockStaffZones';
import { StaffCampusMap } from './StaffCampusMap';

interface StaffSuitesViewProps {
  onShowToast?: (message: string) => void;
  onNavigateToReservations?: (zoneCode?: string) => void;
}

export const StaffSuitesView: React.FC<StaffSuitesViewProps> = ({
  onShowToast,
  onNavigateToReservations,
}) => {
  const [zones] = useState<StaffZone[]>(MOCK_STAFF_ZONES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const assignedZones = useMemo(() => {
    return zones.filter((z) => {
      if (!z.isAssigned) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = z.name.toLowerCase().includes(q);
        const matchCode = z.code.toLowerCase().includes(q);
        return matchName || matchCode;
      }
      return true;
    });
  }, [zones, searchQuery]);

  const unassignedZones = useMemo(() => {
    return zones.filter((z) => !z.isAssigned);
  }, [zones]);

  const handleRequestAccess = (zoneName: string) => {
    onShowToast?.(`Đã gửi yêu cầu cấp quyền truy cập quản trị cho ${zoneName} tới Quản lý buồng phòng.`);
  };

  const handleOpenZoneRooms = (zoneCode: string) => {
    onShowToast?.(`Đang lọc danh sách đặt phòng và buồng phòng của ${zoneCode}...`);
    onNavigateToReservations?.(zoneCode);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Page Header */}
      <header className="flex flex-col gap-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <span>Nhân viên</span>
              <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              <span className="text-primary font-semibold">Phân khu &amp; Sơ đồ khuôn viên</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                Phân khu phụ trách
              </h1>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-full shadow-sm border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <span className="font-label-md text-label-md font-semibold tracking-wide">
                  Đang phụ trách: 2 phân khu
                </span>
              </div>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Danh sách tòa nhà được phân quyền quản lý và sơ đồ khuôn viên khu nghỉ dưỡng StayLuxe Đà Nẵng.
            </p>
          </div>

          {/* Action & Search Strip */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex items-center bg-surface-container-low rounded-full px-4 py-2 w-72 shadow-sm border border-[#eae8e5] focus-within:bg-surface-container-lowest focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-[18px] text-outline mr-2">search</span>
              <input
                className="bg-transparent border-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline w-full p-0"
                placeholder="Tìm kiếm tòa nhà, phân khu..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-outline hover:text-on-surface text-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-surface-container-low text-on-surface font-label-md text-label-md font-medium pl-4 pr-10 py-2.5 rounded-full shadow-sm border border-[#eae8e5] outline-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="maintenance">Bảo trì định kỳ</option>
              </select>
              <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">
                expand_more
              </span>
            </div>

            <div className="flex items-center gap-2 bg-surface-container px-3.5 py-2.5 rounded-full text-on-surface-variant font-label-sm text-label-sm shadow-sm border border-[#eae8e5]">
              <span className="material-symbols-outlined text-[16px] text-primary animate-spin" style={{ animationDuration: '9s' }}>
                sync
              </span>
              <span>Đồng bộ thời gian thực: Vừa xong</span>
            </div>
          </div>
        </div>
      </header>

      {/* Two-Column Operational Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Assigned Zones List (approx 35% / 4-5 cols) */}
        <div className="xl:col-span-5 2xl:col-span-4 flex flex-col gap-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface">Phân khu được giao</span>
              <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-label-sm text-[11px] flex items-center justify-center font-bold">
                {assignedZones.length}
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              Khu A &amp; Khu B
            </span>
          </div>

          {/* Cards for Assigned Zones */}
          {assignedZones.map((zone) => (
            <article
              key={zone.id}
              className="relative bg-surface-container-lowest rounded-lg p-5 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col gap-4 overflow-hidden border border-[#eae8e5]"
            >
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary-container" />
              <div className="flex gap-4">
                {zone.image && (
                  <div className="w-28 h-28 rounded-DEFAULT overflow-hidden shrink-0 relative shadow-sm">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={zone.image}
                      alt={zone.name}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-surface/90 backdrop-blur-md text-primary font-label-sm text-[10px] font-bold tracking-wider uppercase">
                      {zone.code}
                    </span>
                  </div>
                )}
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-headline-sm text-headline-sm text-on-surface truncate tracking-tight">
                        {zone.name}
                      </h2>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-label-sm font-semibold shrink-0">
                        {zone.occupancyPercent}% lấp đầy
                      </span>
                    </div>
                    <p className="font-label-md text-label-md text-on-surface-variant truncate">{zone.subTitle}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface font-medium">
                      {zone.floors} tầng
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface font-medium">
                      {zone.totalRooms} phòng
                    </span>
                  </div>
                </div>
              </div>

              {/* Micro Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-surface-container-low rounded-DEFAULT p-3 border border-[#eae8e5]">
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                    Có khách
                  </span>
                  <span className="font-headline-sm text-headline-sm text-primary font-bold">
                    {zone.occupiedRooms}
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-normal">
                      /{zone.totalRooms}
                    </span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                    Phòng trống
                  </span>
                  <span className="font-headline-sm text-headline-sm text-emerald-700 font-bold">
                    {zone.vacantRooms}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                    {zone.maintenanceRooms !== undefined ? 'Bảo trì' : 'Đang dọn'}
                  </span>
                  <span
                    className={`font-headline-sm text-headline-sm font-bold ${
                      zone.maintenanceRooms !== undefined ? 'text-amber-700' : 'text-secondary'
                    }`}
                  >
                    {zone.maintenanceRooms ?? zone.cleaningRooms ?? 0}
                  </span>
                </div>
              </div>

              {/* Staff Role & Action Button */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-label-sm text-[10px] font-bold">
                    {zone.supervisorInitials}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    Giám sát: <strong className="text-on-surface font-semibold">{zone.supervisor}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenZoneRooms(zone.code)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold transition-all group-hover:bg-primary-container group-hover:text-on-primary cursor-pointer"
                >
                  <span>Chi tiết phòng</span>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            </article>
          ))}

          {/* Section Divider */}
          <div className="flex items-center gap-3 pt-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest font-semibold">
              Phân khu khác (Không thuộc thẩm quyền)
            </span>
            <div className="flex-1 h-px bg-surface-container-highest" />
          </div>

          {/* Muted / Locked Zones */}
          {unassignedZones.map((zone) => (
            <article
              key={zone.id}
              className="bg-surface-container-low/75 rounded-lg p-5 shadow-sm opacity-85 hover:opacity-100 transition-opacity flex flex-col gap-3 border border-[#eae8e5]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-lg text-on-surface font-semibold">{zone.name}</h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">{zone.subTitle}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-medium">
                  Phụ trách: {zone.supervisor}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-outline">verified_user</span>
                  Quyền truy cập: Chỉ xem trạng thái
                </span>
                <button
                  type="button"
                  onClick={() => handleRequestAccess(zone.name)}
                  className="font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors cursor-pointer"
                >
                  Yêu cầu quyền truy cập
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Right Column: Interactive Campus Map View (approx 65% / 7-8 cols) */}
        <div className="xl:col-span-7 2xl:col-span-8 flex flex-col gap-4">
          <StaffCampusMap
            onSelectZone={(code) => onShowToast?.(`Đã chọn phân khu ${code} trên sơ đồ khuôn viên.`)}
            onOpenRoomList={(code) => handleOpenZoneRooms(code)}
          />
        </div>
      </div>
    </div>
  );
};
