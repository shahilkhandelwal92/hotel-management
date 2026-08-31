const mockStore: Record<string, string> = {
  stayos_auth_token: 'mock-e2e-bearer-token',
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
  createReservation,
  updateReservationRoom,
  checkInReservation,
  checkOutReservation,
  executeRoomMoveApi,
} from '../src/api/reservations';
import {
  fetchFoliosByReservation,
  postFolioTransaction,
  transferSplitFolioCharge,
  closeFolio,
} from '../src/api/folio';

describe('Mobile End-to-End Complete Guest Operational Lifecycle', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('verifies complete lifecycle: create -> assign -> checkin -> charges -> split -> move -> pay -> checkout', async () => {
    // 1. Create Reservation with Advance Deposit (₹2,000.00)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_lifecycle_1',
          bookingRef: 'BK-LIFE-001',
          guestName: 'Rajesh Singhania',
          guestPhone: '+91 98200 11223',
          checkIn: '2026-09-01',
          checkOut: '2026-09-02',
          status: 'Confirmed',
          totalAmount: 3360,
          advanceDeposit: 2000,
          balanceDue: 1360,
        },
      }),
    });

    const res = await createReservation({
      hotelId: 'htl_1',
      guestName: 'Rajesh Singhania',
      guestPhone: '+91 98200 11223',
      checkIn: '2026-09-01',
      checkOut: '2026-09-02',
      adults: 2,
      children: 0,
      advanceDeposit: 2000,
    });
    expect(res.id).toBe('res_lifecycle_1');
    expect(res.status).toBe('Confirmed');

    // 2. Assign Physical Room (Room 101)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_lifecycle_1',
          roomId: 'rm_101',
          status: 'Confirmed',
        },
      }),
    });
    const assigned = await updateReservationRoom('res_lifecycle_1', 'rm_101');
    expect(assigned.roomId).toBe('rm_101');

    // 3. Guest Check-In -> Room 101 becomes Occupied
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_lifecycle_1',
          status: 'CheckedIn',
        },
      }),
    });
    const checkedIn = await checkInReservation('res_lifecycle_1');
    expect(checkedIn.status).toBe('CheckedIn');

    // 4. Folio Ledger Verification with Posted Room Charges & Taxes (Total Debits: ₹4,240.00)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        folios: [
          {
            id: 'fol_life_1',
            reservationId: 'res_lifecycle_1',
            status: 'Open',
            balance: 2240, // ₹4,240 charges - ₹2,000 advance deposit
            transactions: [
              { id: 't1', type: 'Charge', description: 'Room Tariff', amount: 3000 },
              { id: 't2', type: 'Charge', description: 'Room GST 12%', amount: 360 },
              { id: 't3', type: 'Charge', description: 'F&B Dinner', amount: 600 },
              { id: 't4', type: 'Charge', description: 'F&B GST 5%', amount: 30 },
              { id: 't5', type: 'Charge', description: 'Minibar', amount: 250 },
              { id: 't6', type: 'Payment', description: 'Advance Deposit', amount: -2000 },
            ],
          },
        ],
      }),
    });
    const folios = await fetchFoliosByReservation('res_lifecycle_1');
    expect(folios[0].balance).toBe(2240);
    expect(folios[0].transactions.length).toBe(6);

    // 5. Split Folio: Route ₹880 (F&B + Minibar) to Window 2 (Incidentals)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        sourceWindow: { id: 'win_1', balance: 1360 },
        targetWindow: { id: 'win_2', balance: 880 },
      }),
    });
    const splitResult: any = await transferSplitFolioCharge({
      folioId: 'fol_life_1',
      sourceWindowId: 'win_1',
      targetWindowId: 'win_2',
      amount: 880,
      reason: 'Split incidentals to Window 2',
    });
    expect(splitResult.success).toBe(true);

    // 6. Mid-Stay Room Move: Move Room 101 -> Room 205 (Room 101 becomes Dirty, 205 becomes Occupied)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: true,
        oldRoom: { id: 'rm_101', number: '101', status: 'Dirty' },
        newRoom: { id: 'rm_205', number: '205', status: 'Occupied' },
        reservationId: 'res_lifecycle_1',
      }),
    });
    const moveResult: any = await executeRoomMoveApi('res_lifecycle_1', 'rm_205', 'Guest upgraded to suite');
    expect(moveResult.success).toBe(true);
    expect(moveResult.oldRoom.status).toBe('Dirty');
    expect(moveResult.newRoom.status).toBe('Occupied');

    // 7. Final Payment Settlement (₹2,240.00 -> Balance becomes ₹0.00)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        transaction: { id: 't_final', type: 'Payment', description: 'Card Settlement', amount: -2240 },
        folio: { id: 'fol_life_1', balance: 0 },
      }),
    });
    const settlement = await postFolioTransaction({
      folioId: 'fol_life_1',
      type: 'Payment',
      description: 'Card Settlement',
      amount: 2240,
    });
    expect(settlement.folio.balance).toBe(0);

    // 8. Departure Checkout & Folio Closing
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: { id: 'res_lifecycle_1', status: 'CheckedOut' },
      }),
    });
    const checkedOut = await checkOutReservation('res_lifecycle_1');
    expect(checkedOut.status).toBe('CheckedOut');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        folio: { id: 'fol_life_1', status: 'Closed', balance: 0 },
      }),
    });
    const closedFolio = await closeFolio('fol_life_1');
    expect(closedFolio.folio.status).toBe('Closed');
    expect(closedFolio.folio.balance).toBe(0);
  });
});
