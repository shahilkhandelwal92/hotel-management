const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-cashier-bearer-token',
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
  fetchCashierShifts,
  openCashierShiftApi,
  recordCashierTransactionApi,
  closeCashierShiftApi,
} from '../src/api/cashier';

describe('Mobile Cashier Shifts & Drawer Reconciliation Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches active cashier shift and drawer ledger history', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shifts: [
          {
            id: 'shf_101',
            hotelId: 'htl_1',
            userId: 'usr_cashier_1',
            terminalName: 'Front Desk Register 1',
            status: 'OPEN',
            openingFloat: 1000,
            cashPayments: 4240,
            cashSales: 500,
            paidOuts: 200,
            cashDrops: 2000,
            refunds: 0,
            expectedCash: 3540,
            transactions: [
              { id: 'tx_1', shiftId: 'shf_101', type: 'FOLIO_PAYMENT', amount: 4240, notes: 'Folio settlement', createdAt: '2026-09-01T10:00:00.000Z' },
            ],
          },
        ],
      }),
    });

    const shifts = await fetchCashierShifts();
    expect(shifts.length).toBe(1);
    expect(shifts[0].status).toBe('OPEN');
    expect(shifts[0].expectedCash).toBe(3540);
  });

  it('opens a new cashier shift with an opening float', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_102',
          hotelId: 'htl_1',
          openingFloat: 1500,
          expectedCash: 1500,
          status: 'OPEN',
          terminalName: 'Restaurant Register',
        },
      }),
    });

    const newShift = await openCashierShiftApi({
      openingFloat: 1500,
      terminalName: 'Restaurant Register',
      notes: 'Morning shift opening',
    });

    expect(newShift.id).toBe('shf_102');
    expect(newShift.openingFloat).toBe(1500);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.openingFloat).toBe(1500);
  });

  it('records cash drop to safe transaction on active shift', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_101',
          cashDrops: 2000,
          expectedCash: 1540,
          status: 'OPEN',
        },
      }),
    });

    const updated = await recordCashierTransactionApi({
      shiftId: 'shf_101',
      type: 'DROP',
      amount: 2000,
      description: 'Mid-day cash drop to hotel safe',
    });

    expect(updated.cashDrops).toBe(2000);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('LOG_TXN');
    expect(bodySent.type).toBe('DROP');
    expect(bodySent.amount).toBe(2000);
  });

  it('records paid-out petty cash disbursement on active shift', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_101',
          paidOuts: 350,
          status: 'OPEN',
        },
      }),
    });

    const updated = await recordCashierTransactionApi({
      shiftId: 'shf_101',
      type: 'PAID_OUT',
      amount: 350,
      description: 'Courier delivery charge',
    });

    expect(updated.paidOuts).toBe(350);
  });

  it('closes cashier shift and computes variance on server', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        shift: {
          id: 'shf_101',
          status: 'CLOSED',
          actualCash: 3540,
          expectedCash: 3540,
          variance: 0,
        },
      }),
    });

    const closed = await closeCashierShiftApi({
      shiftId: 'shf_101',
      actualClosingCash: 3540,
      closingNotes: 'Shift reconciled cleanly',
    });

    expect(closed.status).toBe('CLOSED');
    expect(closed.variance).toBe(0);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('CLOSE');
    expect(bodySent.actualClosingCash).toBe(3540);
  });
});
