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
}

function ICUDispatchBoard({
  onWorkOrderSelect,
  onOpenWorkOrder,
  onSocketStatusChange
}: ICUDispatchBoardProps) {
  const handleWorkOrderSelect = onWorkOrderSelect || onOpenWorkOrder;
  const [viewMode, setViewMode] = useState<'board' | 'calendar'>('board');
  const [infoDisplayMode, setInfoDisplayMode] = useState<'equipment' | 'notes'>('equipment');
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
              background: 'none',
              border: '1px solid #6B7280',
              color: 'white',
              padding: '0.375rem',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            ◀
          </button>
          <span style={{ 
            fontSize: '0.875rem',
            fontWeight: '500',
            minWidth: '180px',
            textAlign: 'center'
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
              background: 'none',
              border: '1px solid #6B7280',
              color: 'white',
              padding: '0.375rem',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            ▶
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              marginLeft: '0.5rem'
            }}
          >
            Today
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>


          {/* Info display toggle - more compact */}
          <div style={{ 
            display: 'flex', 
            gap: '0.125rem', 
            marginRight: '0.75rem',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '0.25rem',
            padding: '0.125rem'
          }}>
            <button
              onClick={() => setInfoDisplayMode('equipment')}
              style={{
                backgroundColor: infoDisplayMode === 'equipment' ? '#10B981' : 'transparent',
                color: 'white',
                border: 'none',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.125rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
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
                padding: '0.375rem 0.75rem',
                borderRadius: '0.125rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              💬 Notes
            </button>
          </div>

          {/* View mode toggle - more compact */}
          <div style={{ display: 'flex', gap: '0.125rem' }}>
            <button
              onClick={() => setViewMode('board')}
              style={{
                backgroundColor: viewMode === 'board' ? '#3B82F6' : 'transparent',
                color: 'white',
                border: '1px solid #6B7280',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              📊 Board
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                backgroundColor: viewMode === 'calendar' ? '#3B82F6' : 'transparent',
                color: 'white',
                border: '1px solid #6B7280',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
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
            {/* COMPACT SIDEBAR - Fixed width, internal scrolling */}
            <div style={{
              width: '260px', // Reduced width
              backgroundColor: '#F3F4F6',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              overflow: 'hidden',
              borderRight: '1px solid #E5E7EB'
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
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>Unassigned ({unassignedWorkOrders.length})</span>
                </div>
                
                <div
                  style={{
                    flex: 1,
                    border: '1px dashed #9CA3AF',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    overflow: 'auto',
                    padding: '0.375rem'
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
                            hideTechName={false}
                            onQuickView={setQuickPreviewWorkOrder}
                            onOpenDetails={handleWorkOrderSelect}
                            onContextMenu={(e) => handleContextMenu(e, workOrder)}
                            onCheckIn={handleCheckIn}
                            onCheckOut={handleCheckOut}
                            showCheckInOut={true}
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
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.375rem'
                }}>
                  ⚙️ Parts Ordered ({partsWorkOrders.length})
                </div>
                
                <div
                  style={{
                    flex: 1,
                    border: '1px dashed #7C3AED',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    overflow: 'auto',
                    padding: '0.375rem'
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
                            hideTechName={true}
                            onQuickView={setQuickPreviewWorkOrder}
                            onOpenDetails={handleWorkOrderSelect}
                            onContextMenu={(e) => handleContextMenu(e, workOrder)}
                            onCheckIn={handleCheckIn}
                            onCheckOut={handleCheckOut}
                            showCheckInOut={true}
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
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '0.375rem'
                }}>
                  ✓ Ready to Schedule ({readyToSchedule.length})
                </div>
                
                <div
                  style={{
                    flex: 1,
                    border: '1px dashed #EAB308',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    overflow: 'auto',
                    padding: '0.375rem'
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
                            hideTechName={true}
                            onQuickView={setQuickPreviewWorkOrder}
                            onOpenDetails={handleWorkOrderSelect}
                            onContextMenu={(e) => handleContextMenu(e, workOrder)}
                            onCheckIn={handleCheckIn}
                            onCheckOut={handleCheckOut}
                            showCheckInOut={true}
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
            >
              View Details
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
        marginBottom: '0.75rem',
        backgroundColor: 'white',
        padding: '0.75rem',
        borderRadius: '0.375rem',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div 
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: '600',
            fontSize: '0.75rem'
          }}
        >
          {technician.first_name[0]}{technician.last_name[0]}
        </div>
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
          <div style={{ fontSize: '0.625rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{technician.crew} • Van {technician.van_number}</span>
            <span style={{
              fontSize: '0.625rem',
              fontWeight: '700',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              backgroundColor: techZone ? (ZONE_COLORS[techZone] || '#6B7280') : '#9CA3AF',
              color: 'white',
              border: '1px solid white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            title={techZone ? `Currently in Zone ${techZone}` : (hasGPS ? 'Outside service zones' : 'GPS unavailable')}
            >
              {techZone || '?'}
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
        cardHeight="150px" // Increased height for comfortable fit without text cutoff
        infoDisplayMode={infoDisplayMode}
        setQuickPreviewWorkOrder={setQuickPreviewWorkOrder}
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
        setQuickPreviewWorkOrder={setQuickPreviewWorkOrder}
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
  setQuickPreviewWorkOrder: (workOrder: WorkOrder | null) => void;
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
  setQuickPreviewWorkOrder,
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
                  hideTechName={true}
                  onQuickView={setQuickPreviewWorkOrder}
                  onOpenDetails={onWorkOrderSelect}
                  onContextMenu={(e) => onWorkOrderContextMenu(e, workOrder)}
                  onCheckIn={onCheckIn}
                  onCheckOut={onCheckOut}
                  showCheckInOut={true}
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