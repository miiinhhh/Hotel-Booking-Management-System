import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

let source = await readFile(new URL('../src/services/roomApi.ts', import.meta.url), 'utf8');
source = source.replace("import { ApiError, getStoredAccessToken } from './authApi';", "class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } } const getStoredAccessToken = () => 'test-jwt';");
source = source.replace('import.meta.env.VITE_API_URL', "'http://api.test'");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { roomApi } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('availability sends selected Hotel and stay dates', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'http://api.test/api/hotels/7/rooms/availability?checkIn=2026-11-01&checkOut=2026-11-03');
      assert.equal(init.method, 'GET');
      return Response.json({ checkIn: '2026-11-01', checkOut: '2026-11-03', rooms: [{ roomId: 1001 }] });
    };
    assert.equal((await roomApi.availability(7, '2026-11-01', '2026-11-03')).rooms[0].roomId, 1001);
  } finally { globalThis.fetch = original; }
});
test('lock sends real RoomIds and JWT; release uses PATCH', async () => {
  const original = globalThis.fetch;
  const input = { roomIds: [1001, 5027], startsAt: '2026-11-01T00:00:00Z', endsAt: '2026-11-03T00:00:00Z', reason: 'Repair' };
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(init.headers.Authorization, 'Bearer test-jwt');
      if (init.method === 'POST') { assert.equal(url, 'http://api.test/api/hotels/7/rooms/emergency-locks'); assert.deepEqual(JSON.parse(init.body), input); return Response.json([{ lockId: 9 }], { status: 201 }); }
      assert.equal(init.method, 'PATCH'); assert.equal(url, 'http://api.test/api/hotels/7/rooms/emergency-locks/9/release'); return Response.json({ lockId: 9, status: 'Released' });
    };
    assert.equal((await roomApi.lock(7, input))[0].lockId, 9);
    assert.equal((await roomApi.release(7, 9)).status, 'Released');
  } finally { globalThis.fetch = original; }
});
test('conflicts are errors, not successful local updates', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ title: 'Room already booked' }, { status: 409 });
    await assert.rejects(roomApi.lock(7, { roomIds: [1001] }), error => error.status === 409 && error.message === 'Room already booked');
  } finally { globalThis.fetch = original; }
});
test('deactivate RoomType accepts empty 204 response', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => { assert.equal(init.method, 'DELETE'); assert.equal(url, 'http://api.test/api/hotels/7/room-types/8'); return new Response(null, { status: 204 }); };
    assert.equal(await roomApi.deleteType(7, 8), undefined);
  } finally { globalThis.fetch = original; }
});

test('admin area CRUD uses hotel-scoped endpoints and includes inactive areas', async () => {
  const original = globalThis.fetch;
  const input = { areaName: 'Ocean Wing', areaType: 'Building', parentAreaId: 2, description: null, locationDescription: 'Near beach', floorCount: 8, isActive: true };
  const calls = [];
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null, authorization: init.headers.Authorization });
      if (init.method === 'DELETE') return new Response(null, { status: 204 });
      if (init.method === 'GET') return Response.json([]);
      return Response.json({ areaId: 12, hotelId: 7, ...input }, { status: init.method === 'POST' ? 201 : 200 });
    };
    await roomApi.areas(7, true);
    await roomApi.createArea(7, input);
    await roomApi.updateArea(7, 12, input);
    await roomApi.deleteArea(7, 12);
    assert.deepEqual(calls.map(call => [call.method, call.url]), [
      ['GET', 'http://api.test/api/hotels/7/areas?includeInactive=true'],
      ['POST', 'http://api.test/api/hotels/7/areas'],
      ['PUT', 'http://api.test/api/hotels/7/areas/12'],
      ['DELETE', 'http://api.test/api/hotels/7/areas/12'],
    ]);
    assert.deepEqual(calls[1].body, input);
    assert.ok(calls.every(call => call.authorization === 'Bearer test-jwt'));
  } finally { globalThis.fetch = original; }
});
