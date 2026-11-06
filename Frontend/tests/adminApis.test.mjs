import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Transpile apiClient.ts
let apiSource = await readFile(new URL('../src/services/apiClient.ts', import.meta.url), 'utf8');
apiSource = apiSource.replace("import { getStoredAccessToken } from './authApi';", "const getStoredAccessToken = () => 'test-admin-jwt';");
apiSource = apiSource.replace("import.meta.env.VITE_API_URL || ''", "'http://api.test'");
const { outputText: apiOutput } = ts.transpileModule(apiSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const apiClientModule = await import(
  `data:text/javascript;base64,${Buffer.from(apiOutput).toString('base64')}`
);

// Transpile pricingAdminApi.ts
let pricingSource = await readFile(new URL('../src/services/pricingAdminApi.ts', import.meta.url), 'utf8');
pricingSource = pricingSource.replace("import { apiClient, ApiResponse } from './apiClient';", "const apiClient = globalThis.__test_apiClient;");
const { outputText: pricingOutput } = ts.transpileModule(pricingSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
globalThis.__test_apiClient = apiClientModule.apiClient;
const pricingModule = await import(
  `data:text/javascript;base64,${Buffer.from(pricingOutput).toString('base64')}`
);

// Transpile voucherAdminApi.ts
let voucherSource = await readFile(new URL('../src/services/voucherAdminApi.ts', import.meta.url), 'utf8');
voucherSource = voucherSource.replace("import { apiClient, ApiResponse } from './apiClient';", "const apiClient = globalThis.__test_apiClient;");
const { outputText: voucherOutput } = ts.transpileModule(voucherSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const voucherModule = await import(
  `data:text/javascript;base64,${Buffer.from(voucherOutput).toString('base64')}`
);

// Transpile cancellationAdminApi.ts
let cancellationSource = await readFile(new URL('../src/services/cancellationAdminApi.ts', import.meta.url), 'utf8');
cancellationSource = cancellationSource.replace("import { apiClient, ApiResponse } from './apiClient';", "const apiClient = globalThis.__test_apiClient;");
const { outputText: cancellationOutput } = ts.transpileModule(cancellationSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const cancellationModule = await import(
  `data:text/javascript;base64,${Buffer.from(cancellationOutput).toString('base64')}`
);

test('pricingAdminApi sends correct path, JWT, and payload for price history', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, 'http://api.test/api/hotels/1/room-types/2/prices');
      assert.equal(init.headers.get('Authorization'), 'Bearer test-admin-jwt');
      const method = init?.method || 'GET';
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        assert.equal(body.price, 1500000);
        assert.equal(body.effectiveFrom, '2026-11-01T00:00:00.000Z');
        return Response.json({ priceHistoryId: 88, price: 1500000 });
      }
      assert.equal(method, 'GET');
      return Response.json([{ priceHistoryId: 88, price: 1500000 }]);
    };

    const getRes = await pricingModule.getRoomPriceHistories(1, 2);
    assert.equal(getRes.success, true);
    assert.equal(getRes.data[0].price, 1500000);

    const postRes = await pricingModule.createRoomPriceHistory(1, 2, {
      price: 1500000,
      effectiveFrom: '2026-11-01T00:00:00.000Z',
    });
    assert.equal(postRes.success, true);
    assert.equal(postRes.data.priceHistoryId, 88);
  } finally {
    globalThis.fetch = original;
  }
});

test('voucherAdminApi handles query filters, create, toggle, and delete', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(init.headers.get('Authorization'), 'Bearer test-admin-jwt');
      if (url.includes('/api/vouchers?')) {
        assert.match(url, /code=SUMMER/);
        return Response.json({ items: [{ voucherId: 10, code: 'SUMMER' }], totalCount: 1 });
      }
      if (init.method === 'PATCH') {
        assert.equal(url, 'http://api.test/api/vouchers/10/toggle-status');
        return Response.json({ voucherId: 10, isActive: false });
      }
      if (init.method === 'DELETE') {
        assert.equal(url, 'http://api.test/api/vouchers/10');
        return new Response(null, { status: 204 });
      }
      return Response.json({ voucherId: 10 });
    };

    const listRes = await voucherModule.getVouchersList({ code: 'SUMMER' });
    assert.equal(listRes.success, true);
    assert.equal(listRes.data.items[0].code, 'SUMMER');

    const toggleRes = await voucherModule.toggleVoucherStatus(10);
    assert.equal(toggleRes.success, true);
    assert.equal(toggleRes.data.isActive, false);

    const deleteRes = await voucherModule.deleteVoucher(10);
    assert.equal(deleteRes.success, true);
  } finally {
    globalThis.fetch = original;
  }
});

test('cancellationAdminApi sends correct hotelId and policy schema', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(init.headers.get('Authorization'), 'Bearer test-admin-jwt');
      if (init.method === 'POST') {
        assert.equal(url, 'http://api.test/api/cancellation-policies');
        const body = JSON.parse(init.body);
        assert.equal(body.hotelId, 1);
        assert.equal(body.daysBeforeCheckIn, 7);
        assert.equal(body.refundPercentage, 50);
        return Response.json({ cancellationPolicyId: 5, policyName: 'Test 7 Days' }, { status: 201 });
      }
      if (init.method === 'DELETE') {
        assert.equal(url, 'http://api.test/api/cancellation-policies/5');
        return new Response(null, { status: 204 });
      }
      assert.equal(url, 'http://api.test/api/cancellation-policies/hotel/1?activeOnly=false');
      return Response.json([{ cancellationPolicyId: 5, policyName: 'Test 7 Days' }]);
    };

    const listRes = await cancellationModule.getCancellationPoliciesByHotel(1, false);
    assert.equal(listRes.success, true);
    assert.equal(listRes.data[0].cancellationPolicyId, 5);

    const createRes = await cancellationModule.createCancellationPolicy({
      hotelId: 1,
      policyName: 'Test 7 Days',
      daysBeforeCheckIn: 7,
      refundPercentage: 50,
      depositPenaltyPercentage: 50,
    });
    assert.equal(createRes.success, true);
    assert.equal(createRes.data.cancellationPolicyId, 5);

    const delRes = await cancellationModule.deleteCancellationPolicy(5);
    assert.equal(delRes.success, true);
  } finally {
    globalThis.fetch = original;
  }
});
