import { discoveryRequest } from './discoveryApi';

export interface AdminNotificationDto {
  id: string;
  type: string;
  /** 'action' = cần xử lý, 'info' = để ý */
  severity: 'action' | 'info';
  title: string;
  description: string;
  icon: string;
  occurredAt: string;
  /** Trang Admin cần mở khi bấm vào (vd. 'reviews', 'vouchers'); null nếu chưa có màn hình xử lý. */
  link: string | null;
  isRead: boolean;
}

export const notificationApi = {
  admin: () => discoveryRequest<{ success: boolean; data: AdminNotificationDto[] }>('/api/admin/notifications').then(r => r.data),
  /** Lưu trạng thái đã đọc ở server (đồng bộ giữa các thiết bị, dùng chung Admin/Staff). */
  markRead: (keys: string[]) => keys.length
    ? discoveryRequest<unknown>('/api/notifications/read', { method: 'POST', body: JSON.stringify({ keys: keys.slice(0, 200) }) })
    : Promise.resolve(),
};
