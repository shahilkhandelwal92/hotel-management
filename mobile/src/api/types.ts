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

export interface RoomItem {
  id: string;
  hotelId: string;
  number: string;
  type: string;
  price: number | string;
  floor: number;
  status: 'Vacant' | 'Occupied' | 'Dirty' | 'Cleaning' | 'Inspected' | 'Maintenance' | 'Reserved' | string;
  amenities?: string | null;
}

export interface Reservation {
  id: string;
  hotelId: string;
  bookingRef: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone: string;
  guestAddress?: string | null;
  guestCity?: string | null;
  guestState?: string | null;
  guestGstin?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  bookingType?: string | null;
  ratePlan?: string | null;
  ratePlanId?: string | null;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  actualCheckIn?: string | null;
  actualCheckOut?: string | null;
  roomId?: string | null;
  status: 'Confirmed' | 'CheckedIn' | 'CheckedOut' | 'Cancelled' | 'NoShow' | string;
  totalAmount: number | string;
  advanceDeposit: number | string;
  balanceDue: number | string;
  taxAmount?: number | string;
  discountAmount?: number | string;
  includesBreakfast?: boolean;
  includesDinner?: boolean;
  specialRequests?: string | null;
  room?: RoomItem | null;
  guestProfile?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  } | null;
  folios?: {
    id: string;
    balance: number | string;
    status: string;
  }[];
}

export interface FolioTransactionItem {
  id: string;
  folioId: string;
  type: 'Charge' | 'Payment' | 'Refund' | 'Adjustment' | 'Transfer' | string;
  description: string;
  amount: number | string;
  referenceId?: string | null;
  postedById?: string | null;
  postedAt: string;
  windowId?: string | null;
}

export interface FolioWindowItem {
  id: string;
  folioId: string;
  windowNumber: number;
  name: string;
  payerType: string;
  payerId?: string | null;
  balance: number | string;
  transactions?: FolioTransactionItem[];
}

export interface FolioItem {
  id: string;
  hotelId: string;
  reservationId: string;
  folioType: string;
  status: 'Open' | 'Closed' | 'Transferred' | string;
  balance: number | string;
  transactions: FolioTransactionItem[];
  reservation?: {
    bookingRef: string;
    guestName: string;
    status: string;
    checkIn?: string;
    checkOut?: string;
  };
  windows?: FolioWindowItem[];
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  requiredPermission?: string;
  status?: number;
}
