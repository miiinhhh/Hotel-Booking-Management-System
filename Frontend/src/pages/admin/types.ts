export type AdminPage = 'overview' | 'inventory' | 'pricing' | 'vouchers' | 'staff';

export interface AdminNavigationItem {
  id: AdminPage;
  label: string;
  icon: string;
}

export interface RoomType {
  id: number;
  code: string;
  name: string;
  image: string;
  price: number;
  capacity: string;
  area: number;
  bed: string;
  status: 'active' | 'paused';
  amenities: string[];
}

export interface StaffMember {
  id: number;
  code: string;
  name: string;
  email: string;
  role: string;
  title: string;
  zones: string[];
  shift: string;
  active: boolean;
}

export interface Voucher {
  id: number;
  code: string;
  value: string;
  detail: string;
  scope: string;
  expires: string;
  used: number;
  limit: number;
  active: boolean;
}
