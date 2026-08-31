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

// Mock global fetch for auth tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  apiClient,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
} from '../src/api/client';

describe('Mobile Auth & Secure Storage Subsystem', () => {
  beforeEach(() => {
    mockStore = {};
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('securely stores and retrieves authentication token in SecureStore', async () => {
    await setAuthToken('mock-mobile-jwt-token-12345');
    const token = await getAuthToken();
    expect(token).toBe('mock-mobile-jwt-token-12345');
  });

  it('deletes token on logout / clearAuthToken', async () => {
    await setAuthToken('token-to-delete');
    await clearAuthToken();
    const token = await getAuthToken();
    expect(token).toBeNull();
  });

  it('successfully logs in and receives token payload', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        user: {
          id: 'usr_housekeeper_1',
          email: 'housekeeper@hotel.com',
          name: 'Housekeeper Sunita',
          roles: ['HOUSEKEEPING'],
          hotelId: 'htl_grand_palace',
        },
        token: 'signed-mobile-token-abc',
      }),
    });

    const response = await apiClient('/api/auth/login', {
      method: 'POST',
      body: { email: 'housekeeper@hotel.com', password: 'Password123!' },
    });

    expect(response.success).toBe(true);
    expect(response.token).toBe('signed-mobile-token-abc');
    expect(response.user.roles).toContain('HOUSEKEEPING');
  });

  it('rejects invalid credentials with 401 ApiError', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Invalid email or password',
      }),
    });

    await expect(
      apiClient('/api/auth/login', {
        method: 'POST',
        body: { email: 'wrong@hotel.com', password: 'BadPassword' },
      })
    ).rejects.toThrow('Invalid email or password');
  });
});
