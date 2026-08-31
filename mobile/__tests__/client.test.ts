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

import {
  apiClient,
  setAuthToken,
  registerUnauthorizedCallback,
  ApiError,
} from '../src/api/client';

describe('Mobile API Client & Error Normalization Engine', () => {
  beforeEach(() => {
    mockStore = {};
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('automatically attaches Authorization: Bearer header when token exists', async () => {
    await setAuthToken('valid-jwt-token-999');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ tasks: [] }),
    });

    await apiClient('/api/housekeeping');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe('http://10.0.2.2:3000/api/housekeeping');
    expect(calledOptions.headers['Authorization']).toBe('Bearer valid-jwt-token-999');
  });

  it('handles 401 Unauthorized by clearing token and triggering logout callback', async () => {
    await setAuthToken('expired-token-111');
    const unauthorizedSpy = jest.fn();
    registerUnauthorizedCallback(unauthorizedSpy);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Authentication required', code: 'UNAUTHENTICATED' }),
    });

    await expect(apiClient('/api/housekeeping')).rejects.toThrow('Authentication required');
    expect(unauthorizedSpy).toHaveBeenCalledTimes(1);
    expect(mockStore['stayos_auth_token']).toBeUndefined();
  });

  it('normalizes 403 Forbidden permission errors with error code and status', async () => {
    await setAuthToken('token-no-perms');

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Access Denied: Missing required permission [HOUSEKEEPING_MANAGE]',
        code: 'FORBIDDEN',
        requiredPermission: 'HOUSEKEEPING_MANAGE',
      }),
    });

    try {
      await apiClient('/api/housekeeping', { method: 'POST', body: { roomNumber: '101' } });
      fail('Expected ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.requiredPermission).toBe('HOUSEKEEPING_MANAGE');
    }
  });

  it('normalizes 409 Conflict concurrency errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Room is already booked on: 2026-09-01',
        conflictDates: ['2026-09-01'],
      }),
    });

    try {
      await apiClient('/api/reservations', { method: 'POST', body: {} });
      fail('Expected 409 ApiError to be thrown');
    } catch (err: any) {
      expect(err.status).toBe(409);
      expect(err.message).toContain('Room is already booked');
    }
  });

  it('normalizes network disconnect failures to offline ApiError', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

    try {
      await apiClient('/api/housekeeping');
      fail('Expected Network ApiError');
    } catch (err: any) {
      expect(err.status).toBe(0);
      expect(err.code).toBe('NETWORK_ERROR');
      expect(err.message).toBe('Network request failed');
    }
  });
});
