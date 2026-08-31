import { apiClient } from './client';
import { Reservation } from './types';

export interface ReservationFilters {
  status?: string;
  search?: string;
  checkIn?: string;
  checkOut?: string;
}

export interface CreateReservationPayload {
  hotelId: string;
  roomId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestAddress?: string;
  guestCity?: string;
  guestState?: string;
  guestGstin?: string;
  idType?: string;
  idNumber?: string;
  bookingType?: string;
  ratePlan?: string;
  ratePlanId?: string;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  advanceDeposit?: number;
  includesBreakfast?: boolean;
  includesDinner?: boolean;
  specialRequests?: string;
}

export async function fetchReservations(filters: ReservationFilters = {}): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.search) params.append('search', filters.search);
  if (filters.checkIn) params.append('checkIn', filters.checkIn);
  if (filters.checkOut) params.append('checkOut', filters.checkOut);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  return await apiClient<Reservation[]>(`/api/reservations${queryStr}`);
}

export async function fetchReservationById(id: string): Promise<Reservation> {
  const response = await apiClient<{ reservation: Reservation }>(`/api/reservations/${id}`);
  return response.reservation;
}

export async function createReservation(payload: CreateReservationPayload): Promise<Reservation> {
  const response = await apiClient<{ reservation: Reservation }>('/api/reservations', {
    method: 'POST',
    body: payload,
  });
  return response.reservation;
}

export async function checkInReservation(id: string): Promise<Reservation> {
  const response = await apiClient<{ reservation: Reservation }>(`/api/reservations/${id}`, {
    method: 'PUT',
    body: { action: 'checkin' },
  });
  return response.reservation;
}

export async function checkOutReservation(id: string): Promise<Reservation> {
  const response = await apiClient<{ reservation: Reservation }>(`/api/reservations/${id}`, {
    method: 'PUT',
    body: { action: 'checkout' },
  });
  return response.reservation;
}

export async function cancelReservation(id: string): Promise<Reservation> {
  const response = await apiClient<{ reservation: Reservation }>(`/api/reservations/${id}`, {
    method: 'PUT',
    body: { action: 'cancel' },
  });
  return response.reservation;
}

export async function updateReservationRoom(id: string, roomId: string | null): Promise<Reservation> {
  const response = await apiClient<{ reservation: Reservation }>(`/api/reservations/${id}`, {
    method: 'PUT',
    body: { roomId },
  });
  return response.reservation;
}

export async function executeRoomMoveApi(reservationId: string, targetRoomId: string, reason: string) {
  return await apiClient('/api/reservations/room-move', {
    method: 'POST',
    body: { reservationId, targetRoomId, reason },
  });
}
