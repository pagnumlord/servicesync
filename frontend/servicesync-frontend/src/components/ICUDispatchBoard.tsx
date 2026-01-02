import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Users, MapPin, RotateCcw, Grid, CalendarDays, Plus, AlertCircle, CheckCircle, Pause, Play } from 'lucide-react';
import { WorkOrder, Technician, Queue } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';
import WorkOrderCard from './WorkOrderCard';
import QueueSelectionModal from './QueueSelectionModal';
import CalendarView from './CalendarView';
import { getStatusColor, getQueueColor, shouldUseTypeColoring } from '../utils/constants';
import QuickNotesPreview from './QuickNotesPreview';
import CheckOutModal from './CheckOutModal';
import QuickWorkOrderForm from './QuickWorkOrderForm';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Zone colors matching database
const ZONE_COLORS: Record<string, string> = {
  'A': '#EF4444', // Red - Downtown Lafayette
  'B': '#3B82F6', // Blue - West Lafayette
  'C': '#10B981', // Green - North Lafayette
  'D': '#F59E0B', // Orange - South Lafayette
  'E': '#8B5CF6', // Purple - East Lafayette
  'F': '#EC4899'  // Pink - County
};

// Team/Crew colors for visual differentiation
const CREW_COLORS: Record<string, string> = {
  'Refrigeration': '#06B6D4',     // Cyan - Cool colors for refrigeration/HVAC
  'HVAC': '#06B6D4',              // Cyan - Same as refrigeration
  'Ice Machines': '#06B6D4',      // Cyan - Same as refrigeration
  'Hot Side': '#F97316',          // Orange - Hot colors for plumbing/hot side
  'Plumbing': '#F97316',          // Orange - Same as hot side
  'PM': '#10B981',                // Green - PM/Preventative Maintenance
  'PM Team': '#10B981',           // Green - Same as PM
  'Project': '#8B5CF6',           // Purple - Projects
  'Project Team': '#8B5CF6',      // Purple - Same as projects
  'Training': '#6B7280',          // Gray - Training (not typically on dispatch)
  'Unassigned': '#64748B'         // Slate - Default for unassigned crew
};

// Helper function to get crew color with fallback
function getCrewColor(crew: string | undefined): string {
  if (!crew) return CREW_COLORS['Unassigned'];

  // Try exact match first
  if (CREW_COLORS[crew]) return CREW_COLORS[crew];

  // Try partial matches for flexibility
  const crewLower = crew.toLowerCase();
  if (crewLower.includes('refrigeration') || crewLower.includes('hvac') || crewLower.includes('ice')) {
    return CREW_COLORS['Refrigeration'];
  }
  if (crewLower.includes('hot') || crewLower.includes('plumb')) {
    return CREW_COLORS['Hot Side'];
  }
  if (crewLower.includes('pm') || crewLower.includes('preventative')) {
    return CREW_COLORS['PM'];
  }
  if (crewLower.includes('project')) {
    return CREW_COLORS['Project'];
  }

  // Default fallback
  return CREW_COLORS['Unassigned'];
}

// Point-in-polygon algorithm to detect if a lat/lng is inside a zone
function pointInPolygon(lat: number, lng: number, polygon: Array<{ lat: number; lng: number }>): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect = ((yi > lat) !== (yj > lat))
      && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// Detect which zone a location is in
function detectZone(lat: number | undefined, lng: number | undefined, zones: any[]): string | null {
  if (!lat || !lng || !zones || zones.length === 0) return null;

  for (const zone of zones) {
    if (zone.visible && zone.coordinates && zone.coordinates.length >= 3) {
      if (pointInPolygon(lat, lng, zone.coordinates)) {
        return zone.zone_code || zone.id;
      }
    }
  }

  return null;
}

// Enhanced WorkOrder interface to include date visibility properties
interface EnhancedWorkOrder extends WorkOrder {
  display_status?: string;
  card_style_type?: 'completed' | 'suspended_purple' | 'suspended_original' | 'suspended_return' | 'normal';
  visibility_reason?: 'created' | 'scheduled' | 'suspended_carryover' | 'multi_day_continuation' | 'completed_historical' | 'suspended_return' | 'normal';
  visibility_info?: {
    reason: string;
    is_historical: boolean;
    is_suspended: boolean;
    is_carryover: boolean;
  };
  suspension_reason?: string;
  last_visit_date?: string;
  next_visit_date?: string;
  completion_date?: string;
}

interface ICUDispatchBoardProps {
  onWorkOrderSelect?: (workOrder: WorkOrder) => void;
  onOpenWorkOrder?: (workOrder: WorkOrder) => void;
  onSocketStatusChange?: (status: string) => void;
  onNavigateToCustomer?: (customerId: number) => void;
}

function ICUDispatchBoard({
  onWorkOrderSelect,
  onOpenWorkOrder,
  onSocketStatusChange,
  onNavigateToCustomer
}: ICUDispatchBoardProps) {
  const handleWorkOrderSelect = onWorkOrderSelect || onOpenWorkOrder;
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [infoDisplayMode, setInfoDisplayMode] = useState<'equipment' | 'notes'>('equipment');
  const [displayFormat, setDisplayFormat] = useState<'wo_number' | 'location' | 'call_type'>('wo_number');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [unassignedWorkOrders, setUnassignedWorkOrders] = useState<EnhancedWorkOrder[]>([]);
  const [partsWorkOrders, setPartsWorkOrders] = useState<EnhancedWorkOrder[]>([]);
  const [readyToSchedule, setReadyToSchedule] = useState<EnhancedWorkOrder[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    workOrder: EnhancedWorkOrder;
  } | null>(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [selectedWorkOrderForCompletion, setSelectedWorkOrderForCompletion] = useState<EnhancedWorkOrder | null>(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedWorkOrderForCheckOut, setSelectedWorkOrderForCheckOut] = useState<EnhancedWorkOrder | null>(null);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [draggedWorkOrder, setDraggedWorkOrder] = useState<EnhancedWorkOrder | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [quickPreviewWorkOrder, setQuickPreviewWorkOrder] = useState<WorkOrder | null>(null);
  const [showQuickWorkOrderForm, setShowQuickWorkOrderForm] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<EnhancedWorkOrder | null>(null);

  // TODO: When authentication is implemented, replace showCheckInOut={false} with:
  // showCheckInOut={currentUser.account_type === 'technician'}
  // This will show Check In button only for technician accounts

  // Enhanced WebSocket connection
  const {
    isConnected,
    connectionStatus,
    emit
  } = useWebSocket({
    autoConnect: true,
    events: {
      workOrderUpdate: (data: any) => {
        console.log('📡 Work order update received:', data);
        if (data.affectedDates && data.affectedDates.includes(currentDate.toISOString().split('T')[0])) {
          console.log('📅 Update affects current date, reloading dispatch data');
          loadDispatchData(false);
        } else if (!data.affectedDates) {
          loadDispatchData(false);
        }
      },
      workOrderCreated: (data: any) => {
        console.log('🆕 New work order created via WebSocket, refreshing board');
        loadDispatchData(false);
      }
    }
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && quickPreviewWorkOrder) {
        setQuickPreviewWorkOrder(null);
      }
      if (e.key === 'Enter' && quickPreviewWorkOrder) {
        handleWorkOrderSelect?.(quickPreviewWorkOrder);
        setQuickPreviewWorkOrder(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [quickPreviewWorkOrder, handleWorkOrderSelect]);

  useEffect(() => {
    onSocketStatusChange?.(connectionStatus);
  }, [connectionStatus, onSocketStatusChange]);

  // Load dispatch data
  const loadDispatchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const dateStr = currentDate.toISOString().split('T')[0];
      const response = await fetch(`${API_BASE}/dispatch/board?date=${dateStr}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const enhancedTechnicians = (data.technicians || []).map((tech: any) => ({
        ...tech,
        workOrders: (tech.work_orders || tech.workOrders || []).map((wo: any) => enhanceWorkOrderWithVisibility(wo)),
        work_orders: (tech.work_orders || tech.workOrders || []).map((wo: any) => enhanceWorkOrderWithVisibility(wo))
      }));

      setTechnicians(enhancedTechnicians);
      setUnassignedWorkOrders((data.unassigned || []).map(enhanceWorkOrderWithVisibility));
      setPartsWorkOrders((data.partsOrdered || []).map(enhanceWorkOrderWithVisibility));
      setReadyToSchedule((data.readyToSchedule || []).map(enhanceWorkOrderWithVisibility));

      console.log('📊 Dispatch data loaded:', {
        date: dateStr,
        technicians: enhancedTechnicians.length,
        unassigned: data.unassigned?.length || 0,
        partsOrdered: data.partsOrdered?.length || 0,
        readyToSchedule: data.readyToSchedule?.length || 0
      });

    } catch (error) {
      console.error('⚠️ Error loading dispatch data:', error);
      setError('Failed to load dispatch data');
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    const handleWorkOrderCreated = () => {
      console.log('🔄 Work order created event received, refreshing dispatch board');
      loadDispatchData(false);
    };

    window.addEventListener('workOrderCreated', handleWorkOrderCreated);

    return () => {
      window.removeEventListener('workOrderCreated', handleWorkOrderCreated);
    };
  }, [loadDispatchData]);

  // Load zones on mount for technician zone detection
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const response = await fetch(`${API_BASE}/zones`);
        if (!response.ok) {
          console.warn('Failed to load zones for technician zone detection');
          return;
        }
        const data = await response.json();
        // Convert API format to frontend format
        const zonesWithCoordinates = data.map((zone: any) => ({
          ...zone,
          coordinates: zone.boundary,
          zone_code: zone.zone_code,
          visible: zone.visible_on_map !== false
        }));
        console.log('🗺️ Zones loaded for technician detection:', zonesWithCoordinates.length, 'zones');
        setZones(zonesWithCoordinates);
      } catch (error) {
        console.warn('Error loading zones:', error);
      }
    };

    fetchZones();
  }, []);

  // Cycle through display formats
  const cycleDisplayFormat = () => {
    setDisplayFormat(prev => {
      if (prev === 'wo_number') return 'location';
      if (prev === 'location') return 'call_type';
      return 'wo_number';
    });
  };

  const enhanceWorkOrderWithVisibility = (workOrder: any): EnhancedWorkOrder => {
    return {
      ...workOrder,
      display_status: workOrder.display_status || workOrder.status,
      card_style_type: workOrder.card_style_type || getCardStyleType(workOrder),
      visibility_reason: workOrder.visibility_reason || 'normal',
      visibility_info: workOrder.visibility_info || {
        reason: workOrder.visibility_reason || 'normal',
        is_historical: workOrder.status === 'Complete',
        is_suspended: workOrder.status === 'Suspended',
        is_carryover: workOrder.visibility_reason === 'suspended_carryover'
      }
    };
  };

  const getCardStyleType = (workOrder: any): EnhancedWorkOrder['card_style_type'] => {
    if (workOrder.status === 'Complete') return 'completed';
    if (workOrder.status === 'Suspended') {
      if (workOrder.visibility_reason === 'suspended_carryover') return 'suspended_purple';
      if (workOrder.visibility_reason === 'suspended_return') return 'suspended_return';
      return 'suspended_original';
    }
    return 'normal';
  };

  const loadQueues = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/work-orders/queues`);
      if (response.ok) {
        const data = await response.json();
        setQueues(data);
      }
    } catch (error) {
      console.error('⚠️ Error loading queues:', error);
    }
  }, []);

  useEffect(() => {
    loadDispatchData();
    loadQueues();
  }, [loadDispatchData, loadQueues]);

  const handleCompleteWorkOrder = async (queueName: string, notes?: string) => {
    if (!selectedWorkOrderForCompletion) return;
    try {
      const response = await fetch(`${API_BASE}/work-orders/${selectedWorkOrderForCompletion.id}/complete`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          queue: queueName, 
          notes,
          completion_date: currentDate.toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        console.log('✅ Work order completed');
        emit('workOrderUpdated', {
          ...selectedWorkOrderForCompletion,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
        setShowQueueModal(false);
        setSelectedWorkOrderForCompletion(null);
      }
    } catch (error) {
      console.error('⚠️ Error completing work order:', error);
      alert('Failed to complete work order. Please try again.');
    }
  };

  const handleSuspendWorkOrder = async (workOrder: EnhancedWorkOrder, reason: string) => {
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspension_reason: reason,
          notes: `Suspended on ${currentDate.toISOString().split('T')[0]}: ${reason}`,
          expected_return_date: null
        })
      });

      if (response.ok) {
        console.log('⏸️ Work order suspended');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      }
    } catch (error) {
      console.error('⚠️ Error suspending work order:', error);
      alert('Failed to suspend work order. Please try again.');
    }
  };

  const handleResumeWorkOrder = async (workOrder: EnhancedWorkOrder, techId: number) => {
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/resume`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech_id: techId,
          resume_date: currentDate.toISOString().split('T')[0],
          resume_notes: `Resumed on ${currentDate.toISOString().split('T')[0]}`
        })
      });

      if (response.ok) {
        console.log('▶️ Work order resumed');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      }
    } catch (error) {
      console.error('⚠️ Error resuming work order:', error);
      alert('Failed to resume work order. Please try again.');
    }
  };

  const handleDropToUnassigned = async (workOrder: EnhancedWorkOrder) => {
    if (!workOrder?.id) return;
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/unassign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Moved to unassigned from dispatch board' })
      });

      if (response.ok) {
        console.log('✅ Work order unassigned');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      }
    } catch (error) {
      console.error('⚠️ Error unassigning work order:', error);
      alert('Failed to unassign work order. Please try again.');
    }
  };

  const handleDropToPartsOrdered = async (workOrder: EnhancedWorkOrder) => {
    if (!workOrder?.id) return;
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: 'parts_ordered',
          notes: 'Moved to parts ordered queue'
        })
      });

      if (response.ok) {
        console.log('✅ Work order moved to parts ordered');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      }
    } catch (error) {
      console.error('⚠️ Error moving work order:', error);
      alert('Failed to move work order to parts ordered. Please try again.');
    }
  };

  const handleDropToReadyToSchedule = async (workOrder: EnhancedWorkOrder) => {
    if (!workOrder?.id) return;
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: 'ready_to_schedule',
          notes: 'Moved to ready to schedule'
        })
      });

      if (response.ok) {
        console.log('✅ Work order moved to ready to schedule');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      }
    } catch (error) {
      console.error('⚠️ Error moving work order:', error);
      alert('Failed to move work order. Please try again.');
    }
  };

  const handleDropWorkOrder = async (workOrder: EnhancedWorkOrder, techId: number, timeSlot: string) => {
    if (!workOrder?.id) return;
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tech_id: techId,
          scheduled_time_slot: timeSlot,
          scheduled_date: currentDate.toISOString().split('T')[0]
        })
      });

      if (response.ok) {
        console.log('✅ Work order assigned successfully');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      }
    } catch (error) {
      console.error('⚠️ Error assigning work order:', error);
      alert('Failed to assign work order. Please try again.');
    }
  };

  const handleDrop = async (target: string, workOrder: EnhancedWorkOrder, techId?: number, timeSlot?: string) => {
    setDragOverTarget(null);
    setDraggedWorkOrder(null);

    switch (target) {
      case 'unassigned':
        await handleDropToUnassigned(workOrder);
        break;
      case 'parts-ordered':
        await handleDropToPartsOrdered(workOrder);
        break;
      case 'ready-to-schedule':
        await handleDropToReadyToSchedule(workOrder);
        break;
      case 'technician':
        if (techId && timeSlot) {
          await handleDropWorkOrder(workOrder, techId, timeSlot);
        }
        break;
    }
  };

  const handleContextMenu = (e: React.MouseEvent, workOrder: EnhancedWorkOrder) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, workOrder });
  };

  const handleContextMenuAction = (action: string, workOrder: EnhancedWorkOrder) => {
    setContextMenu(null);
    switch (action) {
      case 'view':
        handleWorkOrderSelect?.(workOrder);
        break;
      case 'customer':
        console.log('🔍 Navigate to customer - Work Order:', workOrder);
        console.log('🔍 Customer ID:', workOrder.customer_id);
        if (workOrder.customer_id && onNavigateToCustomer) {
          onNavigateToCustomer(workOrder.customer_id);
        } else {
          console.warn('⚠️ No customer_id found on work order or no handler');
        }
        break;
      case 'complete':
        setSelectedWorkOrderForCompletion(workOrder);
        setShowQueueModal(true);
        break;
      case 'suspend':
        handleSuspendWorkOrder(workOrder, 'Parts needed');
        break;
      case 'resume':
        if (workOrder.assigned_tech_id) {
          handleResumeWorkOrder(workOrder, workOrder.assigned_tech_id);
        }
        break;
    }
  };

  // Handle tech check-in
  const handleCheckIn = async (workOrder: EnhancedWorkOrder) => {
    if (!workOrder?.id) return;
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: workOrder.assigned_tech_id,
          check_in_time: new Date().toISOString()
        })
      });

      if (response.ok) {
        console.log('✅ Tech checked in successfully');
        emit('workOrderUpdated', {
          ...workOrder,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        loadDispatchData(false);
      } else {
        const error = await response.json();
        alert(`Failed to check in: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('⚠️ Error checking in:', error);
      alert('Failed to check in. Please try again.');
    }
  };

  // Handle tech check-out
  const handleCheckOut = (workOrder: EnhancedWorkOrder) => {
    setSelectedWorkOrderForCheckOut(workOrder);
    setShowCheckOutModal(true);
  };

  // Handle check-out modal submission
  const handleCheckOutSubmit = async (data: {
    status_after_visit: string;
    suspension_reason?: string;
    notes?: string;
  }) => {
    if (!selectedWorkOrderForCheckOut) return;

    try {
      const response = await fetch(`${API_BASE}/work-orders/${selectedWorkOrderForCheckOut.id}/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: selectedWorkOrderForCheckOut.assigned_tech_id,
          status_after_visit: data.status_after_visit,
          suspension_reason: data.suspension_reason,
          notes: data.notes,
          time_slot: selectedWorkOrderForCheckOut.scheduled_time_slot
        })
      });

      if (response.ok) {
        console.log('🏁 Tech checked out successfully');
        emit('workOrderUpdated', {
          ...selectedWorkOrderForCheckOut,
          affectedDates: [currentDate.toISOString().split('T')[0]]
        });
        setShowCheckOutModal(false);
        setSelectedWorkOrderForCheckOut(null);
        loadDispatchData(false);
      } else {
        const error = await response.json();
        alert(`Failed to check out: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('⚠️ Error checking out:', error);
      alert('Failed to check out. Please try again.');
    }
  };

  // Handle quick work order creation
  const handleCreateWorkOrder = async (workOrderData: any) => {
    try {
      const response = await fetch(`${API_BASE}/work-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workOrderData)
      });

      if (response.ok) {
        const newWorkOrder = await response.json();
        console.log('✅ Work order created successfully:', newWorkOrder);

        // Emit socket event for real-time update
        emit('workOrderCreated', {
          ...newWorkOrder,
          affectedDates: [workOrderData.scheduled_date || currentDate.toISOString().split('T')[0]]
        });

        // Reload dispatch data
        loadDispatchData(false);

        alert(`Work order ${newWorkOrder.wo_number || newWorkOrder.work_order_number} created successfully!`);
      } else {
        const error = await response.json();
        alert(`Failed to create work order: ${error.error || 'Unknown error'}`);
        throw new Error(error.error || 'Failed to create work order');
      }
    } catch (error) {
      console.error('⚠️ Error creating work order:', error);
      throw error;
    }
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'calendar') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const isToday = currentDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  const isPast = currentDate < new Date(new Date().toISOString().split('T')[0]);
  const isFuture = currentDate > new Date(new Date().toISOString().split('T')[0]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading dispatch board...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: 'calc(100vh - 140px)', // Reduced from 100vh to account for main app header
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Prevent overall scrolling
    }}>
      {/* COMPACT Header */}
      <div style={{
        backgroundColor: '#374151',
        color: 'white',
        padding: '0.5rem 1rem', // Reduced padding
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #4B5563',
        minHeight: '50px', // Reduced from 60px
        fontSize: '0.975rem' // Slightly smaller text
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
            Enhanced Dispatch Board
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.75rem',
            color: '#D1D5DB'
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10B981' : '#EF4444'
            }} />
            {connectionStatus}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => navigateDate(-1)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.5rem 0.625rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.875rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            ◀
          </button>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            minWidth: '180px',
            textAlign: 'center',
            padding: '0.5rem 0.75rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem'
          }}>
            {currentDate.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </span>
          <button
            onClick={() => navigateDate(1)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '0.5rem 0.625rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '0.875rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            ▶
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              marginLeft: '0.5rem',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
          >
            Today
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {/* Switch Format Button */}
          <button
            onClick={cycleDisplayFormat}
            title={`Current: ${displayFormat === 'wo_number' ? 'WO Number' : displayFormat === 'location' ? 'Location/County' : 'Call Type'}`}
            style={{
              backgroundColor: '#8B5CF6',
              color: 'white',
              border: 'none',
              padding: '0.5rem 0.875rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600',
              marginRight: '0.75rem',
              boxShadow: '0 2px 4px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7C3AED'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8B5CF6'}
          >
            🔄 {displayFormat === 'wo_number' ? 'WO#' : displayFormat === 'location' ? 'County' : 'Type'}
          </button>

          {/* Action Buttons - Only visible when a work order is selected */}
          {selectedWorkOrder && (
            <div style={{
              display: 'flex',
              gap: '0.375rem',
              marginRight: '0.75rem',
              paddingRight: '0.75rem',
              borderRight: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              {/* Complete Button */}
              {selectedWorkOrder.status !== 'Complete' && selectedWorkOrder.status !== 'Completed' && (
                <button
                  onClick={() => {
                    setSelectedWorkOrderForCompletion(selectedWorkOrder);
                    setShowQueueModal(true);
                  }}
                  title="Complete Work Order"
                  style={{
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
                >
                  ✓ Complete
                </button>
              )}

              {/* Suspend Button */}
              {selectedWorkOrder.status !== 'Suspended' && selectedWorkOrder.status !== 'Complete' && selectedWorkOrder.status !== 'Completed' && (
                <button
                  onClick={() => handleSuspendWorkOrder(selectedWorkOrder, 'Suspended from dispatch board')}
                  title="Suspend Work Order"
                  style={{
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#D97706'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F59E0B'}
                >
                  ⏸ Suspend
                </button>
              )}

              {/* Resume Button (for suspended work orders) */}
              {selectedWorkOrder.status === 'Suspended' && selectedWorkOrder.assigned_tech_id && (
                <button
                  onClick={() => handleResumeWorkOrder(selectedWorkOrder, selectedWorkOrder.assigned_tech_id!)}
                  title="Resume Work Order"
                  style={{
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 0.875rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                >
                  ▶ Resume
                </button>
              )}

              {/* Selected WO Info */}
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem'
              }}>
                {selectedWorkOrder.wo_number || `WO-${selectedWorkOrder.id}`}
                <button
                  onClick={() => setSelectedWorkOrder(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0',
                    fontSize: '1rem',
                    lineHeight: '1'
                  }}
                  title="Deselect"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Info display toggle - more compact */}
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            marginRight: '0.75rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
            padding: '0.25rem'
          }}>
            <button
              onClick={() => setInfoDisplayMode('equipment')}
              style={{
                backgroundColor: infoDisplayMode === 'equipment' ? '#10B981' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: infoDisplayMode === 'equipment' ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              🔧 Equipment
            </button>
            <button
              onClick={() => setInfoDisplayMode('notes')}
              style={{
                backgroundColor: infoDisplayMode === 'notes' ? '#10B981' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: infoDisplayMode === 'notes' ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'none'
              }}
            >
              💬 Notes
            </button>
          </div>

          {/* View mode toggle - more compact */}
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '0.5rem',
            padding: '0.25rem'
          }}>
            <button
              onClick={() => setViewMode('board')}
              style={{
                backgroundColor: viewMode === 'board' ? '#3B82F6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'board' ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              📊 Board
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                backgroundColor: viewMode === 'calendar' ? '#3B82F6' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: viewMode === 'calendar' ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              📅 Calendar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          color: '#DC2626',
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Content - Optimized for screen height */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden', 
        backgroundColor: '#F3F4F6',
        minHeight: 0 // Important for flex child scrolling
      }}>
        {viewMode === 'board' ? (
          <>
            {/* ROW NUMBERS COLUMN */}
            <div style={{
              width: '36px',
              backgroundColor: '#F9FAFB',
              borderRight: '2px solid #E5E7EB',
              display: 'flex',
              flexDirection: 'column',
              paddingTop: '0.5rem'
            }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div
                  key={num}
                  style={{
                    height: '120px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9CA3AF',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderBottom: num < 8 ? '1px solid #E5E7EB' : 'none'
                  }}
                >
                  {num}
                </div>
              ))}
            </div>

            {/* COMPACT SIDEBAR - Fixed width, internal scrolling */}
            <div style={{
              width: '260px', // Reduced width
              backgroundColor: '#F3F4F6',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              borderRight: '2px solid #E5E7EB'
            }}>
              {/* Unassigned Section - Compact */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '33%', // Fixed percentage
                padding: '0.75rem 0.75rem 0 0.75rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#1F2937',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.5rem'
                }}>
                  <span>📋 Unassigned ({unassignedWorkOrders.length})</span>
                </div>

                <div
                  style={{
                    flex: 1,
                    border: '2px dashed #CBD5E1',
                    borderRadius: '0.75rem',
                    backgroundColor: 'white',
                    overflow: 'auto',
                    padding: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.02)'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget('unassigned');
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverTarget(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverTarget(null);
                    if (draggedWorkOrder) {
                      handleDrop('unassigned', draggedWorkOrder);
                    }
                  }}
                >
                  {unassignedWorkOrders.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      padding: '1rem 0'
                    }}>
                      No unassigned
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {unassignedWorkOrders.map((workOrder) => (
                        <div
                          key={workOrder.id}
                          draggable
                          onDragStart={() => setDraggedWorkOrder(workOrder)}
                          onDragEnd={() => setDraggedWorkOrder(null)}
                          onContextMenu={(e) => handleContextMenu(e, workOrder)}
                        >
                          <WorkOrderCard
                            workOrder={workOrder}
                            showEquipment={infoDisplayMode === 'equipment'}
                            displayFormat={displayFormat}
                            hideTechName={false}
                            onQuickView={(wo) => {
                              setSelectedWorkOrder(wo);
                              setQuickPreviewWorkOrder(wo);
                            }}
                            onOpenDetails={handleWorkOrderSelect}
                            onContextMenu={(e) => handleContextMenu(e, workOrder)}
                            onCheckIn={handleCheckIn}
                            onCheckOut={handleCheckOut}
                            showCheckInOut={false} // TODO: Enable after authentication
                            isSelected={selectedWorkOrder?.id === workOrder.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Parts Ordered Section */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '30%', // Fixed percentage
                padding: '0 0.75rem',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#1F2937',
                  marginBottom: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.5rem'
                }}>
                  ⚙️ Parts Ordered ({partsWorkOrders.length})
                </div>

                <div
                  style={{
                    flex: 1,
                    border: '2px dashed #A78BFA',
                    borderRadius: '0.75rem',
                    backgroundColor: 'white',
                    overflow: 'auto',
                    padding: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.02)'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget('parts-ordered');
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverTarget(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverTarget(null);
                    if (draggedWorkOrder) {
                      handleDrop('parts-ordered', draggedWorkOrder);
                    }
                  }}
                >
                  {partsWorkOrders.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      padding: '1rem 0'
                    }}>
                      No parts on order
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {partsWorkOrders.map((workOrder) => (
                        <div
                          key={workOrder.id}
                          draggable
                          onDragStart={() => setDraggedWorkOrder(workOrder)}
                          onDragEnd={() => setDraggedWorkOrder(null)}
                          onContextMenu={(e) => handleContextMenu(e, workOrder)}
                        >
                          <WorkOrderCard
                            workOrder={workOrder}
                            showEquipment={infoDisplayMode === 'equipment'}
                            displayFormat={displayFormat}
                            hideTechName={true}
                            onQuickView={(wo) => {
                              setSelectedWorkOrder(wo);
                              setQuickPreviewWorkOrder(wo);
                            }}
                            onOpenDetails={handleWorkOrderSelect}
                            onContextMenu={(e) => handleContextMenu(e, workOrder)}
                            onCheckIn={handleCheckIn}
                            onCheckOut={handleCheckOut}
                            showCheckInOut={false} // TODO: Enable after authentication
                            isSelected={selectedWorkOrder?.id === workOrder.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ready to Schedule Section */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1, // Takes remaining space
                padding: '0 0.75rem 0.75rem 0.75rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  color: '#1F2937',
                  marginBottom: '0.5rem',
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.5rem'
                }}>
                  ✓ Ready to Schedule ({readyToSchedule.length})
                </div>

                <div
                  style={{
                    flex: 1,
                    border: '2px dashed #FBBF24',
                    borderRadius: '0.75rem',
                    backgroundColor: 'white',
                    overflow: 'auto',
                    padding: '0.5rem',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), inset 0 1px 2px rgba(0, 0, 0, 0.02)'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverTarget('ready-to-schedule');
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverTarget(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverTarget(null);
                    if (draggedWorkOrder) {
                      handleDrop('ready-to-schedule', draggedWorkOrder);
                    }
                  }}
                >
                  {readyToSchedule.length === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '0.75rem',
                      fontStyle: 'italic',
                      padding: '1rem 0'
                    }}>
                      No work orders ready
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {readyToSchedule.map((workOrder) => (
                        <div
                          key={workOrder.id}
                          draggable
                          onDragStart={() => setDraggedWorkOrder(workOrder)}
                          onDragEnd={() => setDraggedWorkOrder(null)}
                          onContextMenu={(e) => handleContextMenu(e, workOrder)}
                        >
                          <WorkOrderCard
                            workOrder={workOrder}
                            showEquipment={infoDisplayMode === 'equipment'}
                            displayFormat={displayFormat}
                            hideTechName={true}
                            onQuickView={(wo) => {
                              setSelectedWorkOrder(wo);
                              setQuickPreviewWorkOrder(wo);
                            }}
                            onOpenDetails={handleWorkOrderSelect}
                            onContextMenu={(e) => handleContextMenu(e, workOrder)}
                            onCheckIn={handleCheckIn}
                            onCheckOut={handleCheckOut}
                            showCheckInOut={false} // TODO: Enable after authentication
                            isSelected={selectedWorkOrder?.id === workOrder.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Technician Columns - Optimized scrolling */}
            <div style={{
              flex: 1,
              display: 'flex',
              overflow: 'auto',
              backgroundColor: '#F3F4F6',
              padding: '0.5rem 0.5rem 0 0',
              gap: '0.5rem'
            }}>
              {technicians.map((technician) => (
                <TechnicianColumn
                  key={technician.id}
                  technician={technician}
                  zones={zones}
                  onDrop={handleDrop}
                  onWorkOrderContextMenu={handleContextMenu}
                  onWorkOrderSelect={handleWorkOrderSelect}
                  draggedWorkOrder={draggedWorkOrder}
                  setDraggedWorkOrder={setDraggedWorkOrder}
                  dragOverTarget={dragOverTarget}
                  setDragOverTarget={setDragOverTarget}
                  infoDisplayMode={infoDisplayMode}
                  displayFormat={displayFormat}
                  selectedWorkOrder={selectedWorkOrder}
                  setSelectedWorkOrder={setSelectedWorkOrder}
                  setQuickPreviewWorkOrder={setQuickPreviewWorkOrder}
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                />
              ))}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, width: '100%' }}>
            <CalendarView
              workOrders={[
                ...unassignedWorkOrders,
                ...readyToSchedule,
                ...partsWorkOrders,
                ...technicians.flatMap(tech => tech.workOrders || tech.work_orders || [])
              ]}
              currentDate={currentDate}
              onDateChange={setCurrentDate}
              onWorkOrderSelect={handleWorkOrderSelect}
              onWorkOrderMove={handleDropWorkOrder}
            />
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '0.375rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            minWidth: '180px'
          }}
        >
          <div style={{ padding: '0.375rem' }}>
            <button
              onClick={() => handleContextMenuAction('view', contextMenu.workOrder)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              View Details
            </button>

            <button
              onClick={() => handleContextMenuAction('customer', contextMenu.workOrder)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Customer Page
            </button>

            {contextMenu.workOrder.status !== 'Complete' && contextMenu.workOrder.status !== 'Suspended' && (
              <>
                <button
                  onClick={() => handleContextMenuAction('complete', contextMenu.workOrder)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Complete
                </button>
                <button
                  onClick={() => handleContextMenuAction('suspend', contextMenu.workOrder)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Suspend
                </button>
              </>
            )}
            
            {contextMenu.workOrder.status === 'Suspended' && (
              <button
                onClick={() => handleContextMenuAction('resume', contextMenu.workOrder)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Resume
              </button>
            )}
          </div>
        </div>
      )}

      {showQueueModal && selectedWorkOrderForCompletion && (
        <QueueSelectionModal
          isOpen={showQueueModal}
          onClose={() => {
            setShowQueueModal(false);
            setSelectedWorkOrderForCompletion(null);
          }}
          onConfirm={handleCompleteWorkOrder}
          queues={queues}
          workOrder={selectedWorkOrderForCompletion}
        />
      )}

      {/* Check-Out Modal */}
      {showCheckOutModal && selectedWorkOrderForCheckOut && (
        <CheckOutModal
          workOrder={selectedWorkOrderForCheckOut}
          onClose={() => {
            setShowCheckOutModal(false);
            setSelectedWorkOrderForCheckOut(null);
          }}
          onCheckOut={handleCheckOutSubmit}
        />
      )}

      {/* Quick Notes Preview */}
      {quickPreviewWorkOrder && (
        <QuickNotesPreview
          workOrder={quickPreviewWorkOrder}
          onClose={() => setQuickPreviewWorkOrder(null)}
          onOpenFull={(wo) => {
            setQuickPreviewWorkOrder(null);
            handleWorkOrderSelect?.(wo);
          }}
        />
      )}

      {/* Quick Work Order Form */}
      <QuickWorkOrderForm
        isOpen={showQuickWorkOrderForm}
        onClose={() => setShowQuickWorkOrderForm(false)}
        onSubmit={handleCreateWorkOrder}
        technicians={technicians}
        preSelectedDate={currentDate.toISOString().split('T')[0]}
      />
    </div>
  );
}

// OPTIMIZED Technician Column Component
interface TechnicianColumnProps {
  technician: Technician;
  zones: any[];
  onDrop: (target: string, workOrder: EnhancedWorkOrder, techId?: number, timeSlot?: string) => void;
  onWorkOrderContextMenu: (e: React.MouseEvent, workOrder: EnhancedWorkOrder) => void;
  onWorkOrderSelect?: (workOrder: EnhancedWorkOrder) => void;
  draggedWorkOrder: EnhancedWorkOrder | null;
  setDraggedWorkOrder: (workOrder: EnhancedWorkOrder | null) => void;
  dragOverTarget: string | null;
  setDragOverTarget: (target: string | null) => void;
  infoDisplayMode?: 'equipment' | 'notes';
  displayFormat?: 'wo_number' | 'location' | 'call_type';
  selectedWorkOrder: EnhancedWorkOrder | null;
  setSelectedWorkOrder: (workOrder: EnhancedWorkOrder | null) => void;
  setQuickPreviewWorkOrder: (workOrder: WorkOrder | null) => void;
  onCheckIn: (workOrder: EnhancedWorkOrder) => void;
  onCheckOut: (workOrder: EnhancedWorkOrder) => void;
}

function TechnicianColumn({
  technician,
  zones,
  onDrop,
  onWorkOrderContextMenu,
  onWorkOrderSelect,
  draggedWorkOrder,
  setDraggedWorkOrder,
  dragOverTarget,
  setDragOverTarget,
  infoDisplayMode = 'equipment',
  displayFormat = 'wo_number',
  selectedWorkOrder,
  setSelectedWorkOrder,
  setQuickPreviewWorkOrder,
  onCheckIn,
  onCheckOut
}: TechnicianColumnProps) {
  
  const workOrders = technician.workOrders || technician.work_orders || [];
  const firstAMWorkOrders = workOrders.filter(wo => wo.scheduled_time_slot === 'First AM');
  const unscheduledWorkOrders = workOrders.filter(wo => !wo.scheduled_time_slot || wo.scheduled_time_slot !== 'First AM');

  const firstAMTargetId = `tech-${technician.id}-first-am`;
  const unscheduledTargetId = `tech-${technician.id}-unscheduled`;

  // Detect technician's current zone based on GPS location
  const techZone = detectZone(technician.latitude, technician.longitude, zones);
  const hasGPS = !!(technician.latitude && technician.longitude);

  return (
    <div style={{
      minWidth: '260px', // Reduced width
      maxWidth: '260px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* COMPACT Tech Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        backgroundColor: 'white',
        padding: '0.875rem',
        borderRadius: '0.75rem',
        border: '2px solid #E5E7EB',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05)'
      }}>
        {technician.profile_image ? (
          <div
            style={{
              position: 'relative',
              width: '40px',
              height: '40px'
            }}
            title={`${technician.crew || 'Unassigned'} Team`}
          >
            <img
              src={`http://localhost:5000${technician.profile_image}`}
              alt={`${technician.first_name} ${technician.last_name}`}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `3px solid ${getCrewColor(technician.crew)}`,
                boxShadow: '0 2px 6px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)'
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: getCrewColor(technician.crew),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.875rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)'
            }}
            title={`${technician.crew || 'Unassigned'} Team`}
          >
            {technician.first_name[0]}{technician.last_name[0]}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#1F2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {technician.first_name} {technician.last_name}
          </div>
          <div style={{ fontSize: '0.625rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
            <span style={{ fontWeight: '500' }}>{technician.crew} • Van {technician.van_number}</span>
            <span style={{
              fontSize: '0.625rem',
              fontWeight: '700',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.375rem',
              backgroundColor: techZone ? (ZONE_COLORS[techZone] || '#6B7280') : '#9CA3AF',
              color: 'white',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
            }}
            title={techZone ? `Currently in Zone ${techZone}` : (hasGPS ? 'Outside service zones' : 'GPS unavailable')}
            >
              Zone {techZone || '?'}
            </span>
          </div>
        </div>
      </div>

      {/* FIRST AM Slot - SIZED FOR ONE CARD PLUS PADDING */}
      <CompactTimeSlot
        title="FIRST AM (8:30 departure)"
        workOrders={firstAMWorkOrders}
        targetId={firstAMTargetId}
        dragOverTarget={dragOverTarget}
        setDragOverTarget={setDragOverTarget}
        onDrop={(workOrder) => onDrop('technician', workOrder, technician.id, 'First AM')}
        draggedWorkOrder={draggedWorkOrder}
        setDraggedWorkOrder={setDraggedWorkOrder}
        onWorkOrderContextMenu={onWorkOrderContextMenu}
        onWorkOrderSelect={onWorkOrderSelect}
        backgroundColor="#FEF3C7"
        borderColor="#F59E0B"
        emptyMessage="Drop First AM job"
        cardHeight="125px" // Snug fit for one WO card
        infoDisplayMode={infoDisplayMode}
        displayFormat={displayFormat}
        setSelectedWorkOrder={(wo) => {
          setSelectedWorkOrder(wo);
          setQuickPreviewWorkOrder(wo);
        }}
        setQuickPreviewWorkOrder={setQuickPreviewWorkOrder}
        selectedWorkOrderId={selectedWorkOrder?.id}
        isFirstAM={true}
        preventScroll={true} // Add this to prevent First AM from scrolling
        onCheckIn={onCheckIn}
        onCheckOut={onCheckOut}
      />

      {/* Unscheduled Slot - FLEXIBLE HEIGHT */}
      <CompactTimeSlot
        title="Unscheduled Work Orders"
        workOrders={unscheduledWorkOrders}
        targetId={unscheduledTargetId}
        dragOverTarget={dragOverTarget}
        setDragOverTarget={setDragOverTarget}
        onDrop={(workOrder) => onDrop('technician', workOrder, technician.id, 'Unscheduled')}
        draggedWorkOrder={draggedWorkOrder}
        setDraggedWorkOrder={setDraggedWorkOrder}
        onWorkOrderContextMenu={onWorkOrderContextMenu}
        onWorkOrderSelect={onWorkOrderSelect}
        backgroundColor="white"
        borderColor="#D1D5DB"
        emptyMessage="Drag work orders here"
        flex={true}
        infoDisplayMode={infoDisplayMode}
        displayFormat={displayFormat}
        setSelectedWorkOrder={(wo) => {
          setSelectedWorkOrder(wo);
          setQuickPreviewWorkOrder(wo);
        }}
        setQuickPreviewWorkOrder={setQuickPreviewWorkOrder}
        selectedWorkOrderId={selectedWorkOrder?.id}
        isFirstAM={false}
        onCheckIn={onCheckIn}
        onCheckOut={onCheckOut}
      />
    </div>
  );
}

// COMPACT Time Slot Component - Optimized sizing
interface CompactTimeSlotProps {
  title: string;
  workOrders: EnhancedWorkOrder[];
  targetId: string;
  dragOverTarget: string | null;
  setDragOverTarget: (target: string | null) => void;
  onDrop: (workOrder: EnhancedWorkOrder) => void;
  draggedWorkOrder: EnhancedWorkOrder | null;
  setDraggedWorkOrder: (workOrder: EnhancedWorkOrder | null) => void;
  onWorkOrderContextMenu: (e: React.MouseEvent, workOrder: EnhancedWorkOrder) => void;
  onWorkOrderSelect?: (workOrder: EnhancedWorkOrder) => void;
  backgroundColor: string;
  borderColor: string;
  emptyMessage: string;
  cardHeight?: string;
  flex?: boolean;
  infoDisplayMode?: 'equipment' | 'notes';
  displayFormat?: 'wo_number' | 'location' | 'call_type';
  setSelectedWorkOrder: (workOrder: EnhancedWorkOrder | null) => void;
  setQuickPreviewWorkOrder: (workOrder: WorkOrder | null) => void;
  selectedWorkOrderId?: number | null;
  isFirstAM?: boolean;
  preventScroll?: boolean; // Add new prop for preventing scroll
  onCheckIn: (workOrder: EnhancedWorkOrder) => void;
  onCheckOut: (workOrder: EnhancedWorkOrder) => void;
}

function CompactTimeSlot({
  title,
  workOrders,
  targetId,
  dragOverTarget,
  setDragOverTarget,
  onDrop,
  draggedWorkOrder,
  setDraggedWorkOrder,
  onWorkOrderContextMenu,
  onWorkOrderSelect,
  backgroundColor,
  borderColor,
  emptyMessage,
  cardHeight,
  flex = false,
  infoDisplayMode = 'equipment',
  displayFormat = 'wo_number',
  setSelectedWorkOrder,
  setQuickPreviewWorkOrder,
  selectedWorkOrderId,
  isFirstAM = false,
  preventScroll = false, // Add new parameter
  onCheckIn,
  onCheckOut
}: CompactTimeSlotProps) {
  const isDragOver = dragOverTarget === targetId;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: flex ? 1 : 0,
      marginBottom: '0.75rem',
      height: cardHeight && !flex ? cardHeight : undefined,
      minHeight: cardHeight && !flex ? cardHeight : '200px'
    }}>
      {/* Compact header */}
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.375rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {title.replace(' (8:30 departure)', '')}
          {workOrders.length > 0 && (
            <span style={{
              fontSize: '0.625rem',
              color: '#6B7280',
              backgroundColor: '#F3F4F6',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.125rem'
            }}>
              {workOrders.length}
            </span>
          )}
        </div>
        {/* Remove scroll indicator for First AM since it won't scroll */}
        {!preventScroll && !isFirstAM && workOrders.length > 3 && (
          <span style={{
            fontSize: '0.625rem',
            color: '#6B7280'
          }}>
            ↓
          </span>
        )}
      </div>

      <div
        style={{
          border: isDragOver ? `2px solid ${borderColor}` : `1px dashed ${borderColor}`,
          borderRadius: '0.375rem',
          backgroundColor: isDragOver ? `${borderColor}15` : backgroundColor,
          padding: preventScroll ? '0.75rem' : '0.375rem', // More padding for First AM
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isFirstAM ? 'center' : 'flex-start', // Center cards in First AM
          flex: flex ? 1 : 0,
          height: cardHeight && !flex ? `calc(${cardHeight} - 2rem)` : undefined,
          overflow: preventScroll ? 'hidden' : 'auto', // Prevent scrolling for First AM
          minHeight: flex ? '200px' : cardHeight ? `calc(${cardHeight} - 1rem)` : '60px'
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverTarget(targetId);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverTarget(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverTarget(null);
          if (draggedWorkOrder) {
            onDrop(draggedWorkOrder);
          }
        }}
      >
        {workOrders.length === 0 ? (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            color: '#9CA3AF',
            fontSize: '0.75rem',
            fontStyle: 'italic',
            minHeight: preventScroll ? '60px' : '60px'
          }}>
            {isDragOver ? 'Drop here' : emptyMessage}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '0.375rem',
            flex: 1
          }}>
            {/* For First AM, only show the first work order to prevent overflow */}
            {(preventScroll ? workOrders.slice(0, 1) : workOrders).map((workOrder) => (
              <div
                key={workOrder.id}
                draggable
                onDragStart={() => setDraggedWorkOrder(workOrder)}
                onDragEnd={() => setDraggedWorkOrder(null)}
                onContextMenu={(e) => onWorkOrderContextMenu(e, workOrder)}
              >
                <WorkOrderCard
                  workOrder={workOrder}
                  showEquipment={infoDisplayMode === 'equipment'}
                  displayFormat={displayFormat}
                  hideTechName={true}
                  onQuickView={setSelectedWorkOrder}
                  onOpenDetails={onWorkOrderSelect}
                  onContextMenu={(e) => onWorkOrderContextMenu(e, workOrder)}
                  onCheckIn={onCheckIn}
                  onCheckOut={onCheckOut}
                  showCheckInOut={true}
                  isSelected={selectedWorkOrderId === workOrder.id}
                />
              </div>
            ))}
            {/* Show overflow indicator if there are more than 1 work orders in First AM */}
            {preventScroll && workOrders.length > 1 && (
              <div style={{
                textAlign: 'center',
                color: '#F59E0B',
                fontSize: '0.625rem',
                fontWeight: '600',
                backgroundColor: '#FEF3C7',
                padding: '0.25rem',
                borderRadius: '0.25rem',
                border: '1px solid #F59E0B'
              }}>
                +{workOrders.length - 1} more (over capacity)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ICUDispatchBoard;