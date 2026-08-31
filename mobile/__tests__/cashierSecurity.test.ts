const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-limited-bearer-token',
};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore[key] || null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockStore[key];
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { openCashierShiftApi, closeCashierShiftApi } from '../src/api/cashier';
import { ApiError } from '../src/api/client';

describe('Mobile Cashier Security & Tenancy Invariants', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('rejects opening cashier shift when user lacks CASHIER_MANAGE permission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Access Denied: Missing required permission [CASHIER_MANAGE]',
        code: 'FORBIDDEN',
        requiredPermission: 'CASHIER_MANAGE',
      }),
    });

    try {
      await openCashierShiftApi({ openingFloat: 1000 });
      fail('Expected 403 ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
      expect(err.requiredPermission).toBe('CASHIER_MANAGE');
    }
  });

  it('rejects closing an already closed shift with 500/422 message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Shift is not open or not found',
      }),
    });

    await expect(
      closeCashierShiftApi({
        shiftId: 'shf_already_closed',
        actualClosingCash: 1000,
      })
    ).rejects.toThrow('Shift is not open or not found');
  });

  it('blocks cross-tenant cashier queries with 403 Forbidden', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Forbidden: Tenancy mismatch',
      }),
    });

    await expect(openCashierShiftApi({ openingFloat: 1000 })).rejects.toThrow('Forbidden: Tenancy mismatch');
  });
});
