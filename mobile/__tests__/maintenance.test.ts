const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-technician-bearer-token',
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
  fetchMaintenanceData,
  createWorkOrderApi,
  updateWorkOrderStatusApi,
  addWorkOrderPartApi,
  completeWorkOrderApi,
  createMaintenanceAssetApi,
} from '../src/api/maintenance';

describe('Mobile Engineering & Work Orders Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches plant assets and active work orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        assets: [
          {
            id: 'ast_1',
            hotelId: 'htl_1',
            name: 'Chiller Unit 1',
            code: 'CHILLER-01',
            category: 'HVAC',
            location: 'Basement Plant Room',
            status: 'OPERATIONAL',
            schedules: [
              { id: 'sch_1', title: 'Monthly Compressor Inspection', frequency: 'MONTHLY', nextRunDate: '2026-09-15T00:00:00.000Z' },
            ],
          },
        ],
        workOrders: [
          {
            id: 'wo_101',
            workOrderNumber: 'WO-882910',
            title: 'Water Leakage in Main Lobby AC',
            description: 'Condensation tray overflowing',
            priority: 'HIGH',
            status: 'REPORTED',
            assetId: 'ast_1',
            partsUsed: [],
          },
        ],
      }),
    });

    const data = await fetchMaintenanceData();
    expect(data.assets.length).toBe(1);
    expect(data.assets[0].name).toBe('Chiller Unit 1');
    expect(data.workOrders.length).toBe(1);
    expect(data.workOrders[0].workOrderNumber).toBe('WO-882910');
  });

  it('creates a new corrective work order', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_202',
          workOrderNumber: 'WO-112233',
          title: 'Generator Weekly Filter Check',
          description: 'Check fuel lines and air filter',
          priority: 'MEDIUM',
          status: 'REPORTED',
        },
      }),
    });

    const created = await createWorkOrderApi({
      title: 'Generator Weekly Filter Check',
      description: 'Check fuel lines and air filter',
      priority: 'MEDIUM',
    });

    expect(created.id).toBe('wo_202');
    expect(created.workOrderNumber).toBe('WO-112233');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('CREATE_WORK_ORDER');
  });

  it('updates work order status to IN_PROGRESS', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_101',
          status: 'IN_PROGRESS',
        },
      }),
    });

    const updated = await updateWorkOrderStatusApi({
      workOrderId: 'wo_101',
      status: 'IN_PROGRESS',
    });

    expect(updated.status).toBe('IN_PROGRESS');
  });

  it('records replacement parts consumption on work order', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        part: {
          id: 'prt_1',
          workOrderId: 'wo_101',
          partName: 'AC Filter Mesh',
          quantity: 2,
          unitCost: 250,
          totalCost: 500,
        },
      }),
    });

    const part = await addWorkOrderPartApi({
      workOrderId: 'wo_101',
      partName: 'AC Filter Mesh',
      quantity: 2,
      unitCost: 250,
    });

    expect(part.id).toBe('prt_1');
    expect(part.totalCost).toBe(500);
  });

  it('completes work order with resolution remarks', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        workOrder: {
          id: 'wo_101',
          status: 'COMPLETED',
        },
      }),
    });

    const completed = await completeWorkOrderApi({
      workOrderId: 'wo_101',
      resolutionNotes: 'Tray cleaned and drainage line cleared.',
    });

    expect(completed.status).toBe('COMPLETED');
  });

  it('registers a new plant machinery asset', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        asset: {
          id: 'ast_gen_2',
          name: 'Backup Generator 750kVA',
          code: 'GEN-750',
          category: 'GENERATOR',
          location: 'Rear Yard Plant Enclosure',
          status: 'OPERATIONAL',
        },
      }),
    });

    const asset = await createMaintenanceAssetApi({
      name: 'Backup Generator 750kVA',
      assetTag: 'GEN-750',
      category: 'GENERATOR',
      location: 'Rear Yard Plant Enclosure',
    });

    expect(asset.id).toBe('ast_gen_2');
    expect(asset.code).toBe('GEN-750');
  });
});
