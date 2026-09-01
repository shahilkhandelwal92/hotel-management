const mockStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore[key] || null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockStore[key];
  }),
}));

import { getBaseUrl, ApiError } from '../src/api/client';

describe('Production Release API Configuration & Hardening', () => {
  it('correctly resolves and sanitizes production HTTPS endpoint', () => {
    const baseUrl = getBaseUrl('https://pms.stayos.com///');
    expect(baseUrl).toBe('https://pms.stayos.com');
  });

  it('correctly resolves staging HTTPS endpoint', () => {
    const baseUrl = getBaseUrl('https://staging-pms.stayos.com/');
    expect(baseUrl).toBe('https://staging-pms.stayos.com');
  });

  it('throws CONFIG_ERROR in production mode when API URL is empty', () => {
    (global as any).__DEV__ = false;

    expect(() => getBaseUrl('')).toThrow(ApiError);
    try {
      getBaseUrl('');
    } catch (err: any) {
      expect(err.code).toBe('CONFIG_ERROR');
      expect(err.message).toContain('Production API URL is not configured');
    }
  });

  it('allows fallback to 10.0.2.2 in development mode only', () => {
    (global as any).__DEV__ = true;

    const baseUrl = getBaseUrl('');
    expect(baseUrl).toBe('http://10.0.2.2:3000');
  });
});
