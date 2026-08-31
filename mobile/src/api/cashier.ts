import { apiClient } from './client';
import { CashierShift } from './types';

export interface OpenShiftPayload {
  openingFloat: number;
  terminalName?: string;
  notes?: string;
}

export interface CashierTransactionPayload {
  shiftId: string;
  type: 'PAYMENT' | 'SALE' | 'REFUND' | 'PAID_OUT' | 'DROP';
  amount: number;
  description: string;
}

export interface CloseShiftPayload {
  shiftId: string;
  actualClosingCash: number;
  closingNotes?: string;
}

export async function fetchCashierShifts(): Promise<CashierShift[]> {
  const response = await apiClient<{ shifts: CashierShift[] }>('/api/finance/cashier');
  return response.shifts || [];
}

export async function openCashierShiftApi(payload: OpenShiftPayload): Promise<CashierShift> {
  const response = await apiClient<{ shift: CashierShift }>('/api/finance/cashier', {
    method: 'POST',
    body: payload,
  });
  return response.shift;
}

export async function recordCashierTransactionApi(payload: CashierTransactionPayload): Promise<CashierShift> {
  const response = await apiClient<{ shift: CashierShift }>('/api/finance/cashier', {
    method: 'POST',
    body: {
      action: 'LOG_TXN',
      ...payload,
    },
  });
  return response.shift;
}

export async function closeCashierShiftApi(payload: CloseShiftPayload): Promise<CashierShift> {
  const response = await apiClient<{ shift: CashierShift }>('/api/finance/cashier', {
    method: 'POST',
    body: {
      action: 'CLOSE',
      ...payload,
    },
  });
  return response.shift;
}
