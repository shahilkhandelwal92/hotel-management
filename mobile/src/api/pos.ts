import { apiClient } from './client';
import { MenuItem, PosOrder, PosOrderItem } from './types';

export interface CreatePosOrderPayload {
  tableNumber?: string;
  orderSource?: 'Walkin' | 'DineIn' | 'RoomService' | 'Takeaway' | string;
  reservationId?: string;
  guestName?: string;
  kotPrinted?: boolean;
  paymentStatus?: 'Unpaid' | 'Paid' | 'Folio';
  paymentMode?: string;
  items: {
    menuItemId: string;
    quantity: number;
    notes?: string;
  }[];
}

export interface UpdatePosOrderPayload {
  id: string;
  status?: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Completed' | 'Cancelled';
  paymentStatus?: string;
  paymentMode?: string;
  kotPrinted?: boolean;
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const response = await apiClient<{ menuItems: MenuItem[] }>('/api/menu');
  return response.menuItems || [];
}

export async function fetchPosOrders(filters: { status?: string; source?: string } = {}): Promise<PosOrder[]> {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.source) params.append('source', filters.source);
  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await apiClient<{ orders: PosOrder[] }>(`/api/pos/orders${queryStr}`);
  return response.orders || [];
}

export async function createPosOrderApi(payload: CreatePosOrderPayload): Promise<PosOrder> {
  const response = await apiClient<{ order: PosOrder }>('/api/pos/orders', {
    method: 'POST',
    body: payload,
  });
  return response.order;
}

export async function updatePosOrderStatusApi(payload: UpdatePosOrderPayload): Promise<PosOrder> {
  const response = await apiClient<{ order: PosOrder }>('/api/pos/orders', {
    method: 'PUT',
    body: payload,
  });
  return response.order;
}
