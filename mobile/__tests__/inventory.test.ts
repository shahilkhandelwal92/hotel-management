const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-storekeeper-bearer-token',
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
  fetchStoresAndTransfers,
  createInventoryStoreApi,
  createStoreTransferApi,
  issueStoreTransferApi,
  receiveStoreTransferApi,
} from '../src/api/inventory';

describe('Mobile Multi-Store Inventory & Transfers Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches inventory stores and stock transfer requisitions', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        stores: [
          { id: 'str_1', hotelId: 'htl_1', name: 'Central Main Store', code: 'MAIN-01', location: 'Ground Floor' },
          { id: 'str_2', hotelId: 'htl_1', name: 'Housekeeping Linen Store', code: 'HK-01', location: 'Floor 2' },
        ],
        transfers: [
          {
            id: 'trf_101',
            transferNumber: 'TRF-554433',
            sourceStoreId: 'str_1',
            destStoreId: 'str_2',
            itemName: 'King Bed Sheet',
            quantity: 50,
            unit: 'PCS',
            status: 'REQUESTED',
            requestedBy: 'usr_hk_1',
          },
        ],
      }),
    });

    const data = await fetchStoresAndTransfers();
    expect(data.stores.length).toBe(2);
    expect(data.transfers.length).toBe(1);
    expect(data.transfers[0].itemName).toBe('King Bed Sheet');
  });

  it('creates an inventory store warehouse location', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        store: {
          id: 'str_bar',
          hotelId: 'htl_1',
          name: 'Main Bar Beverage Store',
          code: 'BAR-01',
          location: 'Mezzanine Floor',
        },
      }),
    });

    const store = await createInventoryStoreApi({
      name: 'Main Bar Beverage Store',
      code: 'BAR-01',
      location: 'Mezzanine Floor',
    });

    expect(store.id).toBe('str_bar');
    expect(store.code).toBe('BAR-01');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('CREATE_STORE');
  });

  it('creates an inter-store stock transfer requisition', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transfer: {
          id: 'trf_202',
          transferNumber: 'TRF-998877',
          sourceStoreId: 'str_1',
          destStoreId: 'str_2',
          itemName: 'Bath Towels (White)',
          quantity: 40,
          unit: 'PCS',
          status: 'REQUESTED',
        },
      }),
    });

    const trf = await createStoreTransferApi({
      transferNumber: 'TRF-998877',
      sourceStoreId: 'str_1',
      destStoreId: 'str_2',
      itemName: 'Bath Towels (White)',
      quantity: 40,
      unit: 'PCS',
    });

    expect(trf.id).toBe('trf_202');
    expect(trf.status).toBe('REQUESTED');
    expect(trf.quantity).toBe(40);
  });

  it('dispatches store transfer and marks status IN_TRANSIT', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transfer: {
          id: 'trf_202',
          status: 'IN_TRANSIT',
        },
      }),
    });

    const issued = await issueStoreTransferApi('trf_202');
    expect(issued.status).toBe('IN_TRANSIT');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('ISSUE');
    expect(bodySent.transferId).toBe('trf_202');
  });

  it('confirms receipt of stock transfer at destination store', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transfer: {
          id: 'trf_202',
          status: 'RECEIVED',
        },
      }),
    });

    const received = await receiveStoreTransferApi('trf_202');
    expect(received.status).toBe('RECEIVED');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('RECEIVE');
  });
});
