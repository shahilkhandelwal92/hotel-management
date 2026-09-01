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

export interface CashDrawerTransaction {
  id: string;
  shiftId: string;
  type: 'FOLIO_PAYMENT' | 'CASH_DROP' | 'PAID_OUT' | 'REFUND' | 'SALE' | string;
  amount: number | string;
  notes?: string | null;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  hotelId: string;
  userId: string;
  terminalName?: string | null;
  openedAt: string;
  closedAt?: string | null;
  openingFloat: number | string;
  cashPayments: number | string;
  cashSales: number | string;
  refunds: number | string;
  paidOuts: number | string;
  cashDrops: number | string;
  expectedCash: number | string;
  actualCash?: number | string | null;
  variance?: number | string | null;
  status: 'OPEN' | 'CLOSED';
  notes?: string | null;
  transactions?: CashDrawerTransaction[];
}

export interface MenuItem {
  id: string;
  hotelId: string;
  name: string;
  category: string;
  price: number | string;
  isVeg: boolean;
  spiceLevel?: string;
  recipeIngredients?: {
    id: string;
    quantity: number;
    stockItem?: {
      id: string;
      itemName: string;
      unit: string;
      quantity: number;
    };
  }[];
}

export interface PosOrderItem {
  id?: string;
  orderId?: string;
  menuItemId: string;
  quantity: number;
  notes?: string | null;
  unitPrice: number | string;
  lineTotal: number | string;
  menuItem?: MenuItem;
}

export interface PosOrder {
  id: string;
  hotelId: string;
  tableNumber?: string | null;
  orderSource: string;
  reservationId?: string | null;
  guestName?: string | null;
  kotPrinted: boolean;
  subtotal: number | string;
  gstAmount: number | string;
  grandTotal: number | string;
  paymentStatus: string;
  paymentMode?: string | null;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Delivered' | 'Completed' | 'Cancelled';
  createdAt: string;
  completedAt?: string | null;
  items: PosOrderItem[];
}

export interface GroceryStockItem {
  id: string;
  hotelId: string;
  itemName: string;
  unit: string;
  quantity: number;
  minAlert: number;
}

export interface WorkOrderPart {
  id: string;
  workOrderId: string;
  partName: string;
  quantity: number;
  unitCost: number | string;
  totalCost: number | string;
  createdAt: string;
}

export interface PreventiveMaintenanceSchedule {
  id: string;
  assetId: string;
  hotelId: string;
  title: string;
  frequency: string;
  lastRunDate?: string | null;
  nextRunDate: string;
  assignedRole: string;
  isActive: boolean;
}

export interface MaintenanceAsset {
  id: string;
  hotelId: string;
  name: string;
  code: string;
  category: string;
  location: string;
  serialNumber?: string | null;
  modelNumber?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  status: 'OPERATIONAL' | 'UNDER_MAINTENANCE' | 'BREAKDOWN' | 'RETIRED' | string;
  workOrders?: WorkOrder[];
  schedules?: PreventiveMaintenanceSchedule[];
}

export interface WorkOrder {
  id: string;
  hotelId: string;
  assetId?: string | null;
  roomId?: string | null;
  workOrderNumber: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' | string;
  category: 'CORRECTIVE' | 'PREVENTIVE' | 'GUEST_REPORTED' | string;
  status: 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'VERIFIED' | 'CLOSED' | string;
  assignedTo?: string | null;
  reportedBy: string;
  startedAt?: string | null;
  completedAt?: string | null;
  costEstimate?: number | string | null;
  actualCost?: number | string | null;
  lockRoomOutOfOrder?: boolean;
  createdAt: string;
  asset?: MaintenanceAsset | null;
  partsUsed?: WorkOrderPart[];
}

export interface InventoryStore {
  id: string;
  hotelId: string;
  name: string;
  code: string;
  location?: string | null;
  storekeeperId?: string | null;
}

export interface StockTransfer {
  id: string;
  hotelId: string;
  transferNumber: string;
  sourceStoreId: string;
  sourceStore?: InventoryStore;
  destStoreId: string;
  destStore?: InventoryStore;
  itemName: string;
  quantity: number | string;
  unit: string;
  status: 'REQUESTED' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | string;
  requestedBy: string;
  receivedBy?: string | null;
  createdAt: string;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  requiredPermission?: string;
  status?: number;
}
