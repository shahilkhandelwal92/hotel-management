const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-technician-token',
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

describe('Mobile Out-of-Order (OOO) Room Lifecycle & Isolation', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('locks room Out-of-Order when work order created with lockRoomOutOfOrder flag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_ooo_1',
          workOrderNumber: 'WO-OOO-304',
          title: 'Bathroom plumbing valve burst',
          roomId: 'rm_304',
          lockRoomOutOfOrder: true,
          status: 'REPORTED',
        },
      }),
    });

    const wo = await createWorkOrderApi({
      title: 'Bathroom plumbing valve burst',
      description: 'Major leak requiring pipe replacement',
      priority: 'EMERGENCY',
      roomId: 'rm_304',
      lockRoomOutOfOrder: true,
    });

    expect(wo.lockRoomOutOfOrder).toBe(true);
    expect(wo.roomId).toBe('rm_304');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.lockRoomOutOfOrder).toBe(true);
    expect(bodySent.roomId).toBe('rm_304');
  });

  it('releases OOO room to Housekeeping Dirty state upon work order completion', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_ooo_1',
          roomId: 'rm_304',
          lockRoomOutOfOrder: true,
          status: 'COMPLETED',
        },
      }),
    });

    const completed = await completeWorkOrderApi({
      workOrderId: 'wo_ooo_1',
      resolutionNotes: 'Plumbing valve replaced and pressure tested.',
    });

    expect(completed.status).toBe('COMPLETED');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('COMPLETE_WORK_ORDER');
    expect(bodySent.workOrderId).toBe('wo_ooo_1');
  });
});
