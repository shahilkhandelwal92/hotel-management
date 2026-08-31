import { apiClient } from './client';
import { FolioItem, FolioTransactionItem, FolioWindowItem } from './types';

export interface PostTransactionPayload {
  folioId: string;
  type: 'Charge' | 'Payment' | 'Refund' | 'Adjustment';
  description: string;
  amount: number;
  referenceId?: string;
}

export interface CreateWindowPayload {
  folioId: string;
  windowNumber: number;
  name: string;
  payerType: string;
  payerId?: string;
}

export interface TransferWindowChargePayload {
  folioId: string;
  sourceWindowId: string;
  targetWindowId: string;
  amount: number;
  reason?: string;
}

export async function fetchFoliosByReservation(reservationId: string): Promise<FolioItem[]> {
  const response = await apiClient<{ folios: FolioItem[] }>(`/api/folio?reservationId=${reservationId}`);
  return response.folios || [];
}

export async function postFolioTransaction(payload: PostTransactionPayload): Promise<{ transaction: FolioTransactionItem; folio: FolioItem }> {
  return await apiClient('/api/folio', {
    method: 'POST',
    body: {
      mode: 'post_transaction',
      ...payload,
    },
  });
}

export async function closeFolio(folioId: string): Promise<{ folio: FolioItem }> {
  return await apiClient('/api/folio', {
    method: 'PUT',
    body: {
      id: folioId,
      status: 'Closed',
    },
  });
}

export async function fetchSplitFolioSummary(folioId: string): Promise<{ folioId: string; windows: FolioWindowItem[]; transactions: FolioTransactionItem[] }> {
  return await apiClient(`/api/folio/split?folioId=${folioId}`);
}

export async function createSplitFolioWindow(payload: CreateWindowPayload) {
  return await apiClient('/api/folio/split', {
    method: 'POST',
    body: {
      action: 'CREATE_WINDOW',
      ...payload,
    },
  });
}

export async function transferSplitFolioCharge(payload: TransferWindowChargePayload) {
  return await apiClient('/api/folio/split', {
    method: 'POST',
    body: {
      action: 'TRANSFER_CHARGE',
      ...payload,
    },
  });
}
