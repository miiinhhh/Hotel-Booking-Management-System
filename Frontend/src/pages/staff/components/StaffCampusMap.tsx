import React, { useState } from 'react';

interface StaffCampusMapProps {
  onSelectZone?: (zoneCode: string) => void;
  onOpenRoomList?: (zoneCode: string) => void;
}

export const StaffCampusMap: React.FC<StaffCampusMapProps> = ({
  onSelectZone,
  onOpenRoomList,
}) => {
  const [activeLayer, setActiveLayer] = useState<'buggy' | 'pool' | 'grid'>('buggy');
  const [selectedPin, setSelectedPin] = useState<'A' | 'B' | 'C' | 'villas'>('A');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(1.4, Math.max(0.8, Number((prev + delta).toFixed(1)))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setSelectedPin('A');
  };

  return (
    <div className="bg-surface-container-lowest rounded-lg shadow-sm p-4 lg:p-6 flex flex-col gap-4 relative overflow-hidden border border-[#eae8e5]">
      {/* Header row for Map Canvas */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
            <span className="material-symbols-outlined text-[20px]">map</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Sơ đồ tổng thể khuôn viên</h2>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              StayLuxe Danang Resort • Tọa độ thời gian thực
            </p>
          </div>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveLayer('buggy')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeLayer === 'buggy'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">electric_rickshaw</span>
            <span>Lối đi bộ &amp; xe điện</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('pool')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeLayer === 'pool'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">pool</span>
            <span>Tiện ích &amp; Hồ bơi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('grid')}
            className={`px-3.5 py-1.5 rounded-full font-label-sm text-label-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeLayer === 'grid'
                ? 'bg-primary-container text-on-primary shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">layers</span>
            <span>Lưới tầng phòng</span>
          </button>
        </div>
      </div>

      {/* Masterplan Interactive Container */}
      <div className="relative w-full h-[620px] bg-[#f5f3f0] rounded-DEFAULT overflow-hidden select-none border border-[#eae8e5]">
        <div
          className="w-full h-full transition-transform duration-300 origin-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Masterplan Architectural Stylized Map Canvas */}
          <svg className="w-full h-full object-cover" fill="none" viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg">
            {/* Beach & Ocean Horizon at bottom */}
            <path d="M0 550 Q 250 530, 500 560 T 1000 540 L 1000 700 L 0 700 Z" fill="#e2edea" />
            <path d="M0 580 Q 300 565, 600 590 T 1000 575 L 1000 700 L 0 700 Z" fill="#cde2dd" />
            <text fill="#58857b" fontFamily="Syne" fontSize="16" fontWeight="600" letterSpacing="0.2em" textAnchor="middle" x="500" y="660">
              BIỂN ĐÔNG • BÃI TẮM RIÊNG TƯ STAYLUXE
            </text>

            {/* Lush Garden Grounds & Landscaping Contours */}
            <rect fill="#f4f1ec" height="550" width="1000" x="0" y="0" />

            {/* Garden Parklands */}
            <path d="M 60 40 Q 220 20, 360 80 T 400 240 Q 280 320, 100 260 Z" fill="#e7ece2" opacity="0.8" />
            <path d="M 620 60 Q 820 40, 940 120 T 920 340 Q 760 380, 580 280 Z" fill="#e7ece2" opacity="0.8" />

            {/* Winding Walking & Buggy Paths */}
            <path d="M 500 40 L 500 200 Q 500 280, 360 340 T 260 480" stroke="#dfdad2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24" />
            <path d="M 500 200 Q 520 280, 680 330 T 780 480" stroke="#dfdad2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24" />
            <path d="M 260 480 Q 500 500, 780 480" stroke="#dfdad2" strokeLinecap="round" strokeWidth="16" />

            {/* Buggy Dashlines */}
            {activeLayer === 'buggy' && (
              <>
                <path d="M 500 40 L 500 200 Q 500 280, 360 340 T 260 480" stroke="#c2410c" strokeDasharray="6 6" strokeWidth="2.5" />
                <path d="M 500 200 Q 520 280, 680 330 T 780 480" stroke="#c2410c" strokeDasharray="6 6" strokeWidth="2.5" />
              </>
            )}

            {/* Main Infinity Pool Complex */}
            <path d="M 430 380 C 430 350, 570 350, 570 380 C 570 450, 430 450, 430 380 Z" fill="#b9ded7" />
            <circle cx="500" cy="400" fill="#8ec6bd" r="16" />
            <text fill="#2d6a5f" fontFamily="Be Vietnam Pro" fontSize="9" fontWeight="600" textAnchor="middle" x="500" y="425">
              HỒ BƠI VÔ CỰC
            </text>

            {/* Grand Central Lobby / Reception */}
            <rect fill="#eae4dc" height="90" rx="18" stroke="#d5ccbf" strokeWidth="2" width="160" x="420" y="50" />
            <text fill="#59413a" fontFamily="Syne" fontSize="12" fontWeight="600" textAnchor="middle" x="500" y="100">
              SẢNH CHÍNH &amp; LỄ TÂN
            </text>

            {/* Building Footprint: Tòa A (Ocean Wing) - Left Near Beach */}
            <rect
              fill="#ffffff"
              filter="drop-shadow(0 6px 12px rgba(194,65,12,0.18))"
              height="110"
              rx="20"
              stroke="#c2410c"
              strokeWidth={selectedPin === 'A' ? '4' : '3'}
              width="150"
              x="160"
              y="360"
              className="cursor-pointer"
              onClick={() => {
                setSelectedPin('A');
                onSelectZone?.('Tòa A');
              }}
            />
            <rect fill="#fff5f0" height="80" rx="12" width="120" x="175" y="375" />
            <text fill="#9b2f00" fontFamily="Syne" fontSize="13" fontWeight="700" textAnchor="middle" x="235" y="412">
              TÒA A
            </text>
            <text fill="#c2410c" fontFamily="Be Vietnam Pro" fontSize="9" fontWeight="600" textAnchor="middle" x="235" y="428">
              KHỐI BIỂN (5 TẦNG)
            </text>

            {/* Building Footprint: Tòa B (Garden Wing) - Right Near Center */}
            <rect
              fill="#ffffff"
              filter="drop-shadow(0 6px 12px rgba(194,65,12,0.18))"
              height="100"
              rx="20"
              stroke="#c2410c"
              strokeWidth={selectedPin === 'B' ? '4' : '3'}
              width="140"
              x="680"
              y="240"
              className="cursor-pointer"
              onClick={() => {
                setSelectedPin('B');
                onSelectZone?.('Tòa B');
              }}
            />
            <rect fill="#fff5f0" height="70" rx="12" width="110" x="695" y="255" />
            <text fill="#9b2f00" fontFamily="Syne" fontSize="13" fontWeight="700" textAnchor="middle" x="750" y="290">
              TÒA B
            </text>
            <text fill="#c2410c" fontFamily="Be Vietnam Pro" fontSize="9" fontWeight="600" textAnchor="middle" x="750" y="306">
              HOA VIÊN (4 TẦNG)
            </text>

            {/* Building Footprint: Tòa C (Skyline Hill) - Top Left */}
            <rect fill="#e8e5e0" height="85" rx="16" stroke="#d3cec6" strokeWidth="1.5" width="140" x="120" y="120" />
            <text fill="#716b64" fontFamily="Syne" fontSize="11" fontWeight="600" textAnchor="middle" x="190" y="160">
              TÒA C
            </text>
            <text fill="#8d867d" fontFamily="Be Vietnam Pro" fontSize="8" textAnchor="middle" x="190" y="176">
              ĐỒI CAO (3 TẦNG)
            </text>

            {/* Beachfront Villas (Clusters 101-112) */}
            <g transform="translate(640, 470)">
              <rect fill="#e8e5e0" height="36" rx="8" stroke="#d3cec6" strokeWidth="1.5" width="45" x="0" y="0" />
              <rect fill="#e8e5e0" height="36" rx="8" stroke="#d3cec6" strokeWidth="1.5" width="45" x="60" y="0" />
              <rect fill="#e8e5e0" height="36" rx="8" stroke="#d3cec6" strokeWidth="1.5" width="45" x="120" y="0" />
              <rect fill="#e8e5e0" height="36" rx="8" stroke="#d3cec6" strokeWidth="1.5" width="45" x="180" y="0" />
              <text fill="#716b64" fontFamily="Be Vietnam Pro" fontSize="9" fontWeight="600" textAnchor="middle" x="110" y="54">
                KHU BIỆT THỰ BIỂN (101 - 112)
              </text>
            </g>

            {/* Amenity Pavilions */}
            <circle cx="340" cy="220" fill="#eae4dc" r="32" stroke="#d5ccbf" strokeWidth="1.5" />
            <text fill="#59413a" fontFamily="Be Vietnam Pro" fontSize="9" fontWeight="600" textAnchor="middle" x="340" y="224">
              Nhà hàng Hay Hay
            </text>

            <circle cx="680" cy="140" fill="#eae4dc" r="32" stroke="#d5ccbf" strokeWidth="1.5" />
            <text fill="#59413a" fontFamily="Be Vietnam Pro" fontSize="9" fontWeight="600" textAnchor="middle" x="680" y="144">
              Pure Spa
            </text>
          </svg>

          {/* INTERACTIVE PIN OVERLAYS */}
          {/* Pin 1: Tòa A */}
          <div
            onClick={() => {
              setSelectedPin('A');
              onSelectZone?.('Tòa A');
            }}
            className="absolute left-[23.5%] top-[56%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-30"
          >
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-primary-container text-on-primary shadow-lg ring-4 ring-white">
                <span className="material-symbols-outlined text-[16px]">apartment</span>
              </span>
            </span>
            <div className="mt-1 -ml-12 px-3 py-1 rounded-full bg-surface-container-lowest shadow-md flex items-center gap-1.5 whitespace-nowrap border border-[#eae8e5]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-label-sm text-[11px] font-bold text-on-surface">Tòa A - Khối Biển (85%)</span>
            </div>
          </div>

          {/* Pin 2: Tòa B */}
          <div
            onClick={() => {
              setSelectedPin('B');
              onSelectZone?.('Tòa B');
            }}
            className="absolute left-[75%] top-[40%] -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
          >
            <span className="relative flex h-8 w-8 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-50" />
              <span className="relative inline-flex items-center justify-center rounded-full h-7 w-7 bg-primary-container text-on-primary shadow-lg ring-4 ring-white">
                <span className="material-symbols-outlined text-[16px]">nature_people</span>
              </span>
            </span>
            <div className="mt-1 -ml-16 px-3 py-1 rounded-full bg-surface-container-lowest shadow-md flex items-center gap-1.5 whitespace-nowrap border border-[#eae8e5]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-label-sm text-[11px] font-bold text-on-surface">Tòa B - Khối Hoa Viên (91%)</span>
            </div>
          </div>

          {/* Pin 3: Tòa C (Muted) */}
          <div className="absolute left-[19%] top-[24%] -translate-x-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity">
            <div className="px-2.5 py-1 rounded-full bg-surface-container-high/90 backdrop-blur-sm text-on-surface font-label-sm text-[10px] font-semibold flex items-center gap-1 shadow-sm border border-[#eae8e5]">
              <span className="material-symbols-outlined text-[13px] text-outline">lock</span>
              <span>Tòa C - Đồi</span>
            </div>
          </div>

          {/* Pin 4: Khu Villa Biển (Muted) */}
          <div className="absolute left-[75%] top-[70%] -translate-x-1/2 -translate-y-1/2 opacity-75 hover:opacity-100 transition-opacity">
            <div className="px-2.5 py-1 rounded-full bg-surface-container-high/90 backdrop-blur-sm text-on-surface font-label-sm text-[10px] font-semibold flex items-center gap-1 shadow-sm border border-[#eae8e5]">
              <span className="material-symbols-outlined text-[13px] text-outline">lock</span>
              <span>Khu Villa Biển</span>
            </div>
          </div>

          {/* Pin 5: Hồ bơi vô cực */}
          <div className="absolute left-[50%] top-[60%] -translate-x-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity">
            <div className="px-2 py-0.5 rounded-full bg-cyan-100/90 backdrop-blur-sm text-cyan-900 font-label-sm text-[10px] font-semibold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[12px]">waves</span>
              <span>Hồ bơi vô cực</span>
            </div>
          </div>
        </div>

        {/* FLOATING ACTIVE POPOVER (Pinned over active selected building) */}
        {selectedPin === 'A' && (
          <div className="absolute left-[4%] top-[20%] w-80 bg-surface-container-lowest/95 backdrop-blur-xl rounded-DEFAULT p-4 shadow-xl border border-[#eae8e5] z-40 transition-all duration-300">
            <div className="flex items-start justify-between gap-2 pb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-label-sm text-[10px] text-primary uppercase font-bold tracking-widest">
                    Phân khu bạn phụ trách
                  </span>
                </div>
                <h3 className="font-headline-sm text-lg text-on-surface font-bold tracking-tight">Tòa A - Khối Biển</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-[11px] font-bold">
                85% lấp đầy
              </span>
            </div>
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                <span>Số lượng phòng:</span>
                <span className="text-on-surface font-semibold">34 / 40 phòng có khách</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary-container h-1.5 rounded-full" style={{ width: '85%' }} />
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm pt-1">
                <span className="text-on-surface-variant">Lịch hôm nay:</span>
                <span className="text-on-surface font-semibold">6 Check-in • 4 Check-out</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenRoomList?.('Tòa A')}
                className="w-full py-2 px-3 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-tertiary transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Mở danh sách phòng</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {selectedPin === 'B' && (
          <div className="absolute right-[4%] top-[20%] w-80 bg-surface-container-lowest/95 backdrop-blur-xl rounded-DEFAULT p-4 shadow-xl border border-[#eae8e5] z-40 transition-all duration-300">
            <div className="flex items-start justify-between gap-2 pb-2">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-label-sm text-[10px] text-primary uppercase font-bold tracking-widest">
                    Phân khu bạn phụ trách
                  </span>
                </div>
                <h3 className="font-headline-sm text-lg text-on-surface font-bold tracking-tight">Tòa B - Hoa Viên</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-label-sm text-[11px] font-bold">
                91% lấp đầy
              </span>
            </div>
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                <span>Số lượng phòng:</span>
                <span className="text-on-surface font-semibold">29 / 32 phòng có khách</span>
              </div>
              <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary-container h-1.5 rounded-full" style={{ width: '91%' }} />
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm pt-1">
                <span className="text-on-surface-variant">Lịch hôm nay:</span>
                <span className="text-on-surface font-semibold">5 Check-in • 2 Check-out</span>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenRoomList?.('Tòa B')}
                className="w-full py-2 px-3 rounded-full bg-primary-container text-on-primary font-label-md text-label-md font-semibold hover:bg-tertiary transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
              >
                <span>Mở danh sách phòng</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* Floating Zoom Controls */}
        <div className="absolute right-4 top-4 flex flex-col gap-1.5 z-20">
          <div className="flex flex-col bg-surface-container-lowest/90 backdrop-blur-md rounded-full shadow-md overflow-hidden border border-[#eae8e5]">
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Phóng to"
            >
              <span className="material-symbols-outlined text-[19px]">add</span>
            </button>
            <div className="w-full h-px bg-surface-container-high" />
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="w-9 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              title="Thu nhỏ"
            >
              <span className="material-symbols-outlined text-[19px]">remove</span>
            </button>
          </div>
          <button
            type="button"
            onClick={handleResetZoom}
            className="w-9 h-9 bg-surface-container-lowest/90 backdrop-blur-md rounded-full shadow-md flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors border border-[#eae8e5] cursor-pointer"
            title="Đặt lại góc nhìn"
          >
            <span className="material-symbols-outlined text-[19px]">center_focus_strong</span>
          </button>
        </div>

        {/* Map Legend */}
        <div className="absolute right-4 bottom-4 bg-surface-container-lowest/90 backdrop-blur-md rounded-DEFAULT p-3 shadow-md flex flex-col gap-2 z-20 border border-[#eae8e5]">
          <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">
            Chú thích sơ đồ
          </span>
          <div className="flex flex-col gap-1.5 font-label-sm text-[11px] text-on-surface">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
              <span>Phân khu bạn phụ trách</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-dim" />
              <span className="text-on-surface-variant">Phân khu khác</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <span className="text-on-surface-variant">Khu tiện ích chung</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campus Bottom Status Micro-Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">navigation</span>
            <span>Tổng diện tích khuôn viên: 18.5 hecta</span>
          </span>
          <span className="hidden md:inline">•</span>
          <span>Tổng số phòng toàn resort: 108 phòng &amp; villas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Hệ thống mạng không dây &amp; IOT Cảm biến phòng: Ổn định</span>
        </div>
      </div>
    </div>
  );
};
