import { apiClient } from './client';
import { InventoryStore, StockTransfer } from './types';

export interface CreateTransferPayload {
  transferNumber: string;
  sourceStoreId: string;
  destStoreId: string;
  itemName: string;
  quantity: number;
  unit?: string;
}

export interface CreateStorePayload {
  name: string;
  code: string;
  location?: string;
}

export interface StoresAndTransfersResponse {
  transfers: StockTransfer[];
  stores: InventoryStore[];
}

export async function fetchStoresAndTransfers(): Promise<StoresAndTransfersResponse> {
  const response = await apiClient<StoresAndTransfersResponse>('/api/stores/transfers');
  return {
    transfers: response.transfers || [],
    stores: response.stores || [],
  };
}

export async function createStoreTransferApi(payload: CreateTransferPayload): Promise<StockTransfer> {
  const response = await apiClient<{ transfer: StockTransfer }>('/api/stores/transfers', {
    method: 'POST',
    body: payload,
  });
  return response.transfer;
}

export async function issueStoreTransferApi(transferId: string): Promise<StockTransfer> {
  const response = await apiClient<{ transfer: StockTransfer }>('/api/stores/transfers', {
    method: 'POST',
    body: {
      action: 'ISSUE',
      transferId,
    },
  });
  return response.transfer;
}

export async function receiveStoreTransferApi(transferId: string): Promise<StockTransfer> {
  const response = await apiClient<{ transfer: StockTransfer }>('/api/stores/transfers', {
    method: 'POST',
    body: {
      action: 'RECEIVE',
      transferId,
    },
  });
  return response.transfer;
}

export async function createInventoryStoreApi(payload: CreateStorePayload): Promise<InventoryStore> {
  const response = await apiClient<{ store: InventoryStore }>('/api/stores/transfers', {
    method: 'POST',
    body: {
      action: 'CREATE_STORE',
      ...payload,
    },
  });
  return response.store;
}
