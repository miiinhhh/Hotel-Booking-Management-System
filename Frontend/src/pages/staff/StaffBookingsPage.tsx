import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StaffSidebar } from './components/StaffSidebar';
import { StaffHeader, StaffHeaderNotification } from './components/StaffHeader';
import { StaffMetrics } from './components/StaffMetrics';
import { StaffFilterBar } from './components/StaffFilterBar';
import { StaffBookingTable } from './components/StaffBookingTable';
import { StaffPagination } from './components/StaffPagination';
import { BookingDetailDrawer } from './components/BookingDetailDrawer';
import { StaffCustomersView } from './components/StaffCustomersView';
import { StaffCalendarView } from './components/StaffCalendarView';
import { StaffSuitesView } from './components/StaffSuitesView';
import { StaffBooking, StaffMetricsData, StaffPortalTab, StaffBookingStatus, StaffDepositStatus } from './types';
import { getMyAssignedAreas } from '../../services/staffAssignmentApi';
import {
  updateBookingStatus,
  cancelBooking,
} from '../../services/bookingApi';
import { useAuth } from '../../context/AuthContext';
import { getStaffDashboard, getStaffNotifications, StaffPortalBookingDto, StaffPortalNotificationDto } from '../../services/staffPortalApi';
import { roomApi } from '../../services/roomApi';

interface StaffBookingsPageProps {
  onNavigateCustomerPortal?: () => void;
}

const mapStaffNotifications = (notifications: StaffPortalNotificationDto[]): StaffHeaderNotification[] =>
  notifications.map((notification) => ({
    id: notification.id,
    icon: notification.icon,
    title: notification.title,
    description: notification.description,
    time: new Date(notification.occurredAt).toLocaleString('vi-VN'),
  }));

export const StaffBookingsPage: React.FC<StaffBookingsPageProps> = ({
  onNavigateCustomerPortal,
}) => {
  const { logout, session } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [metrics, setMetrics] = useState<StaffMetricsData>({
    totalToday: 0, totalChangePercent: 0, pendingDepositCount: 0,
    checkInTodayCount: 0, checkInCompletedCount: 0, checkInRemainingCount: 0,
    checkOutTodayCount: 0, checkOutCompletedCount: 0, checkOutPendingKeyCount: 0,
  });
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState('');
  const [staffNotifications, setStaffNotifications] = useState<StaffHeaderNotification[]>([]);
  const [assignedAreas, setAssignedAreas] = useState<Array<{
    areaId: number;
    hotelId: number;
    hotelName: string;
    areaName: string;
    areaType: string;
    totalRooms?: number;
  }>>([]);


  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedZone, setSelectedZone] = useState('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawer state
  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Map Backend Status to Frontend UI Status
  const mapBackendStatus = (status: string): { status: StaffBookingStatus; label: string } => {
    switch (status?.toLowerCase()) {
      case 'checkedin':
        return { status: 'checked_in', label: 'ĐÃ CHECK-IN' };
      case 'confirmed':
        return { status: 'confirmed_deposit', label: 'ĐÃ XÁC NHẬN CỌC' };
      case 'cancelled':
        return { status: 'cancelled', label: 'ĐÃ HỦY' };
      case 'checkedout':
      case 'completed':
        return { status: 'staying', label: 'ĐÃ HOÀN TẤT' };
      case 'pending':
      default:
        return { status: 'pending_deposit', label: 'CHỜ CỌC' };
    }
  };

  const mapBackendPayment = (pmt: string, paid: number): { status: StaffDepositStatus; label: string } => {
    if (pmt === 'Paid') return { status: 'paid_100', label: 'Đã trả 100%' };
    if (pmt === 'RefundPending') return { status: 'refund_pending', label: 'Chờ hoàn cọc' };
    if (pmt === 'Refunded') return { status: 'refunded', label: 'Đã hoàn cọc' };
    if (paid > 0) return { status: 'deposited_50', label: `Đã thanh toán ${paid.toLocaleString('vi-VN')}₫` };
    return { status: 'unpaid', label: 'Chưa thanh toán' };
  };

  // Load Bookings from Backend API
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    setBookingError('');
    try {
      const [dashboard, notificationData] = await Promise.all([
        getStaffDashboard(),
        getStaffNotifications().catch(() => []),
      ]);
      const apiBookings: StaffBooking[] = dashboard.bookings.map((b: StaffPortalBookingDto) => {
        const mappedSt = mapBackendStatus(b.bookingStatus);
        const mappedDep = mapBackendPayment(b.paymentStatus, b.paidAmount);
        const checkIn = new Date(b.checkInDate);
        const checkOut = new Date(b.checkOutDate);
        const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24)));
        const nameParts = b.customerName.trim().split(/\s+/);
        const initials = nameParts.length > 1
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
          : (nameParts[0]?.slice(0, 2).toUpperCase() || 'KH');

        return {
          id: String(b.bookingId),
          bookingCode: b.bookingCode || `#BK-${10000 + b.bookingId}`,
          createdAt: new Date(b.createdAt).toLocaleString('vi-VN'),
          customerName: b.customerName,
          customerInitials: initials,
          customerPhone: b.customerPhone || 'Chưa cập nhật',
          customerEmail: b.customerEmail || 'Chưa cập nhật',
          customerCccd: 'Chưa cập nhật',
          vipLevel: 'Khách lưu trú',
          membershipTier: 'Standard',
          zone: b.areas.join(', ') || 'Chưa xếp khu vực',
          roomNumber: b.roomNumbers.join(', ') || 'Chưa xếp phòng',
          roomType: b.roomTypes.join(', ') || 'Chưa xác định',
          roomDetails: `${b.numberOfGuests} khách · ${b.roomNumbers.length} phòng`,
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
          checkInTime: '14:00',
          checkOutTime: '12:00',
          nightsCount: nights,
          nightsLabel: `${nights} đêm nghỉ`,
          totalAmount: b.totalAmount,
          paidAmount: b.paidAmount,
          remainingAmount: b.remainingAmount,
          depositStatus: mappedDep.status,
          depositStatusLabel: mappedDep.label,
          depositDeadline: '15 phút',
          status: mappedSt.status,
          statusLabel: mappedSt.label,
          specialRequests: b.specialRequests,
          receptionist: session?.fullName || 'Nhân viên khách sạn',
          lastUpdated: b.updatedAt ? new Date(b.updatedAt).toLocaleString('vi-VN') : undefined,
        };
      });
      setBookings(apiBookings);
      setMetrics(dashboard.metrics);
      setStaffNotifications(mapStaffNotifications(notificationData));
    } catch (reason) {
      setBookings([]);
      setBookingError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu đặt phòng.');
    } finally {
      setLoadingBookings(false);
    }
  }, [session?.fullName]);

  useEffect(() => {
    getMyAssignedAreas().then(async (res) => {
      if (res.success && res.data) {
        const hotelIds = Array.from(new Set(res.data.map(area => area.hotelId)));
        const hotels = await Promise.all(hotelIds.map(id => roomApi.hotel(id)));
        const hotelNames = Object.fromEntries(hotels.map(hotel => [hotel.hotelId, hotel.hotelName]));
        setAssignedAreas(
          res.data.map((a) => ({
            areaId: a.areaId,
            hotelId: a.hotelId,
            hotelName: hotelNames[a.hotelId] || `Khách sạn #${a.hotelId}`,
            areaName: a.areaName,
            areaType: a.areaType,
            totalRooms: a.totalRooms,
          }))
        );
      }
    });

    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const refreshNotifications = async () => {
      try {
        setStaffNotifications(mapStaffNotifications(await getStaffNotifications()));
      } catch {
        // Keep the current list when a background refresh temporarily fails.
      }
    };
    const intervalId = window.setInterval(() => void refreshNotifications(), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Zone filter
      if (selectedZone !== 'all' && b.zone !== selectedZone) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && b.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = b.bookingCode.toLowerCase().includes(q);
        const matchName = b.customerName.toLowerCase().includes(q);
        const matchPhone = b.customerPhone.toLowerCase().includes(q);
        const matchRoom = b.roomNumber.toLowerCase().includes(q);
        const matchType = b.roomType.toLowerCase().includes(q);
        return matchCode || matchName || matchPhone || matchRoom || matchType;
      }

      return true;
    });
  }, [bookings, selectedZone, selectedStatus, searchQuery]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBookings.slice(start, start + pageSize);
  }, [filteredBookings, currentPage, pageSize]);
  const zoneOptions = useMemo(
    () => Array.from(new Set(bookings.flatMap(booking => booking.zone.split(', ').filter(Boolean)))),
    [bookings],
  );
  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedZone('all');
    setCurrentPage(1);
    showToast('Đã đặt lại các bộ lọc tìm kiếm.');
  };

  // View details in drawer
  const handleViewDetails = (booking: StaffBooking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
  };

  // Quick check-in
  const handleCheckIn = async (target: StaffBooking) => {
    const bookingIdNum = Number(target.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      const res = await updateBookingStatus(bookingIdNum, {
        newStatus: 'CheckedIn',
        note: `Check-in thành công bởi ${session?.fullName || 'nhân viên khách sạn'} lúc ${new Date().toLocaleTimeString('vi-VN')}`,
      });
      if (!res.success) {
        showToast(`Lỗi Check-in: ${res.message || 'Không thể cập nhật trên máy chủ'}`);
        return;
      }
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === target.id
          ? {
              ...b,
              status: 'checked_in',
              statusLabel: 'ĐÃ CHECK-IN',
              checkInTime: `Đã check-in lúc ${new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}`,
            }
          : b
      )
    );

    if (selectedBooking && selectedBooking.id === target.id) {
      setSelectedBooking((prev) =>
        prev
          ? {
              ...prev,
              status: 'checked_in',
              statusLabel: 'ĐÃ CHECK-IN',
            }
          : null
      );
    }

    setMetrics((prev) => ({
      ...prev,
      checkInCompletedCount: prev.checkInCompletedCount + 1,
      checkInRemainingCount: Math.max(0, prev.checkInRemainingCount - 1),
    }));

    showToast(`Check-in thành công cho khách ${target.customerName} (Phòng ${target.roomNumber}).`);
  };

  // Quick confirm deposit
  const handleConfirmBooking = async (target: StaffBooking) => {
    const bookingIdNum = Number(target.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      const res = await updateBookingStatus(bookingIdNum, {
        newStatus: 'Confirmed',
        note: `Xác nhận booking bởi ${session?.fullName || 'nhân viên khách sạn'}`,
      });
      if (!res.success) {
        showToast(`Lỗi xác nhận booking: ${res.message || 'Không thể cập nhật trên máy chủ'}`);
        return;
      }
    }
    await fetchBookings();
    showToast(`Đã xác nhận booking ${target.bookingCode}. Trạng thái thanh toán được giữ theo giao dịch thực tế.`);
  };

  // Cancel booking
  const handleCancelBooking = async (target: StaffBooking) => {
    const bookingIdNum = Number(target.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      const res = await cancelBooking(bookingIdNum, 'Hủy đơn theo yêu cầu của khách tại quầy Lễ tân');
      if (!res.success) {
        showToast(`Lỗi hủy đơn: ${res.message || 'Không thể hủy trên máy chủ'}`);
        return;
      }
    }

    setBookings((prev) =>
      prev.map((b) =>
        b.id === target.id
          ? {
              ...b,
              status: 'cancelled',
              statusLabel: 'ĐÃ HỦY',
              depositStatus: 'refunded',
              depositStatusLabel: 'Đã hoàn cọc',
            }
          : b
      )
    );

    if (selectedBooking && selectedBooking.id === target.id) {
      setSelectedBooking((prev) =>
        prev
          ? {
              ...prev,
              status: 'cancelled',
              statusLabel: 'ĐÃ HỦY',
              depositStatus: 'refunded',
              depositStatusLabel: 'Đã hoàn cọc',
            }
          : null
      );
    }

    showToast(`Đã hủy booking ${target.bookingCode} và chuyển sang trạng thái hoàn cọc.`);
  };

  const handleConfirmPayment = (updated: StaffBooking) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    );
    setSelectedBooking(updated);
    showToast(`Đã xác nhận thu đủ tiền cho đơn ${updated.bookingCode}.`);
  };

  // Update notes
  const handleRefundBooking = (updated: StaffBooking, message: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    );
    setSelectedBooking(updated);
    showToast(`${message} cho đơn ${updated.bookingCode}`);
  };

  const [staffTab, setStaffTab] = useState<StaffPortalTab>('reservations');

  const handleSelectStaffTab = (tab: string) => {
    setStaffTab(tab as StaffPortalTab);
  };

  const handleExportExcel = () => {
    const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const rows = filteredBookings.map((booking) => [
      booking.bookingCode, booking.customerName, booking.customerPhone,
      booking.zone, booking.roomNumber, booking.roomType,
      booking.checkInDate, booking.checkOutDate, booking.statusLabel,
      booking.depositStatusLabel, booking.totalAmount,
    ]);
    const csv = [
      ['Mã booking', 'Khách hàng', 'Điện thoại', 'Phân khu', 'Phòng', 'Hạng phòng', 'Nhận phòng', 'Trả phòng', 'Trạng thái', 'Thanh toán', 'Tổng tiền'],
      ...rows,
    ].map((row) => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `staff-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất ${rows.length} booking từ dữ liệu hiện tại.`);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex selection:bg-secondary-container selection:text-on-secondary-container">
      {/* PERSISTENT LEFT SIDEBAR */}
      <StaffSidebar
        currentTab={staffTab}
        onSelectTab={handleSelectStaffTab}
        onNavigateCustomerPortal={onNavigateCustomerPortal}
        assignedAreas={assignedAreas}
        activeAreaId={(selectedZone === 'all' ? assignedAreas[0] : assignedAreas.find(area => area.areaName === selectedZone))?.areaId}
        onSelectArea={(areaId) => {
          const areaObj = assignedAreas.find((a) => a.areaId === areaId);
          setSelectedZone('all');
          showToast(`Đã chuyển khu vực trực sang: ${areaObj ? `${areaObj.hotelName} · ${areaObj.areaName}` : 'Không xác định'}`);
        }}
      />

      {/* MAIN WRAPPER (pl-72 for persistent sidebar) */}
      <div className="pl-72 flex flex-col min-h-screen w-full">
        {/* INTEGRATED STAFF TOP BAR (HEADER) */}
        <StaffHeader
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          notifications={staffNotifications}
          onLogout={() => void handleLogout()}
          loggingOut={loggingOut}
          currentTab={staffTab}
        />

        {/* MAIN OPERATIONAL WORKSPACE */}
        <main className="w-full pt-24 bg-surface flex-1 px-8 pb-12 flex flex-col gap-6">
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="fixed top-24 right-8 z-50 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
              <span className="material-symbols-outlined text-primary-fixed text-[20px]">
                check_circle
              </span>
              <span className="font-label-md text-label-md font-medium">{toastMessage}</span>
            </div>
          )}

          {/* 1. CALENDAR VIEW (Lịch phòng & Khóa bán) */}
          {staffTab === 'calendar' && (
            <StaffCalendarView onShowToast={showToast} />
          )}

          {/* 2. SUITES VIEW (Suites & Phân khu) */}
          {staffTab === 'suites' && (
            <StaffSuitesView
              onShowToast={showToast}
              onNavigateToReservations={(zone) => {
                if (zone) setSelectedZone(zone);
                setStaffTab('reservations');
              }}
            />
          )}

          {/* 3. CUSTOMERS VIEW (Hồ sơ Khách hàng) */}
          {staffTab === 'customers' && (
            <StaffCustomersView onShowToast={showToast} />
          )}

          {/* 4. RESERVATIONS VIEW (Quản lý Đặt phòng) */}
          {staffTab === 'reservations' && (
            <>
              {/* TOP TITLE BAR & ACTION BUTTONS */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-secondary font-label-sm uppercase tracking-widest text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
                    <span>Khu vực phụ trách: {assignedAreas.length ? assignedAreas.map(area => `${area.hotelName} · ${area.areaName}`).join(', ') : 'Chưa được phân công'}</span>
                    <span className="text-outline-variant">·</span>
                    <span>Ca trực sáng (08:00 - 16:00)</span>
                    <span className="text-outline-variant">·</span>
                    <span className="text-on-surface-variant">Cập nhật: 09:42 SA</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight flex items-baseline flex-wrap gap-2.5">
                    Quản lý &amp; Tra cứu Đặt phòng
                    <span className="font-normal text-on-surface-variant text-[22px] tracking-normal font-headline-sm">
                      (Zone Bookings Management)
                    </span>
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Điều phối lưu trú, đối soát tiền cọc và thực hiện thủ tục check-in theo phân khu
                    được chỉ định tại StayLuxe Đà Nẵng
                  </p>
                </div>

                {/* Top Right Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-all duration-200 border border-[#eae8e5] shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary transition-transform duration-200 group-hover:-translate-y-0.5">
                      download
                    </span>
                    <span>Xuất Excel</span>
                  </button>
                  <button type="button" disabled={loadingBookings} onClick={() => void fetchBookings()} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:bg-tertiary-container shadow-[0_4px_16px_rgba(194,65,12,0.22)] transition-all duration-200 font-semibold cursor-pointer disabled:opacity-60">
                    <span className={`material-symbols-outlined text-[19px] ${loadingBookings ? 'animate-spin' : ''}`}>{loadingBookings ? 'progress_activity' : 'refresh'}</span>
                    <span>{loadingBookings ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}</span>
                  </button>
                </div>
              </div>

              {/* OPERATIONAL METRICS & KPI HEADER */}
              <StaffMetrics metrics={metrics} />

              {bookingError && <p role="alert" className="rounded-lg bg-error-container p-4 text-on-error-container">{bookingError}</p>}
              {loadingBookings && <p role="status" className="rounded-lg bg-surface-container-low p-4 text-on-surface-variant">Đang tải booking trong phạm vi được phân công…</p>}

              {/* FILTER & ACTIONS BAR */}
              <StaffFilterBar
                searchQuery={searchQuery}
                onSearchChange={(q) => {
                  setSearchQuery(q);
                  setCurrentPage(1);
                }}
                selectedStatus={selectedStatus}
                onStatusChange={(st) => {
                  setSelectedStatus(st);
                  setCurrentPage(1);
                }}
                selectedZone={selectedZone}
                onZoneChange={(zn) => {
                  setSelectedZone(zn);
                  setCurrentPage(1);
                }}
                onResetFilters={handleResetFilters}
                zoneOptions={zoneOptions}
              />

              {/* COMPREHENSIVE DATA TABLE */}
              <StaffBookingTable
                bookings={paginatedBookings}
                onViewDetails={handleViewDetails}
                onQuickCheckIn={handleCheckIn}
                onQuickConfirmBooking={handleConfirmBooking}
              />

              {/* PAGINATION CONTROLS */}
              <StaffPagination
                totalItems={filteredBookings.length}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            </>
          )}
        </main>

        {/* FOOTER */}
        <footer className="w-full bg-surface-container-low border-t border-[#eae8e5] mt-auto">
          <div className="w-full px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3 font-label-md text-label-md text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-sm text-primary font-bold tracking-tight">
                StayLuxe
              </span>
              <span>© 2025 StayLuxe Hospitality Group • Khu nghỉ dưỡng 5 sao Đà Nẵng</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Máy trạm Lễ tân: Quầy 02 (Sảnh Chính)
              </span>
              <span className="hidden lg:inline text-outline-variant">|</span>
              <span className="hidden lg:inline">Hỗ trợ Kỹ thuật Nội bộ: Ext 108</span>
            </div>
          </div>
        </footer>
      </div>

      {/* SLIDE-OVER DETAIL DRAWER (SCREEN 2) */}
      <BookingDetailDrawer
        booking={selectedBooking}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCheckIn={handleCheckIn}
        onCancelBooking={handleCancelBooking}
        onRefundBooking={handleRefundBooking}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};
export default StaffBookingsPage;
