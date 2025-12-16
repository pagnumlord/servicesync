// Enhanced Constants for ServiceSync - New Status and Type Colors
// File: frontend/servicesync-frontend/src/utils/constants.ts

// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'http://localhost:5000';

// NEW STATUS COLORS - Based on your requirements
export const STATUS_COLORS = {
  // Basic Statuses
  'Open': '#6B7280',                    // Gray - New Unassigned Work Order
  'Unassigned': '#6B7280',             // Gray - New Unassigned Work Order
  'Assigned': '#4B5563',               // Dark Gray - Assigned Work Order
  'In Progress': '#22C55E',            // Green - Tech On Site (Dark Green)
  'Suspended': '#DC2626',              // Dark Red - Credit Hold
  'Complete': '#1E40AF',               // Dark Blue
  'Completed': '#1E40AF',              // Dark Blue (alias)
  
  // Queue-based Statuses
  'Parts Ordered': '#A855F7',          // Purple - Parts Ordered
  'Ready to Schedule': '#EAB308',      // Yellow - Ready to Schedule
  'Tech On The Way': '#10B981',        // Green - Tech On The Way
  'Tech On Site': '#059669',           // Dark Green - Tech On Site
  'Credit Hold': '#991B1B',            // Dark Red - Credit Hold
  
  // Work Order Types
  'work_order': '#6B7280',             // Gray - Standard Work Order
  'quote': '#EA580C',                  // Strong Orange - Quoted Job
  'estimate': '#F59E0B',               // Orange - Estimate
  'invoice': '#1E40AF',                // Blue - Invoice
  
  // Special Statuses
  'Time Off': '#F87171',               // Red/Pink
  'Call Cancelled': '#991B1B'          // Dark Red
} as const;

// WORK ORDER TYPES
export const WORK_ORDER_TYPES = {
  'work_order': {
    label: 'Work Order',
    color: '#6B7280',
    description: 'Standard service work order'
  },
  'quote': {
    label: 'Quote',
    color: '#EA580C', // Strong Orange
    description: 'Quoted job requiring approval'
  },
  'estimate': {
    label: 'Estimate',
    color: '#F59E0B',
    description: 'Estimate for potential work'
  },
  'invoice': {
    label: 'Invoice',
    color: '#1E40AF',
    description: 'Completed work ready for billing'
  }
} as const;

// Zone Colors (unchanged)
export const ZONE_COLORS = {
  'A': '#ef4444', // Red
  'B': '#f97316', // Orange  
  'C': '#eab308', // Yellow
  'D': '#22c55e', // Green
  'E': '#3b82f6', // Blue
  'F': '#a855f7'  // Purple
} as const;

// Priority Colors (unchanged)
export const PRIORITY_COLORS = {
  'Emergency': '#dc2626',
  'High': '#ea580c',
  'Normal': '#059669',
  'Low': '#0891b2'
} as const;

// SIMPLIFIED TIME SLOTS - Only First AM + Unscheduled
export const TIME_SLOTS = {
  'First AM': {
    label: 'FIRST AM (8:30 departure)',
    color: '#FEF3C7',
    borderColor: '#F59E0B',
    scheduled: true
  },
  'Unscheduled': {
    label: 'Unscheduled',
    color: '#F3F4F6',
    borderColor: '#9CA3AF',
    scheduled: false
  }
} as const;

// QUEUE COLORS - Match your database setup
export const QUEUE_COLORS = {
  'Parts Ordered': '#A855F7',          // Purple
  'Ready to Schedule': '#EAB308',      // Yellow
  'Invoice Review': '#10b981',         // Green
  'Needs Return': '#f59e0b',           // Orange
  'Quality Review': '#8b5cf6'          // Light Purple
} as const;

// Default Values
export const DEFAULT_PAGINATION = {
  pageSize: 50,
  pageSizeOptions: [25, 50, 100, 200]
} as const;

// Date/Time Formats
export const DATE_FORMATS = {
  display: 'MMM DD, YYYY',
  input: 'YYYY-MM-DD',
  datetime: 'MMM DD, YYYY h:mm A',
  time: 'h:mm A'
} as const;

// Enhanced Utility Functions
export const getStatusColor = (status: string, workOrderType?: string): string => {
  // First check if it's a work order type
  if (workOrderType && WORK_ORDER_TYPES[workOrderType as keyof typeof WORK_ORDER_TYPES]) {
    return WORK_ORDER_TYPES[workOrderType as keyof typeof WORK_ORDER_TYPES].color;
  }
  
  // Then check status
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS['Open'];
};

export const getWorkOrderTypeInfo = (type: string) => {
  return WORK_ORDER_TYPES[type as keyof typeof WORK_ORDER_TYPES] || WORK_ORDER_TYPES.work_order;
};

export const getZoneColor = (zone?: string): string => {
  if (!zone) return '#6b7280'; // Default gray for undefined zones
  return ZONE_COLORS[zone as keyof typeof ZONE_COLORS] || '#6b7280';
};

export const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || '#6b7280';
};

export const getQueueColor = (queue: string): string => {
  return QUEUE_COLORS[queue as keyof typeof QUEUE_COLORS] || '#6b7280';
};

// Helper function to determine if a work order should show type-based coloring
export const shouldUseTypeColoring = (workOrder: any): boolean => {
  return workOrder.wo_type && workOrder.wo_type !== 'work_order';
};

// Helper function to get the display label for a status
export const getStatusDisplayLabel = (status: string, completionQueue?: string): string => {
  if (completionQueue) {
    switch (completionQueue) {
      case 'Parts Ordered': return 'Parts Ordered';
      case 'Ready to Schedule': return 'Ready to Schedule';
      default: return completionQueue;
    }
  }
  return status;
};