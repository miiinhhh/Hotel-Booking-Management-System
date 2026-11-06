import React, { useState, useMemo } from 'react';
import { RoomPriceHistoryDto } from '../../../services/pricingAdminApi';
import { formatVnd } from '../../../utils/formatters';

interface PriceHistoryChartProps {
  histories: RoomPriceHistoryDto[];
  roomTypeName?: string;
  currentBasePrice?: number;
}

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  histories,
  roomTypeName = 'Hạng phòng',
  currentBasePrice = 0,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sắp xếp dữ liệu theo thứ tự thời gian tăng dần (từ cũ đến mới nhất) để vẽ biểu đồ diễn biến
  const sortedData = useMemo(() => {
    const list = [...histories];
    return list.sort(
      (a, b) => new Date(a.effectiveFrom).getTime() - new Date(b.effectiveFrom).getTime()
    );
  }, [histories]);

  // Các chỉ số thống kê tổng hợp
  const stats = useMemo(() => {
    if (sortedData.length === 0) {
      return {
        currentPrice: currentBasePrice,
        minPrice: currentBasePrice,
        maxPrice: currentBasePrice,
        priceChange: 0,
        priceChangePercent: 0,
        totalAdjustments: 0,
      };
    }

    const prices = sortedData.map((d) => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currentPrice = sortedData[sortedData.length - 1].price;
    const initialPrice = sortedData[0].price;
    const priceChange = currentPrice - initialPrice;
    const priceChangePercent =
      initialPrice > 0 ? ((priceChange / initialPrice) * 100).toFixed(1) : '0';

    return {
      currentPrice,
      minPrice,
      maxPrice,
      priceChange,
      priceChangePercent,
      totalAdjustments: sortedData.length,
    };
  }, [sortedData, currentBasePrice]);

  const formatCurrency = (val: number) => formatVnd(val);

  // Kích thước khung vẽ SVG
  const width = 760;
  const height = 240;
  const paddingLeft = 90;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Tính toán tọa độ điểm
  const points = useMemo(() => {
    if (sortedData.length === 0) return [];

    const prices = sortedData.map((d) => d.price);
    let min = Math.min(...prices);
    let max = Math.max(...prices);

    // Tránh chia cho 0 nếu tất cả mức giá bằng nhau
    if (min === max) {
      min = Math.max(0, min - 200000);
      max = max + 200000;
    } else {
      // Đệm 10% lề trên và dưới
      const range = max - min;
      min = Math.max(0, min - range * 0.1);
      max = max + range * 0.1;
    }

    const count = sortedData.length;
    const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth / 2;

    return sortedData.map((item, index) => {
      const x = count > 1 ? paddingLeft + index * stepX : paddingLeft + chartWidth / 2;
      const normalizedY = (item.price - min) / (max - min);
      const y = paddingTop + chartHeight - normalizedY * chartHeight;

      // Tính biến động so với mốc trước
      const prevPrice = index > 0 ? sortedData[index - 1].price : null;
      const diffFromPrev = prevPrice !== null ? item.price - prevPrice : null;

      return {
        x,
        y,
        data: item,
        diffFromPrev,
      };
    });
  }, [sortedData, chartWidth, chartHeight, paddingLeft, paddingTop]);

  // Tạo đường line Path SVG
  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      return `M ${paddingLeft} ${points[0].y} L ${paddingLeft + chartWidth} ${points[0].y}`;
    }
    return points.reduce((path, pt, idx) => {
      return idx === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
    }, '');
  }, [points, paddingLeft, chartWidth]);

  // Tạo vùng gradient fill dưới đường line
  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const bottomY = paddingTop + chartHeight;
    if (points.length === 1) {
      return `M ${paddingLeft} ${points[0].y} L ${paddingLeft + chartWidth} ${points[0].y} L ${paddingLeft + chartWidth} ${bottomY} L ${paddingLeft} ${bottomY} Z`;
    }
    const first = points[0];
    const last = points[points.length - 1];
    return `${linePath} L ${last.x} ${bottomY} L ${first.x} ${bottomY} Z`;
  }, [linePath, points, paddingTop, chartHeight, paddingLeft, chartWidth]);

  // Lưới giá (3 mốc Y-axis)
  const yTicks = useMemo(() => {
    if (sortedData.length === 0) return [];
    const prices = sortedData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const mid = (min + max) / 2;
    return [
      { label: formatCurrency(max), yRatio: 1 },
      { label: formatCurrency(mid), yRatio: 0.5 },
      { label: formatCurrency(min), yRatio: 0 },
    ];
  }, [sortedData]);

  if (sortedData.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-outline/30 bg-surface-container-low/40 p-8 text-center">
        <span className="material-symbols-outlined text-4xl text-outline/80 mb-2 block">
          monitoring
        </span>
        <h4 className="font-semibold text-on-surface">Chưa có lịch sử thay đổi giá</h4>
        <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
          Biểu đồ sẽ tự động ghi nhận và trực quan hóa xu hướng giá khi Admin thực hiện cập nhật
          hoặc cấu hình các giai đoạn giá mới cho {roomTypeName}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-container-low/60 border border-outline-variant/30 p-5 space-y-4">
      {/* Thẻ chỉ số tổng hợp phía trên biểu đồ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/20 shadow-xs">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wider">
            Giá hiện hành
          </p>
          <p className="mt-1 text-base font-bold text-primary font-mono">
            {formatCurrency(stats.currentPrice)}
          </p>
        </div>

        <div className="rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/20 shadow-xs">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wider">
            Biến động tổng thể
          </p>
          <p
            className={`mt-1 text-base font-bold font-mono ${
              stats.priceChange > 0
                ? 'text-emerald-600'
                : stats.priceChange < 0
                ? 'text-rose-600'
                : 'text-on-surface'
            }`}
          >
            {stats.priceChange > 0 ? '+' : ''}
            {formatCurrency(stats.priceChange)}
            <span className="text-xs font-normal ml-1">
              ({stats.priceChange > 0 ? '+' : ''}
              {stats.priceChangePercent}%)
            </span>
          </p>
        </div>

        <div className="rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/20 shadow-xs">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wider">
            Biên độ giá (Thấp - Cao)
          </p>
          <p className="mt-1 text-xs font-medium text-on-surface font-mono">
            {formatCurrency(stats.minPrice)} — {formatCurrency(stats.maxPrice)}
          </p>
        </div>

        <div className="rounded-lg bg-surface-container-lowest p-3 border border-outline-variant/20 shadow-xs">
          <p className="text-[11px] font-semibold text-outline uppercase tracking-wider">
            Số lần điều chỉnh
          </p>
          <p className="mt-1 text-base font-bold text-on-surface font-mono">
            {stats.totalAdjustments} <span className="text-xs font-normal text-outline">mốc</span>
          </p>
        </div>
      </div>

      {/* Khung vẽ biểu đồ trực quan hóa */}
      <div className="relative w-full overflow-hidden rounded-lg bg-surface-container-lowest p-3 pt-4 border border-outline-variant/20">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="pricingAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
              <stop offset="85%" stopColor="#059669" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </linearGradient>

            <filter id="dotShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Đường lưới ngang và nhãn trục Y */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + chartHeight - tick.yRatio * chartHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono font-medium"
                >
                  {tick.label}
                </text>
              </g>
            );
          })}

          {/* Vùng diện tích Gradient */}
          {areaPath && <path d={areaPath} fill="url(#pricingAreaGradient)" />}

          {/* Đường gấp khúc diễn biến giá */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Các điểm mốc điều chỉnh giá */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIndex === idx;
            const dateStr = new Date(pt.data.effectiveFrom).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
            });

            return (
              <g key={pt.data.priceHistoryId}>
                {/* Đường chỉ dẫn trục X */}
                <line
                  x1={pt.x}
                  y1={paddingTop + chartHeight}
                  x2={pt.x}
                  y2={paddingTop + chartHeight + 6}
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                {/* Nhãn ngày trục X */}
                <text
                  x={pt.x}
                  y={paddingTop + chartHeight + 20}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {dateStr}
                </text>

                {/* Vòng hào quang tương tác khi hover */}
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="12"
                    fill="#059669"
                    fillOpacity="0.2"
                    className="animate-ping"
                  />
                )}

                {/* Điểm nút hiển thị */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4.5}
                  fill="#ffffff"
                  stroke="#059669"
                  strokeWidth={isHovered ? 3 : 2}
                  filter="url(#dotShadow)"
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Vùng bắt sự kiện chuột rộng hơn cho tiện thao tác */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="16"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip khi người dùng rê chuột qua mốc giá */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="pointer-events-none absolute z-20 rounded-lg bg-slate-900/95 text-white p-3 text-xs shadow-xl backdrop-blur-xs border border-slate-700/60 transition-all duration-150"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
              top: `${(points[hoveredIndex].y / height) * 100}%`,
              transform: 'translate(-50%, -125%)',
            }}
          >
            <div className="font-bold text-sm text-emerald-400 font-mono">
              {formatCurrency(points[hoveredIndex].data.price)}
            </div>
            {points[hoveredIndex].diffFromPrev !== null && (
              <div
                className={`text-[11px] font-semibold mt-0.5 ${
                  points[hoveredIndex].diffFromPrev! > 0
                    ? 'text-emerald-400'
                    : points[hoveredIndex].diffFromPrev! < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {points[hoveredIndex].diffFromPrev! > 0 ? '▲ Tăng ' : points[hoveredIndex].diffFromPrev! < 0 ? '▼ Giảm ' : '— '}
                {formatCurrency(Math.abs(points[hoveredIndex].diffFromPrev!))}
              </div>
            )}
            <div className="text-[11px] text-slate-300 mt-1">
              Hiệu lực: {new Date(points[hoveredIndex].data.effectiveFrom).toLocaleDateString('vi-VN')}
              {points[hoveredIndex].data.effectiveTo &&
                ` → ${new Date(points[hoveredIndex].data.effectiveTo!).toLocaleDateString('vi-VN')}`}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Tạo lúc: {new Date(points[hoveredIndex].data.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
