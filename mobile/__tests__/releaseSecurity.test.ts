import * as fs from 'fs';
import * as path from 'path';

const mockStore: Record<string, string> = {
  stayos_auth_token: 'active-valid-jwt-token',
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

import { apiClient, getAuthToken } from '../src/api/client';

describe('Production Release Security & Sensitive Secrets Audit', () => {
  const mobileSrcDir = path.resolve(__dirname, '../src');
  const mobileAppDir = path.resolve(__dirname, '../app');

  function getAllTsFiles(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        getAllTsFiles(filePath, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  it('verifies that no backend database passwords, private JWT secrets, or payment private keys exist in mobile source files', () => {
    const files = [...getAllTsFiles(mobileSrcDir), ...getAllTsFiles(mobileAppDir)];
    const forbiddenSecretPatterns = [
      /DATABASE_URL/i,
      /postgres:\/\//i,
      /mysql:\/\//i,
      /RAZORPAY_KEY_SECRET/i,
      /STRIPE_SECRET_KEY/i,
      /JWT_SECRET/i,
      /sk_live_[a-zA-Z0-9]+/i,
      /rzp_live_[a-zA-Z0-9]+/i,
    ];

    const violations: { file: string; pattern: string }[] = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const pattern of forbiddenSecretPatterns) {
        if (pattern.test(content)) {
          violations.push({ file: path.relative(mobileSrcDir, file), pattern: pattern.toString() });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('purges SecureStore token on 401 Unauthorized API response', async () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://pms.stayos.com';
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Invalid or expired session token' }),
    });

    expect(await getAuthToken()).toBe('active-valid-jwt-token');

    await expect(apiClient('/api/auth/me')).rejects.toThrow('Invalid or expired session token');

    // Token must be wiped from SecureStore
    expect(await getAuthToken()).toBeNull();
  });
});
