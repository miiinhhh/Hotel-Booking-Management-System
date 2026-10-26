import type { StaffAccount, StaffPage } from './authApi';

// Fetch every server page before computing global counts or client-side filters.
// Use the returned pageSize because the server may cap the requested size.
export async function loadAllStaff(fetchPage: (page: number) => Promise<StaffPage>): Promise<StaffAccount[]> {
  const accounts = new Map<number, StaffAccount>();
  for (let page = 1; ; page++) {
    const result = await fetchPage(page);
    if (result.page !== page || result.pageSize <= 0 || !Number.isFinite(result.total) || result.total < 0)
      throw new Error('Phản hồi phân trang nhân viên không hợp lệ.');
    const before = accounts.size;
    result.items.forEach((item) => accounts.set(item.userId, item));
    if (page * result.pageSize >= result.total) {
      if (accounts.size < result.total) throw new Error('Danh sách nhân viên đã thay đổi. Vui lòng làm mới.');
      return [...accounts.values()];
    }
    if (accounts.size === before) throw new Error('Không tải đủ danh sách nhân viên. Vui lòng làm mới.');
  }
}
