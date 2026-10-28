import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
let source = await readFile(new URL('../src/services/discoveryApi.ts', import.meta.url), 'utf8');
source = source.replace("import { ApiError, getStoredAccessToken } from './authApi';", "class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } } const getStoredAccessToken = () => 'jwt';");
source = source.replace('import.meta.env.VITE_API_URL', "'http://api.test'");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { discoveryApi, query, toHotel, toHotelDetail, mediaUrl } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('search sends dated region, capacity, filters and server pagination without mock fallback', async () => {
  const old = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      const params = new URL(url).searchParams;
      assert.equal(params.get('location'), 'Đà Nẵng'); assert.equal(params.get('checkIn'), '2026-11-01');
      assert.equal(params.get('rooms'), '2'); assert.equal(params.get('page'), '3'); assert.equal(params.get('minPrice'), '0');
      return Response.json({ items: [], totalCount: 0, totalPages: 0 });
    };
    assert.equal((await discoveryApi.search({ location: 'Đà Nẵng', checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 4, rooms: 2, page: 3, minPrice: 0 })).items.length, 0);
  } finally { globalThis.fetch = old; }
});
test('wishlist uses current-account route and confirmed PUT/DELETE with JWT', async () => {
  const old = globalThis.fetch;
  try {
    const methods = [];
    globalThis.fetch = async (url, init) => { assert.equal(url, 'http://api.test/api/me/wishlist/7'); assert.equal(init.headers.Authorization, 'Bearer jwt'); methods.push(init.method); return new Response(null, { status: 204 }); };
    await discoveryApi.save(7, true); await discoveryApi.save(7, false); assert.deepEqual(methods, ['PUT', 'DELETE']);
  } finally { globalThis.fetch = old; }
});
test('auth or database errors remain visible instead of becoming successful empty results', async () => {
  const old = globalThis.fetch;
  try { globalThis.fetch = async () => Response.json({ title: 'Forbidden' }, { status: 403 }); await assert.rejects(discoveryApi.report({ from: '2026-11-01', to: '2026-11-02' }), e => e.status === 403 && e.message === 'Forbidden'); }
  finally { globalThis.fetch = old; }
});
test('media, zero price and unknown ratings retain actual source meaning', () => {
  assert.equal(mediaUrl('/api/hotels/1/images/1/content'), 'http://api.test/api/hotels/1/images/1/content');
  const hotel = toHotel({ hotelId: 1, name: 'Test', address: 'A', city: 'Hue', imageUrl: null, pricePerNight: 0, availableRooms: 2, capacity: 2, roomTypeName: 'Standard' });
  assert.equal(hotel.pricePerNight, 0); assert.equal(hotel.starRating, 0); assert.equal(hotel.reviewCount, 0);
  assert.equal(query({ minPrice: 0, amenityId: undefined, location: '' }), 'minPrice=0');
});
test('detail maps real policies, amenities, image order and selected dates', () => {
  const selection = { adults: 2, children: 0, rooms: 1 };
  const result = toHotelDetail({ hotelId: 5, name: 'Hotel', address: 'A', city: 'Hue', checkIn: '2026-11-01', checkOut: '2026-11-03', policies: { checkInTime: '14:00', checkOutTime: '12:00', cancellationPolicy: null }, images: [{ url: '/secondary', isPrimary: false }, { url: '/primary', isPrimary: true }], amenities: [{ name: 'Pool', description: 'Outdoor' }], rooms: [] }, selection);
  assert.equal(result.galleryImages.hero.url, '/primary'); assert.equal(result.durationNights, 2);
  assert.equal(result.resortAmenities[0].title, 'Pool'); assert.match(result.cancelPolicySummary, /chưa công bố/); assert.equal(result.checkIn, '2026-11-01');
});
