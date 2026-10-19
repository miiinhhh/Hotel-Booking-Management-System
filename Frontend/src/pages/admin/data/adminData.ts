import { AdminNavigationItem, RoomType, StaffMember, Voucher } from '../types';

export const ADMIN_NAVIGATION: AdminNavigationItem[] = [
  { id: 'overview', label: 'Tổng quan kinh doanh', icon: 'query_stats' },
  { id: 'inventory', label: 'Phân khu & Hạng phòng', icon: 'apartment' },
  { id: 'pricing', label: 'Giá phòng', icon: 'price_change' },
  { id: 'vouchers', label: 'Voucher & Hủy hoàn', icon: 'confirmation_number' },
  { id: 'staff', label: 'Nhân viên & Phân công', icon: 'badge' },
];

export const ZONES = [
  { id: 'a', name: 'Tòa A - Sunrise Sanctuary', rooms: 62, occupied: 48, status: 'Đang vận hành' },
  { id: 'b', name: 'Tòa B - Ocean View Wing', rooms: 80, occupied: 57, status: 'Đang vận hành' },
  { id: 'villa', name: 'Khu Villa Ven Biển', rooms: 18, occupied: 15, status: 'Đang vận hành' },
  { id: 'c', name: 'Tòa C - Oasis Residence', rooms: 45, occupied: 8, status: 'Bảo trì một phần' },
];

export const ROOM_TYPES: RoomType[] = [
  { id: 1, code: 'SUITE-A1', name: 'Premier Ocean Suite', image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80', price: 4850000, capacity: '2 lớn, 1 nhỏ', area: 95, bed: '1 King lớn', status: 'active', amenities: ['Ban công hoàng hôn', 'Bồn tắm ngoài trời', 'Butler riêng'] },
  { id: 2, code: 'VILLA-BF', name: 'Beachfront Pool Villa', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80', price: 8900000, capacity: '4 lớn, 2 nhỏ', area: 180, bed: '2 King lớn', status: 'active', amenities: ['Hồ bơi riêng', 'Sát biển', 'Đưa đón sân bay'] },
  { id: 3, code: 'PRES-A2', name: 'Presidential Sea Suite', image: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1000&q=80', price: 12500000, capacity: '4 lớn', area: 220, bed: '2 King lớn', status: 'active', amenities: ['Phòng khách riêng', 'Bếp riêng', 'Quầy bar'] },
  { id: 4, code: 'DLX-A3', name: 'Deluxe Garden & Ocean View', image: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80', price: 3200000, capacity: '2 lớn', area: 62, bed: '1 King / 2 Twin', status: 'active', amenities: ['View vườn', 'Minibar', 'Bữa sáng'] },
];

export const STAFF_MEMBERS: StaffMember[] = [
  { id: 1, code: '#NV-1042', name: 'Nguyễn Mai Anh', email: 'nguyen.maianh@stayluxe.vn', role: 'Hotel Manager', title: 'Trưởng nhóm Lễ tân', zones: ['Tòa A - Sunrise', 'Tòa B - Ocean Wing'], shift: 'Ca sáng · 08:00 - 16:00', active: true },
  { id: 2, code: '#NV-1068', name: 'Trần Gia Bảo', email: 'bao.tran@stayluxe.vn', role: 'Hotel Staff', title: 'Lễ tân VIP', zones: ['Khu Villa Ven Biển'], shift: 'Ca chiều · 14:00 - 22:00', active: true },
  { id: 3, code: '#NV-1086', name: 'Lê Thu Hà', email: 'ha.le@stayluxe.vn', role: 'Hotel Staff', title: 'Chăm sóc khách hàng', zones: ['Tòa C - Oasis'], shift: 'Ca sáng · 08:00 - 16:00', active: true },
  { id: 4, code: '#NV-1104', name: 'Hoàng Đức Nam', email: 'nam.hoang@stayluxe.vn', role: 'Hotel Staff', title: 'Điều phối Buồng phòng', zones: ['Tòa A - Sunrise'], shift: 'Ca chiều · 14:00 - 22:00', active: true },
  { id: 5, code: '#NV-1120', name: 'Vũ Thị Bích Ngọc', email: 'ngoc.vu@stayluxe.vn', role: 'Hotel Staff', title: 'Lễ tân Ca đêm', zones: ['Tòa A - Sunrise', 'Tòa B - Ocean Wing'], shift: 'Nghỉ ca · Giao ban 06:00', active: true },
  { id: 6, code: '#NV-1018', name: 'Đỗ Quốc Huy', email: 'huy.do@stayluxe.vn', role: 'Hotel Staff', title: 'Kỹ thuật viên Khu vực', zones: ['Tòa C - Oasis'], shift: 'Tạm dừng tiếp nhận', active: false },
];

export const VOUCHERS: Voucher[] = [
  { id: 1, code: 'SUMMER2026', value: 'Giảm 20%', detail: 'Tối đa 1.500.000 ₫ mỗi giao dịch', scope: 'Villa & Suite · Đơn từ 5.000.000 ₫', expires: '31/08/2026', used: 68, limit: 100, active: true },
  { id: 2, code: 'LUXEWELCOME', value: 'Giảm 500.000 ₫', detail: 'Trừ trực tiếp vào hóa đơn phòng', scope: 'Đặt phòng lần đầu · Toàn bộ phân khu', expires: 'Vô thời hạn', used: 142, limit: 200, active: true },
  { id: 3, code: 'EARLYBIRD30', value: 'Giảm 15%', detail: 'Đặt trước ít nhất 30 ngày', scope: 'Mọi hạng phòng đang mở bán', expires: '31/12/2026', used: 44, limit: 150, active: true },
  { id: 4, code: 'STAY4PAY3', value: 'Ở 4 trả 3', detail: 'Miễn phí đêm có giá thấp nhất', scope: 'Suite · Lưu trú tối thiểu 4 đêm', expires: '30/09/2026', used: 21, limit: 60, active: true },
  { id: 5, code: 'HONEYMOON', value: 'Giảm 10% + quà', detail: 'Trang trí phòng và sparkling wine', scope: 'Villa · Xác minh kỳ nghỉ trăng mật', expires: '31/12/2026', used: 33, limit: 100, active: true },
  { id: 6, code: 'FLASHVIP10', value: 'Giảm 10%', detail: 'Chương trình khách VIP giới hạn', scope: 'Toàn khu · Thành viên Elite', expires: 'Đã hết ngân sách', used: 50, limit: 50, active: false },
];

export const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
