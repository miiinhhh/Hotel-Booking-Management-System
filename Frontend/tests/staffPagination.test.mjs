import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/services/staffPagination.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { loadAllStaff } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('loads all pages using actual server page size, including Staff beyond first 20', async () => {
  const records = Array.from({ length: 205 }, (_, id) => ({ userId: id + 1, isActive: id % 2 === 0 }));
  const requested = [];
  const result = await loadAllStaff(async page => {
    requested.push(page);
    return { items: records.slice((page - 1) * 20, page * 20), page, pageSize: 20, total: records.length };
  });
  assert.deepEqual(requested, Array.from({ length: 11 }, (_, i) => i + 1));
  assert.deepEqual(result, records);
  assert.equal(result.filter(r => r.isActive).length, 103);
});

test('empty list stops after one request', async () => {
  let calls = 0;
  assert.deepEqual(await loadAllStaff(async page => {
    calls++; return { page, pageSize: 100, total: 0, items: [] };
  }), []);
  assert.equal(calls, 1);
});

test('later-page failure does not return a partial list as complete', async () => {
  await assert.rejects(loadAllStaff(async page => {
    if (page === 2) throw new Error('Network failed');
    return { page, pageSize: 1, total: 2, items: [{ userId: 1 }] };
  }), /Network failed/);
});

test('repeated server pages fail instead of showing incorrect totals', async () => {
  await assert.rejects(loadAllStaff(async page => ({ page, pageSize: 1, total: 3, items: [{ userId: 1 }] })));
});

test('incomplete final page fails instead of presenting truncated data', async () => {
  await assert.rejects(loadAllStaff(async page => ({ page, pageSize: 20, total: 20, items: [{ userId: 1 }] })));
});
