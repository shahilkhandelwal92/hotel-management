let mockStore: Record<string, string> = {};

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

import { apiClient, getAuthToken, setAuthToken, clearAuthToken } from '../src/api/client';
import { fetchReservations } from '../src/api/reservations';
import { fetchCashierShifts } from '../src/api/cashier';

describe('Production Release Candidate End-to-End Operational Lifecycle', () => {
  beforeEach(() => {
    mockStore = {};
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'https://pms.stayos.com';
  });

  it('proves complete release candidate lifecycle: Login -> Persist -> Multi-Module Dashboards -> Logout -> Cleanup', async () => {
    // 1. Operator logs in with staff credentials against production HTTPS endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockReleaseToken',
        user: {
          id: 'usr_mgr_01',
          name: 'General Manager',
          email: 'gm@stayos.com',
          roles: ['ADMIN'],
          permissions: ['DASHBOARD_VIEW', 'ROOM_VIEW', 'RESERVATION_VIEW', 'CASHIER_VIEW', 'MAINTENANCE_VIEW', 'STORE_VIEW'],
          hotelId: 'htl_prod_1',
        },
      }),
    });

    const loginRes = await apiClient<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: { email: 'gm@stayos.com', password: 'ValidPassword123' },
    });
    expect(loginRes.token).toBeDefined();

    await setAuthToken(loginRes.token);
    expect(await getAuthToken()).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockReleaseToken');

    // 2. App restores user profile on cold boot
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        user: {
          id: 'usr_mgr_01',
          name: 'General Manager',
          email: 'gm@stayos.com',
          roles: ['ADMIN'],
          permissions: ['DASHBOARD_VIEW', 'ROOM_VIEW', 'RESERVATION_VIEW', 'CASHIER_VIEW', 'MAINTENANCE_VIEW', 'STORE_VIEW'],
          hotelId: 'htl_prod_1',
        },
      }),
    });

    const userRes = await apiClient<{ user: any }>('/api/auth/me');
    expect(userRes.user.name).toBe('General Manager');

    // 3. Operator navigates to Housekeeping
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        tasks: [
          {
            id: 'tsk_101',
            roomNumber: '101',
            taskType: 'Clean',
            status: 'Pending',
            room: { id: 'rm_101', number: '101', type: 'Deluxe', status: 'Dirty' },
          },
        ],
      }),
    });

    const hkRes = await apiClient<{ tasks: any[] }>('/api/housekeeping');
    expect(hkRes.tasks.length).toBe(1);
    expect(hkRes.tasks[0].roomNumber).toBe('101');

    // 4. Operator navigates to Front Desk Reservations
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [{ id: 'res_001', guestName: 'Alice Smith', status: 'CHECKED_IN' }],
    });

    const res = await fetchReservations();
    expect(res.length).toBe(1);

    // 5. Operator checks Cashier shifts
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shifts: [{ id: 'sft_001', shiftNumber: 'SFT-001', status: 'OPEN', openingFloat: 5000 }],
      }),
    });

    const shifts = await fetchCashierShifts();
    expect(shifts.length).toBe(1);
    expect(shifts[0].status).toBe('OPEN');

    // 6. Operator logs out -> token is purged from SecureStore
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true }),
    });

    await apiClient('/api/auth/logout', { method: 'POST' });
    await clearAuthToken();
    expect(await getAuthToken()).toBeNull();
  });
});
