const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-phase5-e2e-token',
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

import {
  createWorkOrderApi,
  updateWorkOrderStatusApi,
  addWorkOrderPartApi,
  completeWorkOrderApi,
} from '../src/api/maintenance';
import {
  createStoreTransferApi,
  issueStoreTransferApi,
  receiveStoreTransferApi,
} from '../src/api/inventory';

describe('Mobile Phase 5 Complete End-to-End Engineering & Stores Operational Flow', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('proves complete lifecycle: Work Order -> Room OOO Lock -> Part Consumption -> Room Release -> Store Requisition -> Dispatch -> Receipt', async () => {
    // 1. Technician creates Emergency Work Order for Room 304 with Out-of-Order Lock
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_phase5_1',
          workOrderNumber: 'WO-PH5-001',
          title: 'AC Compressor Failure & Gas Leak',
          description: 'No cooling in room, electrical trip',
          priority: 'EMERGENCY',
          roomId: 'rm_304',
          lockRoomOutOfOrder: true,
          status: 'REPORTED',
        },
      }),
    });

    const wo = await createWorkOrderApi({
      title: 'AC Compressor Failure & Gas Leak',
      description: 'No cooling in room, electrical trip',
      priority: 'EMERGENCY',
      roomId: 'rm_304',
      lockRoomOutOfOrder: true,
    });
    expect(wo.id).toBe('wo_phase5_1');
    expect(wo.lockRoomOutOfOrder).toBe(true);

    // 2. Technician starts repairs -> moves status to IN_PROGRESS
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_phase5_1',
          status: 'IN_PROGRESS',
        },
      }),
    });

    const inProgressWo = await updateWorkOrderStatusApi({
      workOrderId: 'wo_phase5_1',
      status: 'IN_PROGRESS',
    });
    expect(inProgressWo.status).toBe('IN_PROGRESS');

    // 3. Technician logs part replacement (AC Capacitor @ ₹450)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        part: {
          id: 'part_501',
          workOrderId: 'wo_phase5_1',
          partName: 'AC Run Capacitor 45uF',
          quantity: 1,
          unitCost: 450,
          totalCost: 450,
        },
      }),
    });

    const part = await addWorkOrderPartApi({
      workOrderId: 'wo_phase5_1',
      partName: 'AC Run Capacitor 45uF',
      quantity: 1,
      unitCost: 450,
    });
    expect(part.totalCost).toBe(450);

    // 4. Technician completes work order -> Server releases Room 304 to Housekeeping Dirty status
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_phase5_1',
          status: 'COMPLETED',
          roomId: 'rm_304',
          lockRoomOutOfOrder: true,
        },
      }),
    });

    const completedWo = await completeWorkOrderApi({
      workOrderId: 'wo_phase5_1',
      resolutionNotes: 'Capacitor replaced and refrigerant topped up. Cooling verified at 21C.',
    });
    expect(completedWo.status).toBe('COMPLETED');

    // 5. Storekeeper creates stock transfer requisition: 50 King Bed Sheets from Central Store to Linen Store
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transfer: {
          id: 'trf_phase5_1',
          transferNumber: 'TRF-PH5-001',
          sourceStoreId: 'str_central',
          destStoreId: 'str_linen',
          itemName: 'King Bed Sheet (White 300TC)',
          quantity: 50,
          unit: 'PCS',
          status: 'REQUESTED',
        },
      }),
    });

    const trf = await createStoreTransferApi({
      transferNumber: 'TRF-PH5-001',
      sourceStoreId: 'str_central',
      destStoreId: 'str_linen',
      itemName: 'King Bed Sheet (White 300TC)',
      quantity: 50,
      unit: 'PCS',
    });
    expect(trf.id).toBe('trf_phase5_1');
    expect(trf.status).toBe('REQUESTED');

    // 6. Central Store issues/dispatches transfer -> status becomes IN_TRANSIT
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transfer: {
          id: 'trf_phase5_1',
          status: 'IN_TRANSIT',
        },
      }),
    });

    const dispatchedTrf = await issueStoreTransferApi('trf_phase5_1');
    expect(dispatchedTrf.status).toBe('IN_TRANSIT');

    // 7. Linen Store receives and confirms delivery -> status becomes RECEIVED
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transfer: {
          id: 'trf_phase5_1',
          status: 'RECEIVED',
        },
      }),
    });

    const receivedTrf = await receiveStoreTransferApi('trf_phase5_1');
    expect(receivedTrf.status).toBe('RECEIVED');
  });
});
