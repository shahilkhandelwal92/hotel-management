import { apiClient } from './client';
import { MaintenanceAsset, WorkOrder, WorkOrderPart } from './types';

export interface CreateWorkOrderPayload {
  title: string;
  description: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' | string;
  assetId?: string;
  roomId?: string;
  assignedToId?: string;
  lockRoomOutOfOrder?: boolean;
}

export interface UpdateWorkOrderPayload {
  workOrderId: string;
  status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'VERIFIED' | 'CLOSED' | string;
  assignedToId?: string;
}

export interface AddPartPayload {
  workOrderId: string;
  partName: string;
  quantity: number;
  unitCost: number;
}

export interface CompleteWorkOrderPayload {
  workOrderId: string;
  resolutionNotes?: string;
}

export interface CreateAssetPayload {
  name: string;
  assetTag: string;
  category?: string;
  location?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
}

export interface MaintenanceDataResponse {
  assets: MaintenanceAsset[];
  workOrders: WorkOrder[];
}

export async function fetchMaintenanceData(): Promise<MaintenanceDataResponse> {
  const response = await apiClient<MaintenanceDataResponse>('/api/maintenance/assets');
  return {
    assets: response.assets || [],
    workOrders: response.workOrders || [],
  };
}

export async function createWorkOrderApi(payload: CreateWorkOrderPayload): Promise<WorkOrder> {
  const response = await apiClient<{ workOrder: WorkOrder }>('/api/maintenance/assets', {
    method: 'POST',
    body: {
      action: 'CREATE_WORK_ORDER',
      ...payload,
    },
  });
  return response.workOrder;
}

export async function updateWorkOrderStatusApi(payload: UpdateWorkOrderPayload): Promise<WorkOrder> {
  const response = await apiClient<{ workOrder: WorkOrder }>('/api/maintenance/assets', {
    method: 'POST',
    body: {
      action: 'UPDATE_WORK_ORDER',
      ...payload,
    },
  });
  return response.workOrder;
}

export async function addWorkOrderPartApi(payload: AddPartPayload): Promise<WorkOrderPart> {
  const response = await apiClient<{ part: WorkOrderPart }>('/api/maintenance/assets', {
    method: 'POST',
    body: {
      action: 'ADD_PART',
      ...payload,
    },
  });
  return response.part;
}

export async function completeWorkOrderApi(payload: CompleteWorkOrderPayload): Promise<WorkOrder> {
  const response = await apiClient<{ workOrder: WorkOrder }>('/api/maintenance/assets', {
    method: 'POST',
    body: {
      action: 'COMPLETE_WORK_ORDER',
      ...payload,
    },
  });
  return response.workOrder;
}

export async function createMaintenanceAssetApi(payload: CreateAssetPayload): Promise<MaintenanceAsset> {
  const response = await apiClient<{ asset: MaintenanceAsset }>('/api/maintenance/assets', {
    method: 'POST',
    body: payload,
  });
  return response.asset;
}
