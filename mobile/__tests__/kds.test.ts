const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-kds-token',
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

import { fetchActiveKdsOrders } from '../src/api/kitchen';
import { updatePosOrderStatusApi } from '../src/api/pos';

describe('Mobile Kitchen Display System Lifecycle & State Transitions', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('completes KDS progression: Pending -> Preparing -> Ready -> Delivered', async () => {
    // 1. Cook accepts Pending order and marks Preparing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: { id: 'ord_kds_1', status: 'Preparing' },
      }),
    });

    const step1 = await updatePosOrderStatusApi({ id: 'ord_kds_1', status: 'Preparing' });
    expect(step1.status).toBe('Preparing');

    // 2. Cook finishes dish and marks Ready for Pass Pickup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: { id: 'ord_kds_1', status: 'Ready' },
      }),
    });

    const step2 = await updatePosOrderStatusApi({ id: 'ord_kds_1', status: 'Ready' });
    expect(step2.status).toBe('Ready');

    // 3. Waiter serves and marks Delivered
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: { id: 'ord_kds_1', status: 'Delivered' },
      }),
    });

    const step3 = await updatePosOrderStatusApi({ id: 'ord_kds_1', status: 'Delivered' });
    expect(step3.status).toBe('Delivered');
  });

  it('handles network disconnect gracefully during KDS polling', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network disconnected'));

    await expect(fetchActiveKdsOrders()).rejects.toThrow('Network disconnected');
  });
});
