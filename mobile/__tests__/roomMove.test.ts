const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-front-desk-bearer-token',
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

import { executeRoomMoveApi } from '../src/api/reservations';
import { ApiError } from '../src/api/client';

describe('Mobile In-Stay Room Move Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('successfully executes atomic room move via backend engine', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        oldRoom: { id: 'rm_101', number: '101', status: 'Dirty' },
        newRoom: { id: 'rm_205', number: '205', status: 'Occupied' },
        reservationId: 'res_101',
      }),
    });

    const result: any = await executeRoomMoveApi('res_101', 'rm_205', 'Guest noise complaint');

    expect(result.success).toBe(true);
    expect(result.oldRoom.status).toBe('Dirty');
    expect(result.newRoom.status).toBe('Occupied');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.reservationId).toBe('res_101');
    expect(bodySent.targetRoomId).toBe('rm_205');
    expect(bodySent.reason).toBe('Guest noise complaint');
  });

  it('handles 409 conflict when target room becomes occupied during selection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Target room 205 is not vacant/clean. Current status: Occupied',
      }),
    });

    try {
      await executeRoomMoveApi('res_101', 'rm_205', 'Upgrade request');
      fail('Expected 409 ApiError to be thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
      expect(err.message).toContain('Target room 205 is not vacant/clean');
    }
  });

  it('handles 422 validation failure when reservation is not CheckedIn', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'Room move is only permitted for active in-stay reservations. Current status: Confirmed',
      }),
    });

    await expect(executeRoomMoveApi('res_unconfirmed', 'rm_205', 'Move test')).rejects.toThrow(
      'Room move is only permitted for active in-stay reservations'
    );
  });
});
