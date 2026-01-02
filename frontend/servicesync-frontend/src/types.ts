// ============================================================
// ServiceSync Type Definitions
// File: frontend/servicesync-frontend/src/types.ts
// Updated: Added CustomerContact, CustomerNote interfaces
// ============================================================

export interface WorkOrder {
  id: number;
  wo_number: string;
  customer_name: string;
  customer_id: number;
  service_city: string;
  customer_zone?: string;
  equipment_type?: string;
  equipment_number?: string;
  equipment_id?: number;
  problem_description: string;
  work_performed?: string;
  call_type: string;
  priority: 'Low' | 'Normal' | 'High' | 'Emergency';
  status: string;
  call_rate?: 'RT' | 'OT' | 'Accelerated';
  call_urgency?: 'Default' | 'Urgent' | 'Emergency';  
  customer_po?: string;
  wo_type?: 'work_order' | 'quote' | 'estimate' | 'invoice';
  completion_queue?: string;
  status_notes?: string;
  suspended_at?: string;
  suspension_reason?: string;
  last_status_change_at?: string;
  last_status_change_by?: number;
  last_visit_date?: string;
  next_visit_date?: string;
  completion_date?: string;
  scheduled_date?: string;
  scheduled_time_slot?: string;
  assigned_tech_id?: number;
  tech_first_name?: string;
  tech_last_name?: string;
  total_cost?: number;
  labor_hours?: number;
  total_labor_cost?: number;
  total_parts_cost?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  start_date?: string;
  end_date?: string;
  duration_days?: number;
  is_multi_day?: boolean;
  multi_day?: boolean;
  project_start_date?: string;
  project_end_date?: string;
  estimated_hours?: number;
  project_notes?: string;
  employee_time_off?: boolean;
  project_type?: 'installation' | 'maintenance' | 'time_off' | 'training';
  // Equipment details when joined
  equipment_brand?: string;
  equipment_model?: string;
  equipment_serial?: string;
  equipment_location?: string;
}

export interface Technician {
  id: number;
  tech_id?: number;
  employee_number?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  crew: string;
  skills?: string[];
  van_number?: string;
  current_location?: string;
  work_orders?: WorkOrder[];
  workOrders?: WorkOrder[];
  profile_image?: string;
  is_active?: boolean;
  latitude?: number;
  longitude?: number;
  status?: string;
}

// ============================================================
// NEW: Customer Contact interface
// ============================================================
export interface CustomerContact {
  id: number;
  customer_id: number;
  contact_type: 'primary' | 'billing' | 'site' | 'emergency' | 'general';
  name: string;
  title?: string;
  phone?: string;
  phone_type?: 'mobile' | 'office' | 'home' | 'fax';
  phone_2?: string;
  phone_2_type?: 'mobile' | 'office' | 'home' | 'fax';
  email?: string;
  is_primary: boolean;
  receives_invoices?: boolean;
  receives_wo_updates?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// NEW: Customer Note interface
// ============================================================
export interface CustomerNote {
  id: number;
  customer_id: number;
  note_text: string;
  note_type: 'general' | 'scheduling' | 'billing' | 'warning' | 'internal';
  is_pinned: boolean;
  created_by?: string;
  created_by_user_id?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// UPDATED: Customer interface with new fields
// ============================================================
export interface Customer {
  id: number;
  name: string;
  type?: string;
  customer_number?: string;
  
  // Service Location
  service_address_line1?: string;
  service_address_line2?: string;
  service_city?: string;
  service_state?: string;
  service_zip?: string;
  
  // Billing Location
  billing_same_as_service?: boolean;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_zip?: string;
  
  // Primary Contact (legacy - use contacts array for multiple)
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  
  // Business info
  phone?: string;
  email?: string;
  contact_name?: string;
  zone?: string;
  business_type?: string;
  rate_sheet?: string;
  special_instructions?: string;
  
  // Financial
  balance_due?: number;
  credit_limit?: number;
  billing_preferences?: {
    payment_terms?: string;
    requires_po?: boolean;
    invoice_delivery_method?: string;
  };
  invoice_delivery_method?: string;
  
  // Status
  is_active?: boolean;
  
  // Customer hours (for scheduling)
  customer_hours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };
  
  // Legacy notes field (use customer_notes table for unlimited notes)
  notes?: string;
  
  // Related data (populated when fetching full customer details)
  contacts?: CustomerContact[];
  pinned_notes?: CustomerNote[];
  equipment?: Equipment[];
  work_orders?: WorkOrder[];
  work_orders_loaded?: boolean;
  
  // QuickBooks integration
  quickbooks_customer_id?: string;
  
  // System fields
  account_number?: string;
  created_by_user_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Equipment {
  id: number;
  customer_id?: number;
  equipment_number?: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  install_date?: string;
  warranty_expiry?: string;
  location_description?: string;
  pm_schedule?: string;
  next_pm_date?: string;
  last_service_date?: string;
  is_active?: boolean;
  specifications?: Record<string, any>;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Computed/joined fields
  work_order_count?: number;
  last_work_order?: WorkOrder;
}

export interface AppUser {
  id: number;
  techId: number;
  role: string;
  permissions: string[];
  name: string;
  crew: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'stats' | 'chart' | 'list' | 'map';
  source: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  data?: any;
}

export interface Queue {
  id: number;
  name: string;
  description: string;
  color_code: string;
  display_order: number;
  is_active?: boolean;
  created_at?: string;
}

export interface Assignment {
  id: number;
  date: string;
  technician: string;
  time_slot: string;
  start_time: string;
  priority: string;
  est_hours: number;
  status: string;
  timestamp: string;
}

export interface TimestampEntry {
  id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  changed_by: string;
  changed_at: string;
  notes?: string;
}

// Component Props Interfaces
export interface ICUDispatchBoardProps {
  onSocketStatusChange?: (status: string) => void;
  onWorkOrderSelect?: (workOrder: WorkOrder) => void;
  onOpenWorkOrder?: (workOrder: WorkOrder) => void;
  onNavigateToCustomer?: (customerId: number) => void;
}

export interface CustomerManagementProps {
  onWorkOrderSelect?: (workOrder: WorkOrder) => void;
  onOpenWorkOrder?: (workOrder: WorkOrder) => void;
  initialCustomerId?: number; // For deep-linking to a specific customer
}

export interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedWorkOrder: WorkOrder) => void;
  onNavigateToCustomer?: (customerId: number) => void;
}

export interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workOrder: any) => void;
  technicians: Technician[];
  preSelectedCustomer?: Customer;
}

export interface WorkOrderCardProps {
  workOrder: WorkOrder;
  size?: 'small' | 'medium' | 'large';
  showEquipment?: boolean;
  hideTechName?: boolean;
  onOpenDetails?: (workOrder: WorkOrder) => void;
  onQuickView?: (workOrder: WorkOrder) => void;
  onContextMenu?: (e: React.MouseEvent, workOrder: WorkOrder) => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  workOrder: WorkOrder;
  onClose: () => void;
  onAction: (action: string, workOrder: WorkOrder) => void;
}

export interface QueueSelectionModalProps {
  isOpen: boolean;
  workOrder: WorkOrder;
  queues: Queue[];
  onClose: () => void;
  onConfirm: (queueName: string, notes?: string) => void;
  onSelectQueue?: (queueName: string, notes?: string) => void;
}

// ============================================================
// NEW: Customer Header Props
// ============================================================
export interface CustomerHeaderProps {
  customer: Customer;
  contacts?: CustomerContact[];
  pinnedNotes?: CustomerNote[];
  onEditCustomer?: () => void;
  onAddNote?: () => void;
  onEditContact?: (contact: CustomerContact) => void;
  onCreateWorkOrder?: () => void;
}

// ============================================================
// NEW: Customer Tab Props
// ============================================================
export interface CustomerWorkOrdersTableProps {
  customer: Customer;
  workOrders: WorkOrder[];
  loading?: boolean;
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
  onCreateWorkOrder?: () => void;
  onRefresh?: () => void;
}

export interface CustomerContactsTabProps {
  customer: Customer;
  contacts: CustomerContact[];
  onAddContact?: () => void;
  onEditContact?: (contact: CustomerContact) => void;
  onDeleteContact?: (contact: CustomerContact) => void;
  onRefresh?: () => void;
}

export interface CustomerNotesTabProps {
  customer: Customer;
  notes: CustomerNote[];
  onAddNote?: () => void;
  onEditNote?: (note: CustomerNote) => void;
  onDeleteNote?: (note: CustomerNote) => void;
  onTogglePin?: (note: CustomerNote) => void;
  onRefresh?: () => void;
}

export interface CustomerEquipmentTabProps {
  customer: Customer;
  equipment: Equipment[];
  onAddEquipment?: () => void;
  onEditEquipment?: (equipment: Equipment) => void;
  onViewWorkOrders?: (equipment: Equipment) => void;
  onRefresh?: () => void;
}

export type ViewMode = 'board' | 'calendar';

// Utility Types
export type WorkOrderStatus = 'Open' | 'Assigned' | 'In Progress' | 'Suspended' | 'Complete' | 'Completed' | 'Cancelled' | 'Deleted';
export type CallType = 'RT' | 'OT' | 'Emergency';
export type Priority = 'Low' | 'Normal' | 'High' | 'Emergency';
export type Zone = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type WorkOrderType = 'work_order' | 'quote' | 'estimate' | 'invoice';
export type ContactType = 'primary' | 'billing' | 'site' | 'emergency' | 'general';
export type NoteType = 'general' | 'scheduling' | 'billing' | 'warning' | 'internal';
export type PhoneType = 'mobile' | 'office' | 'home' | 'fax';

// API Response Types
export interface DispatchBoardData {
  technicians: Technician[];
  unassigned: WorkOrder[];
  partsOrdered: WorkOrder[];
  readyToSchedule: WorkOrder[];
  date: string;
}

export interface DashboardStats {
  total_work_orders: number;
  in_progress: number;
  high_priority: number;
  overtime_calls: number;
  completed_today: number;
  revenue_today: number;
  avg_response_time: string;
}

export interface WorkOrderStatusHistory {
  id: number;
  work_order_id: number;
  old_status: string;
  new_status: string;
  changed_by: number;
  changed_at: string;
  notes?: string;
  queue_assigned?: string;
}

export interface CalendarViewProps {
  workOrders: WorkOrder[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onWorkOrderSelect?: (workOrder: WorkOrder) => void;
  onWorkOrderMove?: (workOrder: WorkOrder, techId: number, timeSlot: string) => void;
}

export interface WebSocketEvents {
  workOrderUpdate: (data: { action: string; workOrder: WorkOrder; timestamp: Date }) => void;
  assignedWorkOrderUpdate: (data: { action: string; workOrder: WorkOrder; timestamp: Date }) => void;
  techLocationUpdate: (data: { techId: number; location: { lat: number; lng: number } }) => void;
  zoneUpdate: (data: { zone: string; updates: any }) => void;
}

export interface DraggedWorkOrder {
  workOrder: WorkOrder;
  sourceType: 'unassigned' | 'ready_to_schedule' | 'parts_ordered' | 'technician';
  sourceId?: number;
  sourceTimeSlot?: string;
}

export interface CustomerWorkOrdersResponse {
  customer_id: number;
  work_orders: WorkOrder[];
  total_count: number;
  filters_applied: {
    status: string;
    sort: string;
    limit: number;
  };
}

export interface CustomerWorkOrdersFilters {
  status?: 'Open' | 'Assigned' | 'In Progress' | 'Complete' | 'Suspended' | 'all';
  sort?: 'recent' | 'oldest' | 'status' | 'priority';
  limit?: number;
}

// ============================================================
// NEW: API Response types for customer details
// ============================================================
export interface CustomerDetailsResponse {
  customer: Customer;
  contacts: CustomerContact[];
  pinned_notes: CustomerNote[];
  equipment_count: number;
  work_order_count: number;
  open_work_orders: number;
}

export interface CustomerContactsResponse {
  customer_id: number;
  contacts: CustomerContact[];
  total_count: number;
}

export interface CustomerNotesResponse {
  customer_id: number;
  notes: CustomerNote[];
  total_count: number;
  pinned_count: number;
}

export interface CustomerEquipmentResponse {
  customer_id: number;
  equipment: Equipment[];
  total_count: number;
}