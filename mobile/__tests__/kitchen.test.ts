const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-kitchen-bearer-token',
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
  fetchKitchenStock,
  updateKitchenStockApi,
  fetchActiveKdsOrders,
} from '../src/api/kitchen';

describe('Mobile Kitchen Display System (KDS) & Grocery Stock Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches active KDS orders queue filtering only pending/preparing/ready orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        orders: [
          { id: 'k_1', tableNumber: '2', status: 'Pending', items: [{ quantity: 2 }] },
          { id: 'k_2', tableNumber: '5', status: 'Preparing', items: [{ quantity: 1 }] },
          { id: 'k_3', tableNumber: '8', status: 'Delivered', items: [{ quantity: 3 }] },
          { id: 'k_4', tableNumber: '1', status: 'Completed', items: [{ quantity: 1 }] },
        ],
      }),
    });

    const activeOrders = await fetchActiveKdsOrders();
    expect(activeOrders.length).toBe(2);
    expect(activeOrders.map((o) => o.id)).toEqual(['k_1', 'k_2']);
  });

  it('fetches kitchen grocery inventory stock with units and alert levels', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        stock: [
          { id: 'stk_1', itemName: 'Paneer Block', unit: 'kg', quantity: 15, minAlert: 5 },
          { id: 'stk_2', itemName: 'Basmati Rice', unit: 'kg', quantity: 2, minAlert: 10 },
        ],
      }),
    });

    const stock = await fetchKitchenStock();
    expect(stock.length).toBe(2);
    expect(stock[0].itemName).toBe('Paneer Block');
    expect(stock[1].quantity <= stock[1].minAlert).toBe(true); // Low stock alert
  });

  it('updates stock inventory physical count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        stockItem: {
          id: 'stk_2',
          itemName: 'Basmati Rice',
          unit: 'kg',
          quantity: 25,
          minAlert: 10,
        },
      }),
    });

    const updated = await updateKitchenStockApi({
      id: 'stk_2',
      quantity: 25,
    });

    expect(updated.quantity).toBe(25);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.quantity).toBe(25);
  });
});
