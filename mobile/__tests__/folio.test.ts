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

import {
  fetchFoliosByReservation,
  postFolioTransaction,
  closeFolio,
  fetchSplitFolioSummary,
  transferSplitFolioCharge,
} from '../src/api/folio';

describe('Mobile Folio, Split Windows & Billing Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches guest folios and line item transaction history', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        folios: [
          {
            id: 'fol_1',
            hotelId: 'htl_1',
            reservationId: 'res_101',
            folioType: 'Room',
            status: 'Open',
            balance: 4240,
            transactions: [
              { id: 'tx_1', type: 'Charge', description: 'Room Tariff Night 1', amount: 3000, postedAt: '2026-09-01T12:00:00.000Z' },
              { id: 'tx_2', type: 'Charge', description: 'Room GST (12%)', amount: 360, postedAt: '2026-09-01T12:00:00.000Z' },
              { id: 'tx_3', type: 'Charge', description: 'Restaurant Dinner (KOT)', amount: 600, postedAt: '2026-09-01T20:00:00.000Z' },
              { id: 'tx_4', type: 'Charge', description: 'F&B GST (5%)', amount: 30, postedAt: '2026-09-01T20:00:00.000Z' },
              { id: 'tx_5', type: 'Charge', description: 'Minibar Beverages', amount: 250, postedAt: '2026-09-01T22:00:00.000Z' },
            ],
          },
        ],
      }),
    });

    const folios = await fetchFoliosByReservation('res_101');
    expect(folios.length).toBe(1);
    expect(folios[0].balance).toBe(4240);
    expect(folios[0].transactions.length).toBe(5);
  });

  it('posts payment transaction and decreases folio balance', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transaction: {
          id: 'tx_pay_1',
          type: 'Payment',
          description: 'UPI Settlement',
          amount: -4240,
        },
        folio: {
          id: 'fol_1',
          balance: 0,
        },
      }),
    });

    const result = await postFolioTransaction({
      folioId: 'fol_1',
      type: 'Payment',
      description: 'UPI Settlement',
      amount: 4240,
    });

    expect(result.folio.balance).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.mode).toBe('post_transaction');
    expect(bodySent.amount).toBe(4240);
  });

  it('fetches Split Folio 4 Windows summary', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        folioId: 'fol_1',
        windows: [
          { id: 'win_1', folioId: 'fol_1', windowNumber: 1, name: 'Room & Tax', payerType: 'Guest', balance: 3360 },
          { id: 'win_2', folioId: 'fol_1', windowNumber: 2, name: 'Incidentals', payerType: 'Guest', balance: 880 },
          { id: 'win_3', folioId: 'fol_1', windowNumber: 3, name: 'Corporate Billing', payerType: 'Company', balance: 0 },
          { id: 'win_4', folioId: 'fol_1', windowNumber: 4, name: 'Banquets/Events', payerType: 'Guest', balance: 0 },
        ],
      }),
    });

    const summary = await fetchSplitFolioSummary('fol_1');
    expect(summary.windows.length).toBe(4);
    expect(summary.windows[0].name).toBe('Room & Tax');
    expect(summary.windows[1].balance).toBe(880);
  });

  it('transfers charge between Split Folio windows', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        sourceWindow: { id: 'win_1', balance: 2480 },
        targetWindow: { id: 'win_3', balance: 880 },
      }),
    });

    const result: any = await transferSplitFolioCharge({
      folioId: 'fol_1',
      sourceWindowId: 'win_1',
      targetWindowId: 'win_3',
      amount: 880,
      reason: 'Route extras to corporate account',
    });

    expect(result.success).toBe(true);
    expect(result.sourceWindow.balance).toBe(2480);
  });

  it('closes balanced folio (balance = 0)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        folio: { id: 'fol_1', status: 'Closed', balance: 0 },
      }),
    });

    const result = await closeFolio('fol_1');
    expect(result.folio.status).toBe('Closed');
  });

  it('rejects closing folio with outstanding balance', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: 'A folio with an outstanding balance cannot be closed',
      }),
    });

    await expect(closeFolio('fol_unbalanced')).rejects.toThrow(
      'A folio with an outstanding balance cannot be closed'
    );
  });
});
