const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-inventory-security-token',
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

import { createStoreTransferApi, issueStoreTransferApi } from '../src/api/inventory';
import { ApiError } from '../src/api/client';

describe('Mobile Stores & Inventory Security & Conservation Invariants', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('rejects store transfer creation with 403 when role lacks STORE_MANAGE permission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Access Denied: Missing required permission [STORE_MANAGE]',
        code: 'FORBIDDEN',
        requiredPermission: 'STORE_MANAGE',
      }),
    });

    try {
      await createStoreTransferApi({
        transferNumber: 'TRF-001',
        sourceStoreId: 'str_1',
        destStoreId: 'str_2',
        itemName: 'Test Item',
        quantity: 10,
      });
      fail('Expected 403 ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
      expect(err.requiredPermission).toBe('STORE_MANAGE');
    }
  });

  it('blocks cross-tenant store transfer actions with 403 Forbidden', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Forbidden: Tenancy mismatch',
      }),
    });

    await expect(issueStoreTransferApi('trf_hotel_b_1')).rejects.toThrow('Forbidden: Tenancy mismatch');
  });
});
