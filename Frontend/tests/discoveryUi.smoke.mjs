import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Run against Vite. Every API call is intercepted: no application database is touched.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DISCOVERY_UI_URL || 'http://127.0.0.1:5177';
const output = await mkdtemp(join(tmpdir(), 'hotel-discovery-ui-'));
const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) });
const pageErrors = [];
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const hotels = Array.from({ length: 13 }, (_, i) => ({ hotelId: i + 1, name: `Hotel Hue ${i + 1}`, city: 'Hue', address: 'Dia chi', imageUrl: null, roomTypeName: 'Deluxe', pricePerNight: (i + 1) * 100, capacity: 2, availableRooms: 2 }));

async function setup(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const state = { saved: [], writes: 0, queries: [], reports: [], failSave: false, failWishlist: false, failReport: false, imageReads: 0 };
  if (role) await context.addInitScript(role => {
    localStorage.setItem('stayluxe.auth', JSON.stringify({ userId: role === 'Admin' ? 1 : 3, fullName: 'UI test', email: 'ui@example.com', roles: [role], permissions: role === 'Admin' ? ['reports.view', 'policies.manage', 'content.manage'] : ['wishlist.self.manage'], accessToken: 'fixture-token', expiresAt: new Date(Date.now() + 3600000).toISOString(), refreshToken: 'fixture-refresh', refreshExpiresAt: new Date(Date.now() + 86400000).toISOString(), tokenType: 'Bearer' }));
  }, role);
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()); const path = url.pathname; const q = url.searchParams;
    const json = body => route.fulfill({ json: body });
    const fail = detail => route.fulfill({ status: 503, json: { detail } });
    if (path === '/api/me') return json({ userId: role === 'Admin' ? 1 : 3, fullName: 'UI test', email: 'ui@example.com', roles: [role], isActive: true });
    if (path === '/api/me/wishlist') return state.failWishlist ? fail('Không tải được yêu thích thử nghiệm') : json(state.saved);
    if (path.startsWith('/api/me/wishlist/')) {
      if (state.failSave) return fail('Không lưu được yêu thích thử nghiệm');
      state.writes++;
      const id = Number(path.split('/').at(-1));
      state.saved = route.request().method() === 'PUT' ? [...state.saved.filter(h => h.hotelId !== id), hotels.find(h => h.hotelId === id)] : state.saved.filter(h => h.hotelId !== id);
      return route.fulfill({ status: 204 });
    }
    if (path === '/api/amenities' || path.endsWith('/amenities')) return json([{ amenityId: 1, name: 'Pool', description: 'Ho boi', isActive: true }]);
    if (path.endsWith('/images')) { state.imageReads++; return json([]); }
    if (path === '/api/discovery/hotels') {
      state.queries.push(Object.fromEntries(q));
      if (q.get('location') === 'Loi') return fail('Lỗi tìm kiếm thử nghiệm');
      let items = q.get('location') === 'Het phong' ? [] : [...hotels];
      if (q.get('minPrice')) items = items.filter(h => h.pricePerNight >= Number(q.get('minPrice')));
      if (q.get('maxPrice')) items = items.filter(h => h.pricePerNight <= Number(q.get('maxPrice')));
      if (q.get('sort') === 'price_desc') items.reverse();
      const page = Number(q.get('page') || 1), pageSize = Number(q.get('pageSize') || 12);
      return json({ items: items.slice((page - 1) * pageSize, page * pageSize), totalCount: items.length, totalPages: Math.ceil(items.length / pageSize), page, pageSize });
    }
    if (path.startsWith('/api/discovery/hotels/')) return json({ hotelId: 1, name: 'Hotel Hue 1', address: 'Dia chi', city: 'Hue', description: 'Giới thiệu từ dữ liệu khách sạn', policies: { checkInTime: '14:00', checkOutTime: '12:00', cancellationPolicy: 'Hủy theo chính sách công bố' }, images: [], amenities: [], rooms: [], checkIn: q.get('checkIn'), checkOut: q.get('checkOut') });
    if (path.endsWith('/rooms/availability')) return json({ rooms: [] });
    if (path.endsWith('/rating')) return json({ hotelId: 1, totalReviews: 2, averageRating: 4.5 });
    if (path === '/api/hotels') return json({ items: [{ hotelId: 1, hotelName: 'Hotel Hue 1' }, { hotelId: 2, hotelName: 'Hotel Hue 2' }], totalCount: 2 });
    if (/\/api\/hotels\/\d+\/rooms$/.test(path)) return json([]);
    if (/\/api\/hotels\/\d+$/.test(path)) return json({ hotelId: 1, hotelName: 'Hotel Hue 1', address: 'Dia chi' });
    if (path === '/api/admin/reports/overview') {
      state.reports.push(Object.fromEntries(q));
      if (state.failReport) return fail('Lỗi báo cáo thử nghiệm');
      return json({ from: q.get('from'), to: q.get('to'), hotelId: q.get('hotelId'), revenue: 80, bookingCount: 2, cancelledBookings: 1, cancellationRate: 50, occupancyRate: 50, occupiedRoomNights: 1, availableRoomNights: 2, days: [{ date: q.get('from'), revenue: 80, bookings: 2, occupiedRoomNights: 1, availableRoomNights: 2 }] });
    }
    if (path === '/api/admin/reports/export') return route.fulfill({ contentType: 'text/csv', body: 'Date,Revenue,Bookings,OccupiedRoomNights,AvailableRoomNights\r\n2026-11-01,80,2,1,2\r\n' });
    throw new Error(`Unexpected API request: ${route.request().method()} ${path}`);
  });
  const page = await context.newPage(); page.on('pageerror', error => pageErrors.push(error.message));
  return { context, page, state };
}

try {
  const guest = await setup(); const page = guest.page;
  await page.goto(base);
  await page.getByRole('heading', { name: 'Khách sạn còn phòng hôm nay' }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Dashboard fits mobile width');
  await page.screenshot({ path: join(output, 'dashboard-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Khu vực hoặc tên khách sạn').fill(' Hue ');
  await page.getByLabel('Người lớn', { exact: true }).fill('4');
  await page.getByLabel('Phòng', { exact: true }).fill('2');
  await page.getByRole('main').getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByRole('heading', { name: 'Tìm nơi lưu trú' }).waitFor();
  await page.getByText('13 khách sạn phù hợp', { exact: false }).waitFor();
  check(await page.getByLabel('Khu vực hoặc tên khách sạn').inputValue() === 'Hue', 'Dashboard preserves and trims location');
  check(guest.state.queries.at(-1).adults === '4' && guest.state.queries.at(-1).rooms === '2', 'Guest and room counts reach API');
  await page.getByRole('navigation', { name: 'Phân trang kết quả' }).getByRole('button', { name: '2', exact: true }).click();
  await page.getByRole('heading', { name: 'Hotel Hue 13', exact: true }).waitFor();
  check(guest.state.queries.at(-1).page === '2' && guest.state.queries.at(-1).location === 'Hue', 'Paging keeps location');
  await page.getByLabel('Giá tối đa', { exact: true }).fill('200');
  await page.getByRole('heading', { name: 'Hotel Hue 1', exact: true }).waitFor();
  check(guest.state.queries.at(-1).page === '1', 'Changing filters resets pagination');
  await page.getByLabel('Sắp xếp', { exact: true }).selectOption('price_desc');
  await page.waitForFunction(() => document.querySelector('article h3')?.textContent?.trim() === 'Hotel Hue 2');
  check(guest.state.queries.at(-1).sort === 'price_desc', 'Sort is applied by API');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Search fits mobile width');
  await page.screenshot({ path: join(output, 'search-mobile.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Lưu vào danh sách yêu thích' }).first().click();
  await page.getByText('Vui lòng đăng nhập để lưu khách sạn.', { exact: true }).waitFor();
  await page.getByLabel('Khu vực hoặc tên khách sạn').fill('Het phong');
  await page.getByRole('main').getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByRole('heading', { name: 'Không tìm thấy nơi nghỉ phù hợp' }).waitFor(); checks++;
  await page.getByLabel('Khu vực hoặc tên khách sạn').fill('Loi');
  await page.getByRole('main').getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Lỗi tìm kiếm thử nghiệm' }).waitFor(); checks++;
  await page.getByLabel('Khu vực hoặc tên khách sạn').fill('Hue');
  await page.getByRole('main').getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await page.getByRole('button', { name: /Xem phòng/ }).last().click();
  await page.getByText('Giới thiệu từ dữ liệu khách sạn', { exact: true }).waitFor();
  await page.getByText('Khách sạn chưa công bố tiện ích.', { exact: true }).waitFor(); checks++;
  await page.getByText('2 đánh giá thực tế', { exact: true }).waitFor(); checks++;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Hotel detail fits mobile width');
  await page.screenshot({ path: join(output, 'detail-mobile.png'), fullPage: true, animations: 'disabled' });
  await guest.context.close();

  const customer = await setup('Customer');
  await customer.page.goto(base);
  await customer.page.getByRole('main').getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await customer.page.getByRole('button', { name: 'Lưu vào danh sách yêu thích' }).first().click();
  await customer.page.getByRole('button', { name: 'Yêu thích (1)', exact: true }).waitFor();
  check(customer.state.writes === 1, 'Wishlist persists one confirmed save');
  await customer.page.reload();
  await customer.page.getByRole('main').getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  await customer.page.getByRole('button', { name: 'Yêu thích (1)', exact: true }).waitFor(); checks++;
  await customer.page.getByRole('button', { name: 'Yêu thích (1)', exact: true }).click();
  await customer.page.getByRole('button', { name: 'Bỏ lưu', exact: true }).click();
  await customer.page.getByRole('button', { name: 'Kết quả tìm kiếm', exact: true }).click();
  customer.state.failSave = true;
  await customer.page.getByRole('button', { name: 'Lưu vào danh sách yêu thích' }).first().click();
  await customer.page.getByRole('alert').filter({ hasText: 'Không lưu được yêu thích thử nghiệm' }).waitFor();
  check(customer.state.saved.length === 0, 'Failed write does not show a saved item');
  customer.state.failSave = false; customer.state.failWishlist = true;
  await customer.page.getByRole('button', { name: 'Tải lại yêu thích', exact: true }).click();
  await customer.page.getByRole('alert').filter({ hasText: 'Không tải được yêu thích thử nghiệm' }).waitFor(); checks++;
  customer.state.failWishlist = false;
  await customer.page.getByRole('button', { name: 'Tải lại yêu thích', exact: true }).click();
  await customer.page.getByRole('alert').waitFor({ state: 'hidden' });
  await customer.context.close();

  const admin = await setup('Admin');
  await admin.page.goto(base + '/admin');
  await admin.page.getByRole('heading', { name: 'Tổng quan kinh doanh', exact: true }).waitFor();
  await admin.page.getByLabel('Từ ngày', { exact: true }).fill('2026-11-01');
  await admin.page.getByLabel('Đến trước ngày', { exact: true }).fill('2026-12-01');
  await admin.page.getByLabel('Khách sạn', { exact: true }).selectOption('2');
  await admin.page.getByRole('button', { name: 'Xuất CSV', exact: true }).waitFor();
  await admin.page.waitForFunction(() => document.querySelector('caption')?.textContent === 'Chi tiết báo cáo');
  check(admin.state.reports.at(-1).hotelId === '2' && admin.state.reports.at(-1).from === '2026-11-01', 'Report filters reach API');
  await admin.page.getByRole('button', { name: 'Tháng', exact: true }).click();
  check(await admin.page.getByRole('button', { name: 'Tháng', exact: true }).getAttribute('aria-pressed') === 'true', 'Chart grouping works');
  const downloaded = admin.page.waitForEvent('download');
  await admin.page.getByRole('button', { name: 'Xuất CSV', exact: true }).click();
  const download = await downloaded;
  check((await readFile(await download.path(), 'utf8')).includes('2026-11-01,80,2,1,2'), 'CSV download contains source totals');
  await admin.page.setViewportSize({ width: 390, height: 844 });
  await admin.page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await admin.page.screenshot({ path: join(output, 'report-mobile.png'), fullPage: true, animations: 'disabled' });
  check(await admin.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Admin charts and table fit mobile width');
  admin.state.failReport = true;
  await admin.page.getByRole('button', { name: 'Tải lại', exact: true }).click();
  await admin.page.getByRole('alert').filter({ hasText: 'Lỗi báo cáo thử nghiệm' }).waitFor();
  check(await admin.page.getByRole('button', { name: 'Xuất CSV', exact: true }).isDisabled(), 'Report errors disable export and discard stale report');
  await admin.page.setViewportSize({ width: 390, height: 844 });
  check(await admin.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'Admin error view fits mobile width');
  await admin.page.screenshot({ path: join(output, 'admin-mobile.png'), fullPage: true, animations: 'disabled' });
  await admin.page.setViewportSize({ width: 1440, height: 1000 });
  await admin.page.getByRole('button', { name: /Tiện ích & Hình ảnh/ }).click();
  await admin.page.getByRole('heading', { name: 'Tiện ích & Hình ảnh', exact: true }).waitFor();
  await admin.page.getByText('Chưa có ảnh trong phạm vi này.', { exact: true }).waitFor();
  const reads = admin.state.imageReads;
  await admin.page.getByRole('button', { name: 'Làm mới', exact: true }).click();
  await admin.page.getByText('Đang tải thư viện ảnh…', { exact: true }).waitFor({ state: 'hidden' });
  check(admin.state.imageReads > reads, 'Content refresh reloads the image gallery');
  await admin.context.close();
  check(pageErrors.length === 0, `No browser runtime errors: ${pageErrors.join(', ')}`);
  console.log(`PASS: ${checks} browser checks. Screenshots: ${output}`);
} finally { await browser.close(); }
