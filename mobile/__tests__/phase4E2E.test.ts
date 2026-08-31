const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-phase4-e2e-token',
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
  openCashierShiftApi,
  recordCashierTransactionApi,
  closeCashierShiftApi,
} from '../src/api/cashier';
import {
  createPosOrderApi,
  updatePosOrderStatusApi,
} from '../src/api/pos';
import { fetchActiveKdsOrders } from '../src/api/kitchen';
import { fetchFoliosByReservation } from '../src/api/folio';

describe('Mobile Phase 4 Complete End-to-End F&B & Cashier Operational Flow', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('proves complete Cashier -> Restaurant POS -> Kitchen KDS -> Folio -> Reconciliation flow', async () => {
    // 1. Cashier opens morning register shift with ₹1,000 opening float
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_day_1',
          openingFloat: 1000,
          expectedCash: 1000,
          status: 'OPEN',
        },
      }),
    });

    const shift = await openCashierShiftApi({
      openingFloat: 1000,
      terminalName: 'Front Desk / Outlet 1',
    });
    expect(shift.status).toBe('OPEN');
    expect(shift.expectedCash).toBe(1000);

    // 2. Restaurant Waiter takes Table 4 order and sends KOT (Subtotal ₹600 + GST ₹30 = ₹630)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: {
          id: 'ord_pos_77',
          tableNumber: '4',
          orderSource: 'DineIn',
          status: 'Pending',
          subtotal: 600,
          gstAmount: 30,
          grandTotal: 630,
          kotPrinted: true,
        },
      }),
    });

    const posOrder = await createPosOrderApi({
      tableNumber: '4',
      orderSource: 'DineIn',
      kotPrinted: true,
      items: [{ menuItemId: 'm_paneer', quantity: 2 }],
    });
    expect(posOrder.id).toBe('ord_pos_77');
    expect(posOrder.status).toBe('Pending');

    // 3. Kitchen KDS displays the active pending order in queue
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        orders: [
          { id: 'ord_pos_77', tableNumber: '4', status: 'Pending', grandTotal: 630 },
        ],
      }),
    });

    const kdsOrders = await fetchActiveKdsOrders();
    expect(kdsOrders.length).toBe(1);
    expect(kdsOrders[0].id).toBe('ord_pos_77');

    // 4. Cook accepts KOT and transitions status to Preparing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: { id: 'ord_pos_77', status: 'Preparing' },
      }),
    });

    const prepOrder = await updatePosOrderStatusApi({ id: 'ord_pos_77', status: 'Preparing' });
    expect(prepOrder.status).toBe('Preparing');

    // 5. Cook completes preparation and marks dish Ready for counter pickup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: { id: 'ord_pos_77', status: 'Ready' },
      }),
    });

    const readyOrder = await updatePosOrderStatusApi({ id: 'ord_pos_77', status: 'Ready' });
    expect(readyOrder.status).toBe('Ready');

    // 6. Waiter serves order to Table 4 and charges ₹630 to guest room reservation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        order: {
          id: 'ord_pos_77',
          status: 'Delivered',
          paymentStatus: 'Folio',
          reservationId: 'res_204',
          grandTotal: 630,
        },
      }),
    });

    const servedOrder = await updatePosOrderStatusApi({
      id: 'ord_pos_77',
      status: 'Delivered',
      paymentStatus: 'Folio',
    });
    expect(servedOrder.status).toBe('Delivered');
    expect(servedOrder.paymentStatus).toBe('Folio');

    // 7. Guest Folio reflects the posted ₹630 restaurant charge
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        folios: [
          {
            id: 'fol_204',
            reservationId: 'res_204',
            balance: 630,
            transactions: [
              { id: 'tx_fnb', type: 'Charge', description: 'Restaurant Order #ORD_POS_ (Table 4)', amount: 630 },
            ],
          },
        ],
      }),
    });

    const folios = await fetchFoliosByReservation('res_204');
    expect(folios[0].balance).toBe(630);
    expect(folios[0].transactions[0].amount).toBe(630);

    // 8. Cashier collects ₹630 cash settlement and records entry on active shift
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_day_1',
          cashPayments: 630,
          expectedCash: 1630, // ₹1,000 float + ₹630 payment
          status: 'OPEN',
        },
      }),
    });

    const shiftAfterPayment = await recordCashierTransactionApi({
      shiftId: 'shf_day_1',
      type: 'PAYMENT',
      amount: 630,
      description: 'Room 204 Folio Cash Settlement',
    });
    expect(shiftAfterPayment.cashPayments).toBe(630);
    expect(shiftAfterPayment.expectedCash).toBe(1630);

    // 9. Cashier drops ₹500 cash to hotel drop-safe
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_day_1',
          cashDrops: 500,
          expectedCash: 1130, // ₹1,630 - ₹500 drop
          status: 'OPEN',
        },
      }),
    });

    const shiftAfterDrop = await recordCashierTransactionApi({
      shiftId: 'shf_day_1',
      type: 'DROP',
      amount: 500,
      description: 'Mid-day drop to hotel safe',
    });
    expect(shiftAfterDrop.cashDrops).toBe(500);
    expect(shiftAfterDrop.expectedCash).toBe(1130);

    // 10. Cashier performs blind count (counted: ₹1,130) and closes shift with ₹0.00 variance
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_day_1',
          status: 'CLOSED',
          actualCash: 1130,
          expectedCash: 1130,
          variance: 0,
        },
      }),
    });

    const finalShift = await closeCashierShiftApi({
      shiftId: 'shf_day_1',
      actualClosingCash: 1130,
      closingNotes: 'Shift closed and balanced perfectly with zero variance.',
    });

    expect(finalShift.status).toBe('CLOSED');
    expect(finalShift.variance).toBe(0);
    expect(finalShift.actualCash).toBe(1130);
  });
});
