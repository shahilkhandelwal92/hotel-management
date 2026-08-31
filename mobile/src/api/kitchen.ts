import { apiClient } from './client';
import { GroceryStockItem, PosOrder } from './types';
import { fetchPosOrders } from './pos';

export async function fetchKitchenStock(): Promise<GroceryStockItem[]> {
  const response = await apiClient<{ stock: GroceryStockItem[] }>('/api/kitchen/stock');
  return response.stock || [];
}

export async function updateKitchenStockApi(payload: { id: string; quantity: number; minAlert?: number; itemName?: string; unit?: string }): Promise<GroceryStockItem> {
  const response = await apiClient<{ stockItem: GroceryStockItem }>('/api/kitchen/stock', {
    method: 'PUT',
    body: payload,
  });
  return response.stockItem;
}

export async function fetchActiveKdsOrders(): Promise<PosOrder[]> {
  const orders = await fetchPosOrders();
  // Active kitchen queue orders are Pending, Preparing, or Ready
  return orders.filter((o) => ['Pending', 'Preparing', 'Ready'].includes(o.status));
}
