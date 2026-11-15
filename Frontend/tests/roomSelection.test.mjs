import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/roomSelection.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { resolveRoomSelection } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const card = { id: '11', roomId: 11, hotelId: 1, name: 'Old name', requestedGuests: 1,
  packages: [{ id: 'base', pricePerNight: 100 }], allInclusiveDetail: { pricePerNight: 100 } };
const latest = { roomId: 11, hotelId: 1, roomTypeName: 'Executive', roomNumber: '201', floor: 2, capacity: 3, price: 275 };

test('changed dates use current rate, capacity, room name and guest count without mutating the old card', () => {
  const result = resolveRoomSelection(card, latest, 1, '2026-11-20', '2026-11-22', 3);
  assert.equal(result.totalPrice, 550);
  assert.equal(result.room.checkIn, '2026-11-20');
  assert.equal(result.room.checkOut, '2026-11-22');
  assert.equal(result.room.name, 'Executive · Phòng 201');
  assert.equal(result.room.requestedGuests, 3);
  assert.equal(result.room.packages[0].pricePerNight, 275);
  assert.equal(result.room.allInclusiveDetail.pricePerNight, 275);
  assert.equal(card.packages[0].pricePerNight, 100);
});

test('unavailable room, wrong room/hotel, reduced capacity and invalid dates cannot reach checkout', () => {
  for (const item of [undefined, { ...latest, roomId: 12 }, { ...latest, hotelId: 2 }, { ...latest, capacity: 1 }])
    assert.throws(() => resolveRoomSelection(card, item, 1, '2026-11-20', '2026-11-22', 2));
  for (const [start, end] of [['bad', 'date'], ['2026-11-20', '2026-11-20'], ['2026-11-20', '2027-11-20']])
    assert.throws(() => resolveRoomSelection(card, latest, 1, start, end, 2));
});
