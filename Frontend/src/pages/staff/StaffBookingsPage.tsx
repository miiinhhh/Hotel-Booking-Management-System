import React, { useState, useMemo, useEffect } from 'react';
import { StaffSidebar } from './components/StaffSidebar';
import { StaffHeader } from './components/StaffHeader';
import { StaffMetrics } from './components/StaffMetrics';
import { StaffFilterBar } from './components/StaffFilterBar';
import { StaffBookingTable } from './components/StaffBookingTable';
import { StaffPagination } from './components/StaffPagination';
import { BookingDetailDrawer } from './components/BookingDetailDrawer';
import { StaffCustomersView } from './components/StaffCustomersView';
import { StaffCalendarView } from './components/StaffCalendarView';
import { StaffSuitesView } from './components/StaffSuitesView';
import { MOCK_STAFF_BOOKINGS, MOCK_STAFF_METRICS } from './data/mockStaffBookings';
import { StaffBooking, StaffMetricsData, StaffPortalTab } from './types';
import { getMyAssignedAreas } from '../../services/staffAssignmentApi';

interface StaffBookingsPageProps {
  onNavigateCustomerPortal?: () => void;
}

export const StaffBookingsPage: React.FC<StaffBookingsPageProps> = ({
  onNavigateCustomerPortal,
}) => {
  const [bookings, setBookings] = useState<StaffBooking[]>(MOCK_STAFF_BOOKINGS);
  const [metrics, setMetrics] = useState<StaffMetricsData>(MOCK_STAFF_METRICS);
  const [assignedAreas, setAssignedAreas] = useState<Array<{
    areaId: number;
    areaName: string;
    areaType: string;
    totalRooms?: number;
  }>>([
    { areaId: 1, areaName: 'Zone A: Royal Pavilion', areaType: 'Zone', totalRooms: 48 },
    { areaId: 2, areaName: 'Zone B: Ocean Wing', areaType: 'Zone', totalRooms: 36 },
  ]);

  useEffect(() => {
    getMyAssignedAreas(2, 1).then((res) => {
      if (res.success && res.data && res.data.length > 0) {
        setAssignedAreas(
          res.data.map((a) => ({
            areaId: a.areaId,
            areaName: a.areaName,
            areaType: a.areaType,
            totalRooms: a.totalRooms,
          }))
        );
      }
    });
  }, []);

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
  const handleCheckIn = (target: StaffBooking) => {
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
  const handleConfirmDeposit = (target: StaffBooking) => {
    const depositVal = Math.round(target.totalAmount * 0.5);
    setBookings((prev) =>
      prev.map((b) =>
        b.id === target.id
          ? {
              ...b,
              status: 'confirmed_deposit',
              statusLabel: 'ĐÃ XÁC NHẬN CỌC',
              paidAmount: depositVal,
              remainingAmount: target.totalAmount - depositVal,
              depositStatus: 'deposited_50',
              depositStatusLabel: 'Đã cọc 50%',
              transactionCode: `TRANS-${Math.floor(100000 + Math.random() * 900000)}`,
            }
          : b
      )
    );

    setMetrics((prev) => ({
      ...prev,
      pendingDepositCount: Math.max(0, prev.pendingDepositCount - 1),
    }));

    showToast(`Đã xác nhận cọc thành công cho đơn ${target.bookingCode}.`);
  };

  // Cancel booking
  const handleCancelBooking = (target: StaffBooking) => {
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

  // Update notes
  const handleUpdateNotes = (
    bookingId: string,
    notes: string,
    approval: 'accepted' | 'rejected'
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              internalNotes: notes,
              approvalStatus: approval,
              lastUpdated: `${new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })} bởi Lễ tân trực`,
            }
          : b
      )
    );
  };

  // Walk-in direct reservation
  const handleDirectBooking = () => {
    const code = `#BK-${Math.floor(94830 + Math.random() * 100)}`;
    const newBooking: StaffBooking = {
      id: `staff-bk-${Date.now()}`,
      bookingCode: code,
      createdAt: 'Vừa xong · 24/10',
      customerName: 'Khách Vãng Lai Trực Tiếp',
      customerInitials: 'VL',
      customerPhone: '0909 000 111',
      customerEmail: 'walkin.guest@stayluxe.vn',
      customerCccd: '0482 0200 9988',
      vipLevel: 'Khách Nhận Tại Quầy',
      membershipTier: 'Hội viên Mới',
      zone: 'Tòa A',
      roomNumber: 'P.405',
      roomType: 'Deluxe Ocean View',
      roomDetails: 'Giường King · Hướng biển',
      checkInDate: '24/10/2025',
      checkOutDate: '25/10/2025',
      checkInTime: 'Nhận ngay',
      checkOutTime: 'trước 12:00',
      nightsCount: 1,
      nightsLabel: '1 đêm nghỉ',
      totalAmount: 4500000,
      paidAmount: 4500000,
      remainingAmount: 0,
      depositStatus: 'paid_100',
      depositStatusLabel: 'Đã trả 100%',
      status: 'checked_in',
      statusLabel: 'ĐÃ CHECK-IN',
      transactionCode: 'POS-DIRECT-01',
      specialRequests: '“Khách nhận phòng trực tiếp tại quầy lễ tân.”',
      receptionist: 'Nguyễn Mai Anh',
      internalNotes: 'Khách thanh toán trực tiếp qua quẹt thẻ POS tại quầy 02.',
      approvalStatus: 'accepted',
      lastUpdated: 'Vừa xong',
    };

    setBookings([newBooking, ...bookings]);
    showToast(`Đã thêm thành công đơn nhận trực tiếp ${code}!`);
  };

  const [staffTab, setStaffTab] = useState<StaffPortalTab>('reservations');

  const handleSelectStaffTab = (tab: string) => {
    setStaffTab(tab as StaffPortalTab);
    if (tab !== 'reservations') {
      showToast(
        `Chuyển sang phân hệ: ${
          tab === 'calendar'
            ? 'Lịch phòng & Khóa bán'
            : tab === 'suites'
            ? 'Suites & Phân khu'
            : 'Hồ sơ Khách hàng'
        }`
      );
    }
  };

  const handleExportExcel = () => {
    showToast('Đang xuất danh sách đơn đặt phòng ra tệp Excel...');
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex selection:bg-secondary-container selection:text-on-secondary-container">
      {/* PERSISTENT LEFT SIDEBAR */}
      <StaffSidebar
        currentTab={staffTab}
        onSelectTab={handleSelectStaffTab}
        onNavigateCustomerPortal={onNavigateCustomerPortal}
        assignedAreas={assignedAreas}
        activeAreaId={selectedZone === 'Tòa B' ? 2 : 1}
        onSelectArea={(areaId) => {
          const areaObj = assignedAreas.find((a) => a.areaId === areaId);
          const zoneName = areaId === 2 ? 'Tòa B' : 'Tòa A';
          setSelectedZone(zoneName);
          showToast(`Đã chuyển khu vực trực sang: ${areaObj ? areaObj.areaName : (areaId === 2 ? 'Zone B: Ocean Wing' : 'Zone A: Royal Pavilion')}`);
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
          selectedZone={selectedZone}
          onSelectZone={(zone) => {
            setSelectedZone(zone);
            setCurrentPage(1);
          }}
          onOpenNotifications={() => showToast('Bạn có 3 thông báo mới về ca trực lễ tân.')}
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
                    <span>Khu vực phụ trách: Tòa A &amp; Tòa B</span>
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
                  <button
                    type="button"
                    onClick={handleDirectBooking}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-container text-on-primary font-label-md text-label-md hover:bg-tertiary-container shadow-[0_4px_16px_rgba(194,65,12,0.22)] transition-all duration-200 font-semibold cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[19px]">add</span>
                    <span>+ Nhận khách vãng lai / Đặt trực tiếp</span>
                  </button>
                </div>
              </div>

              {/* OPERATIONAL METRICS & KPI HEADER */}
              <StaffMetrics metrics={metrics} />

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
              />

              {/* COMPREHENSIVE DATA TABLE */}
              <StaffBookingTable
                bookings={paginatedBookings}
                onViewDetails={handleViewDetails}
                onQuickCheckIn={handleCheckIn}
                onQuickConfirmDeposit={handleConfirmDeposit}
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
        onUpdateNotes={handleUpdateNotes}
      />
    </div>
  );
};
export default StaffBookingsPage;
