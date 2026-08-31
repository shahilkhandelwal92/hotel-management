const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-pos-security-token',
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

import { createPosOrderApi } from '../src/api/pos';
import { ApiError } from '../src/api/client';

describe('Mobile Restaurant POS Security & Inventory Conservation Invariants', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('rejects room charge when reservation is not CheckedIn with 422', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Room charge is only available for active checked-in reservations',
      }),
    });

    try {
      await createPosOrderApi({
        orderSource: 'RoomService',
        reservationId: 'res_checked_out',
        items: [{ menuItemId: 'm_1', quantity: 1 }],
      });
      fail('Expected 422 ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(422);
      expect(err.message).toContain('active checked-in reservations');
    }
  });

  it('rejects order with 409 when kitchen stock is depleted for a recipe ingredient', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Insufficient stock for ingredient "Paneer Block" (required for Paneer Butter Masala). Available: 0 kg, Required: 2 kg.',
      }),
    });

    try {
      await createPosOrderApi({
        tableNumber: '1',
        orderSource: 'DineIn',
        items: [{ menuItemId: 'm_paneer', quantity: 4 }],
      });
      fail('Expected 409 ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
      expect(err.message).toContain('Insufficient stock for ingredient');
    }
  });

  it('rejects order when user has unauthorized role with 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Restaurant access required',
      }),
    });

    await expect(
      createPosOrderApi({
        tableNumber: '1',
        orderSource: 'DineIn',
        items: [{ menuItemId: 'm_1', quantity: 1 }],
      })
    ).rejects.toThrow('Restaurant access required');
  });
});
