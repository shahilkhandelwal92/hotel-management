const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-unauthorized-bearer-token',
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

import { createWorkOrderApi, completeWorkOrderApi } from '../src/api/maintenance';
import { ApiError } from '../src/api/client';

describe('Mobile Engineering & Maintenance Security & Tenancy Invariants', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('rejects work order creation with 403 when role lacks MAINTENANCE_MANAGE permission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Access Denied: Missing required permission [MAINTENANCE_MANAGE]',
        code: 'FORBIDDEN',
        requiredPermission: 'MAINTENANCE_MANAGE',
      }),
    });

    try {
      await createWorkOrderApi({
        title: 'Unauthorized repair',
        description: 'Test',
      });
      fail('Expected 403 ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
      expect(err.requiredPermission).toBe('MAINTENANCE_MANAGE');
    }
  });

  it('blocks cross-tenant work order mutations with 403 Forbidden', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Forbidden: Tenancy mismatch',
      }),
    });

    await expect(
      completeWorkOrderApi({
        workOrderId: 'wo_hotel_b_1',
      })
    ).rejects.toThrow('Forbidden: Tenancy mismatch');
  });
});
