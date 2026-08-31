export interface UserProfile {
  id: string;
  email: string;
  name: string;
  hotelId: string | null;
  roles: { role: { name: string } }[];
  permissions: string[];
  hasMultipleHotels?: boolean;
  hotel?: {
    id: string;
    name: string;
    location?: string;
  } | null;
}

export interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    hotelId: string | null;
  };
  token: string;
}

export interface HousekeepingChecklistItem {
  item: string;
  done: boolean;
}

export interface HousekeepingTask {
  id: string;
  hotelId: string;
  roomId?: string | null;
  roomNumber: string;
  taskType: string;
  priority: string;
  status: 'Pending' | 'InProgress' | 'Completed';
  checklist?: HousekeepingChecklistItem[];
  notes?: string | null;
  assignedToId?: string | null;
  createdAt?: string;
  completedAt?: string | null;
  room?: {
    id: string;
    number: string;
    type: string;
    floor: number;
    status: 'Vacant' | 'Occupied' | 'Dirty' | 'Cleaning' | 'Inspected' | 'Maintenance';
  };
  assignedTo?: {
    id: string;
    name: string;
    email?: string;
  } | null;
}

export interface LostAndFoundItem {
  id: string;
  hotelId: string;
  itemName: string;
  description?: string | null;
  foundLocation?: string | null;
  foundByName?: string | null;
  guestName?: string | null;
  guestContact?: string | null;
  estimatedValue?: number | string;
  status: 'Found' | 'Claimed' | 'Disposed';
  foundDate?: string;
  resolvedAt?: string | null;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  requiredPermission?: string;
  status?: number;
}
