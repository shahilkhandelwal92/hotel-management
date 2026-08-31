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
  fetchReservations,
  fetchReservationById,
  createReservation,
  checkInReservation,
  cancelReservation,
  updateReservationRoom,
} from '../src/api/reservations';

describe('Mobile Front Desk & Reservations Subsystem', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:3000';
  });

  it('fetches reservations list with search and status filters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => [
        {
          id: 'res_101',
          bookingRef: 'BK-2026-001',
          guestName: 'Vikramaditya Rathore',
          guestPhone: '+91 98765 43210',
          status: 'Confirmed',
          checkIn: '2026-09-01T14:00:00.000Z',
          checkOut: '2026-09-03T11:00:00.000Z',
          totalAmount: 6000,
          advanceDeposit: 2000,
          balanceDue: 4000,
        },
      ],
    });

    const results = await fetchReservations({ status: 'Confirmed', search: 'Vikramaditya' });

    expect(results.length).toBe(1);
    expect(results[0].bookingRef).toBe('BK-2026-001');
    expect(results[0].status).toBe('Confirmed');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('status=Confirmed');
    expect(mockFetch.mock.calls[0][0]).toContain('search=Vikramaditya');
  });

  it('creates walk-in reservation via backend validation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_walkin_99',
          bookingRef: 'BK-WALK-99',
          guestName: 'Ananya Deshmukh',
          guestPhone: '+91 91234 56789',
          status: 'Confirmed',
          totalAmount: 3500,
          advanceDeposit: 1000,
          balanceDue: 2500,
        },
      }),
    });

    const result = await createReservation({
      hotelId: 'htl_grand_palace',
      guestName: 'Ananya Deshmukh',
      guestPhone: '+91 91234 56789',
      checkIn: '2026-09-01',
      checkOut: '2026-09-02',
      adults: 2,
      children: 0,
      advanceDeposit: 1000,
    });

    expect(result.id).toBe('res_walkin_99');
    expect(result.guestName).toBe('Ananya Deshmukh');
    expect(result.balanceDue).toBe(2500);
  });

  it('fetches reservation detail by unique ID', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_101',
          bookingRef: 'BK-2026-001',
          guestName: 'Vikramaditya Rathore',
          guestPhone: '+91 98765 43210',
          status: 'Confirmed',
          room: { id: 'rm_204', number: '204', type: 'Deluxe', status: 'Vacant' },
        },
      }),
    });

    const res = await fetchReservationById('res_101');
    expect(res.guestName).toBe('Vikramaditya Rathore');
    expect(res.room?.number).toBe('204');
  });

  it('assigns room to unassigned reservation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_101',
          roomId: 'rm_305',
          status: 'Confirmed',
        },
      }),
    });

    const updated = await updateReservationRoom('res_101', 'rm_305');
    expect(updated.roomId).toBe('rm_305');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.roomId).toBe('rm_305');
  });

  it('executes check-in mutation and transitions state to CheckedIn', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_101',
          status: 'CheckedIn',
          actualCheckIn: '2026-09-01T14:30:00.000Z',
        },
      }),
    });

    const checkedIn = await checkInReservation('res_101');
    expect(checkedIn.status).toBe('CheckedIn');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('checkin');
  });

  it('cancels confirmed reservation and releases room', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        reservation: {
          id: 'res_101',
          status: 'Cancelled',
        },
      }),
    });

    const cancelled = await cancelReservation('res_101');
    expect(cancelled.status).toBe('Cancelled');
    const bodySent = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(bodySent.action).toBe('cancel');
  });
});
