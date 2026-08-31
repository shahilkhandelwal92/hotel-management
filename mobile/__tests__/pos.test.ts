const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-pos-bearer-token',
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
  fetchMenuItems,
  fetchPosOrders,
  createPosOrderApi,
  updatePosOrderStatusApi,
} from '../src/api/pos';

describe('Mobile Restaurant POS Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches restaurant menu items with categories and pricing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        menuItems: [
          { id: 'm_1', name: 'Paneer Butter Masala', category: 'Mains', price: 320, isVeg: true },
          { id: 'm_2', name: 'Butter Naan', category: 'Breads', price: 50, isVeg: true },
          { id: 'm_3', name: 'Tandoori Chicken', category: 'Starters', price: 450, isVeg: false },
        ],
      }),
    });

    const menu = await fetchMenuItems();
    expect(menu.length).toBe(3);
    expect(menu[0].name).toBe('Paneer Butter Masala');
    expect(menu[0].isVeg).toBe(true);
  });

  it('fetches active POS restaurant orders', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        orders: [
          {
            id: 'ord_1',
            tableNumber: '4',
            orderSource: 'DineIn',
            status: 'Preparing',
            subtotal: 640,
            gstAmount: 32,
            grandTotal: 672,
            items: [
              { menuItemId: 'm_1', quantity: 2, unitPrice: 320, lineTotal: 640 },
            ],
          },
        ],
      }),
    });

    const orders = await fetchPosOrders({ status: 'Preparing' });
    expect(orders.length).toBe(1);
    expect(orders[0].tableNumber).toBe('4');
    expect(orders[0].grandTotal).toBe(672);
  });

  it('creates table order and dispatches KOT to kitchen', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: {
          id: 'ord_201',
          tableNumber: '7',
          orderSource: 'DineIn',
          status: 'Pending',
          subtotal: 740,
          gstAmount: 37,
          grandTotal: 777,
          kotPrinted: true,
        },
      }),
    });

    const created = await createPosOrderApi({
      tableNumber: '7',
      orderSource: 'DineIn',
      kotPrinted: true,
      items: [
        { menuItemId: 'm_1', quantity: 2, notes: 'Extra spicy' },
        { menuItemId: 'm_2', quantity: 2 },
      ],
    });

    expect(created.id).toBe('ord_201');
    expect(created.tableNumber).toBe('7');
    expect(created.kotPrinted).toBe(true);
  });

  it('creates room service order charged to guest folio', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: {
          id: 'ord_room_301',
          orderSource: 'RoomService',
          reservationId: 'res_101',
          status: 'Pending',
          paymentStatus: 'Folio',
          grandTotal: 672,
        },
      }),
    });

    const created = await createPosOrderApi({
      orderSource: 'RoomService',
      reservationId: 'res_101',
      guestName: 'Rajesh Singhania',
      items: [{ menuItemId: 'm_1', quantity: 2 }],
    });

    expect(created.paymentStatus).toBe('Folio');
    expect(created.reservationId).toBe('res_101');
  });

  it('advances POS order status to Delivered and Completed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: {
          id: 'ord_201',
          status: 'Delivered',
        },
      }),
    });

    const updated = await updatePosOrderStatusApi({
      id: 'ord_201',
      status: 'Delivered',
    });

    expect(updated.status).toBe('Delivered');
  });
});
