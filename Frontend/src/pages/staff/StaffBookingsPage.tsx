import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { StaffSidebar } from './components/StaffSidebar';
import { StaffHeader } from './components/StaffHeader';
import { StaffMetrics } from './components/StaffMetrics';
import { StaffFilterBar, UPCOMING_REQUESTS } from './components/StaffFilterBar';
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
import { PERMISSIONS } from '../../auth/permissions';
import { STAFF_NAVIGATION } from './components/StaffSidebar';
import { ReviewModerationPanel } from '../../components/reviews/ReviewModerationPanel';
import { getStaffDashboard, StaffPortalBookingDto } from '../../services/staffPortalApi';
import { roomApi } from '../../services/roomApi';

interface StaffBookingsPageProps {
  onNavigateCustomerPortal?: () => void;
}

/** Hôm nay theo giờ máy, dạng yyyy-MM-dd (so sánh trực tiếp với checkInDate). */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Đơn chưa nhận phòng (chờ xác nhận / đã xác nhận), ngày đến từ hôm nay, có yêu cầu đặc biệt. */
const isUpcomingWithRequest = (b: StaffBooking) =>
  (b.status === 'pending_deposit' || b.status === 'confirmed_deposit')
  && Boolean(b.specialRequests?.trim())
  && b.checkInDate.slice(0, 10) >= todayIso();


export const StaffBookingsPage: React.FC<StaffBookingsPageProps> = ({
  onNavigateCustomerPortal,
}) => {
  const { logout, session, hasPermission, hasAnyPermission } = useAuth();
  const canViewBookings = hasPermission(PERMISSIONS.bookingView);
  const [loggingOut, setLoggingOut] = useState(false);
  const [bookings, setBookings] = useState<StaffBooking[]>([]);
  const [metrics, setMetrics] = useState<StaffMetricsData>({
    totalToday: 0, totalChangePercent: 0, pendingDepositCount: 0,
    checkInTodayCount: 0, checkInCompletedCount: 0, checkInRemainingCount: 0,
    checkOutTodayCount: 0, checkOutCompletedCount: 0, checkOutPendingKeyCount: 0,
  });
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState('');
  // Thời điểm đồng bộ dữ liệu booking gần nhất (thay cho giờ viết cứng)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    // Nhãn dùng chung với bảng/bộ lọc (staffUi.BOOKING_STATUS_UI) và file CSV xuất ra.
    switch (status?.toLowerCase()) {
      case 'checkedin':
        return { status: 'checked_in', label: 'Đang lưu trú' };
      case 'confirmed':
        return { status: 'confirmed_deposit', label: 'Đã xác nhận' };
      case 'cancelled':
      case 'noshow':
        return { status: 'cancelled', label: 'Đã hủy' };
      case 'checkedout':
      case 'completed':
        return { status: 'staying', label: 'Đã trả phòng' };
      case 'pending':
      default:
        return { status: 'pending_deposit', label: 'Chờ xác nhận' };
    }
  };

  const mapBackendPayment = (pmt: string, paid: number): { status: StaffDepositStatus; label: string } => {
    if (pmt === 'Paid') return { status: 'paid_100', label: 'Đã thanh toán đủ' };
    if (pmt === 'RefundPending') return { status: 'refund_pending', label: 'Chờ hoàn tiền' };
    if (pmt === 'Refunded') return { status: 'refunded', label: 'Đã hoàn tiền' };
    if (paid > 0) return { status: 'deposited_50', label: `Đã thu ${paid.toLocaleString('vi-VN')} ₫` };
    return { status: 'unpaid', label: 'Chưa thanh toán' };
  };

  // Load Bookings from Backend API
  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    setBookingError('');
    try {
      const dashboard = await getStaffDashboard();
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
          createdAt: new Date(b.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
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
          // Giờ nhận/trả phòng thực tế theo chính sách khách sạn chưa có trong DTO này → không hiển thị giờ đoán.
          nightsCount: nights,
          nightsLabel: `${nights} đêm`,
          totalAmount: b.totalAmount,
          paidAmount: b.paidAmount,
          remainingAmount: b.remainingAmount,
          depositStatus: mappedDep.status,
          depositStatusLabel: mappedDep.label,
          status: mappedSt.status,
          statusLabel: mappedSt.label,
          specialRequests: b.specialRequests,
          receptionist: session?.fullName || 'Nhân viên khách sạn',
          lastUpdated: b.updatedAt ? new Date(b.updatedAt).toLocaleString('vi-VN') : undefined,
        };
      });
      setBookings(apiBookings);
      setMetrics(dashboard.metrics);
      setLastSyncedAt(new Date());
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

    if (canViewBookings) fetchBookings();
    else setLoadingBookings(false);
  }, [fetchBookings, canViewBookings]);


  // Filtered bookings
  const filteredBookings = useMemo(() => {
    const list = bookings.filter((b) => {
      // Zone filter — một đơn có thể thuộc nhiều phân khu ("A, B")
      if (selectedZone !== 'all' && !b.zone.split(', ').includes(selectedZone)) {
        return false;
      }

      // Status filter ("Sắp đến · có yêu cầu" là bộ lọc nghiệp vụ riêng)
      if (selectedStatus === UPCOMING_REQUESTS) {
        if (!isUpcomingWithRequest(b)) return false;
      } else if (selectedStatus !== 'all' && b.status !== selectedStatus) {
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
    // Đơn sắp đến: khách tới sớm nhất lên trước để chuẩn bị theo thứ tự.
    if (selectedStatus === UPCOMING_REQUESTS) list.sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
    return list;
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
  /** Số đơn theo trạng thái (đã áp phân khu + tìm kiếm, chưa áp trạng thái) để hiện trên nút lọc. */
  const statusCounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const base = bookings.filter(b =>
      (selectedZone === 'all' || b.zone.split(', ').includes(selectedZone))
      && (!q || [b.bookingCode, b.customerName, b.customerPhone, b.roomNumber, b.roomType].some(v => v.toLowerCase().includes(q))));
    const counts: Record<string, number> = { all: base.length };
    for (const b of base) counts[b.status] = (counts[b.status] ?? 0) + 1;
    for (const s of ['pending_deposit', 'confirmed_deposit', 'checked_in', 'staying', 'cancelled']) counts[s] ??= 0;
    counts[UPCOMING_REQUESTS] = base.filter(isUpcomingWithRequest).length;
    return counts;
  }, [bookings, selectedZone, searchQuery]);
  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedStatus('all');
    setSelectedZone('all');
    setCurrentPage(1);
    
  };

  // View details in drawer
  const handleViewDetails = (booking: StaffBooking) => {
    setSelectedBooking(booking);
    setIsDrawerOpen(true);
  };

  // Check-in: ném lỗi khi máy chủ từ chối để panel chi tiết hiển thị; bảng thì hiện toast.
  const checkIn = async (target: StaffBooking) => {
    const bookingIdNum = Number(target.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      const res = await updateBookingStatus(bookingIdNum, {
        newStatus: 'CheckedIn',
        note: `Check-in thành công bởi ${session?.fullName || 'nhân viên khách sạn'} lúc ${new Date().toLocaleTimeString('vi-VN')}`,
      });
      if (!res.success) throw new Error(`Không check-in được: ${res.message || 'máy chủ từ chối cập nhật.'}`);
    }

    const checkedInAt = `Đã nhận phòng lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const apply = (b: StaffBooking): StaffBooking => ({ ...b, status: 'checked_in', statusLabel: 'Đang lưu trú', checkInTime: checkedInAt });
    setBookings((prev) => prev.map((b) => (b.id === target.id ? apply(b) : b)));
    setSelectedBooking((prev) => (prev && prev.id === target.id ? apply(prev) : prev));

    setMetrics((prev) => ({
      ...prev,
      checkInCompletedCount: prev.checkInCompletedCount + 1,
      checkInRemainingCount: Math.max(0, prev.checkInRemainingCount - 1),
    }));

    showToast(`Check-in thành công cho khách ${target.customerName} (Phòng ${target.roomNumber}).`);
  };
  const handleCheckIn = (target: StaffBooking) => {
    checkIn(target).catch((e) => showToast(e instanceof Error ? e.message : 'Không check-in được.'));
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

  // Hủy đơn: trạng thái thanh toán sau khi hủy (chờ hoàn / không cần hoàn) do máy chủ quyết định,
  // nên tải lại dữ liệu thay vì tự gán "Đã hoàn cọc" như trước.
  const handleCancelBooking = async (target: StaffBooking) => {
    const bookingIdNum = Number(target.id);
    if (!isNaN(bookingIdNum) && bookingIdNum > 0) {
      const res = await cancelBooking(bookingIdNum, 'Hủy đơn theo yêu cầu của khách tại quầy Lễ tân');
      if (!res.success) throw new Error(`Không hủy được đơn: ${res.message || 'máy chủ từ chối.'}`);
    }
    await fetchBookings();
    showToast(`Đã hủy đơn ${target.bookingCode}.`);
  };

  // Giữ panel chi tiết đồng bộ với dữ liệu vừa tải lại.
  useEffect(() => {
    setSelectedBooking((prev) => (prev ? bookings.find((b) => b.id === prev.id) ?? prev : prev));
  }, [bookings]);

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

  const allowedTabs = STAFF_NAVIGATION.filter((item) => hasAnyPermission(item.permissions)).map((item) => item.id);
  const [selectedStaffTab, setStaffTab] = useState<StaffPortalTab>('reservations');
  // Tab bị thu hồi quyền (hoặc không được cấp) sẽ không render; tự chuyển sang tab đầu tiên còn quyền.
  const staffTab: StaffPortalTab | null = allowedTabs.includes(selectedStaffTab) ? selectedStaffTab : allowedTabs[0] ?? null;

  const handleSelectStaffTab = (tab: string) => {
    if (allowedTabs.includes(tab as StaffPortalTab)) setStaffTab(tab as StaffPortalTab);
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
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* PERSISTENT LEFT SIDEBAR */}
      <StaffSidebar
        currentTab={staffTab ?? undefined}
        onSelectTab={handleSelectStaffTab}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigateCustomerPortal={onNavigateCustomerPortal}
        assignedAreas={assignedAreas}
        activeAreaId={(selectedZone === 'all' ? assignedAreas[0] : assignedAreas.find(area => area.areaName === selectedZone))?.areaId}
        onSelectArea={(areaId) => {
          const areaObj = assignedAreas.find((a) => a.areaId === areaId);
          setSelectedZone('all');
          showToast(`Đã chuyển khu vực trực sang: ${areaObj ? `${areaObj.hotelName} · ${areaObj.areaName}` : 'Không xác định'}`);
        }}
      />

      {/* MAIN WRAPPER — cùng khung với Admin Portal: menu trái cố định từ màn hình lớn */}
      <div className="lg:pl-72">
        {/* INTEGRATED STAFF TOP BAR (HEADER) */}
        <StaffHeader
          assignedAreas={assignedAreas}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          onOpenMenu={() => setMobileMenuOpen(true)}
          onNavigateTab={(tab) => handleSelectStaffTab(tab)}
          onLogout={() => void handleLogout()}
          loggingOut={loggingOut}
          currentTab={staffTab ?? undefined}
        />

        {/* MAIN OPERATIONAL WORKSPACE */}
        <main className="flex min-h-screen w-full flex-col gap-6 px-4 pb-16 pt-20 md:px-8">
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div role="status" className="fixed top-20 right-4 md:right-8 z-[70] bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
              <span className="material-symbols-outlined text-primary-fixed text-[20px]">
                check_circle
              </span>
              <span className="font-label-md text-label-md font-medium">{toastMessage}</span>
            </div>
          )}

          {!staffTab && (
            <section className="mx-auto mt-16 flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest px-6 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container text-primary"><span className="material-symbols-outlined text-[28px]">lock_person</span></span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface">Tài khoản chưa được cấp quyền vận hành</h1>
              <p className="font-body-md text-body-md text-on-surface-variant">Vai trò hiện tại của bạn chưa có quyền sử dụng chức năng nào trong Staff Portal. Vui lòng liên hệ quản trị viên để được cấp quyền.</p>
            </section>
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

          {/* ĐÁNH GIÁ CỦA KHÁCH — chỉ khách sạn được phân công; chỉ hiển thị/ẩn, không xóa */}
          {staffTab === 'reviews' && (
            <section className="flex flex-col gap-5 pt-2">
              <div>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Đánh giá của khách</h1>
                <p className="font-body-md text-body-md text-on-surface-variant">Hiển thị hoặc ẩn đánh giá tại khách sạn bạn phụ trách. Khi ẩn cần ghi lý do; đánh giá không thể bị xóa.</p>
              </div>
              <ReviewModerationPanel
                hotels={Array.from(new Map(assignedAreas.map((a) => [a.hotelId, { hotelId: a.hotelId, hotelName: a.hotelName }])).values())}
                onToast={showToast}
              />
            </section>
          )}

          {/* 3. CUSTOMERS VIEW (Hồ sơ Khách hàng) */}
          {staffTab === 'customers' && (
            <StaffCustomersView onShowToast={showToast} />
          )}

          {/* 4. RESERVATIONS VIEW (Quản lý Đặt phòng) */}
          {staffTab === 'reservations' && (
            <>
              {/* Tiêu đề + thao tác */}
              <div className="flex flex-wrap items-end justify-between gap-4 pt-2">
                <div className="min-w-0">
                  <h1 className="font-headline-sm text-3xl font-semibold tracking-tight text-on-surface">Đặt phòng</h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">apartment</span>
                      {assignedAreas.length ? assignedAreas.map(area => `${area.hotelName} · ${area.areaName}`).join(', ') : 'Chưa được phân công khu vực'}
                    </span>
                    {lastSyncedAt && <span>· Cập nhật lúc {lastSyncedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button type="button" title="Tải lại" aria-label="Tải lại" disabled={loadingBookings} onClick={() => void fetchBookings()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container disabled:opacity-40">
                    <span className={`material-symbols-outlined ${loadingBookings ? 'animate-spin' : ''}`}>refresh</span>
                  </button>
                  <button type="button" onClick={handleExportExcel} disabled={!filteredBookings.length}
                    className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container disabled:opacity-40">
                    <span className="material-symbols-outlined text-[18px]">download</span>Xuất CSV
                  </button>
                </div>
              </div>

              <StaffMetrics metrics={metrics} loading={loadingBookings && !bookings.length} />

              {bookingError && (
                <p role="alert" className="flex items-center justify-between gap-3 rounded-2xl bg-error-container p-4 text-on-error-container">
                  {bookingError}
                  <button type="button" onClick={() => void fetchBookings()} className="font-semibold">Thử lại</button>
                </p>
              )}

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
                statusCounts={statusCounts}
              />

              <StaffBookingTable
                bookings={paginatedBookings}
                loading={loadingBookings && !bookings.length}
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

      </div>

      {/* SLIDE-OVER DETAIL DRAWER (SCREEN 2) */}
      <BookingDetailDrawer
        booking={selectedBooking}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCheckIn={checkIn}
        onCancelBooking={handleCancelBooking}
        onRefundBooking={handleRefundBooking}
        onConfirmPayment={handleConfirmPayment}
      />
    </div>
  );
};
export default StaffBookingsPage;
