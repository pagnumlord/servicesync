// WorkOrderCard.tsx - Updated with status-based borders and equipment/notes toggle
import React, { useRef } from 'react';
import { WorkOrder } from '../types';
import { Clock, MapPin, User, Wrench, AlertTriangle } from 'lucide-react';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  showEquipment?: boolean;
  hideTechName?: boolean;
  onOpenDetails?: (workOrder: WorkOrder) => void;
  onContextMenu?: (e: React.MouseEvent, workOrder: WorkOrder) => void;
  onQuickView?: (workOrder: WorkOrder) => void;
}

const WorkOrderCard: React.FC<WorkOrderCardProps> = ({ 
  workOrder, 
  showEquipment = true,
  hideTechName = false,
  onOpenDetails,
  onContextMenu,
  onQuickView
}) => {
  
  // Use a ref to track click timing for distinguishing single vs double clicks
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get status-based border color (main visual indicator)
  const getStatusBorderColor = () => {
    // Priority order: Special queues first, then status
    if (workOrder.completion_queue === 'Parts Ordered') return '#7C3AED'; // Dark purple
    if (workOrder.completion_queue === 'Ready to Schedule') return '#EAB308'; // Yellow
    
    switch (workOrder.status) {
      case 'Suspended': return '#8B5CF6'; // Purple
      case 'Complete':
      case 'Completed': return '#1E40AF'; // Dark blue
      case 'In Progress': return '#10B981'; // Green (checked in)
      case 'Assigned': return '#3B82F6'; // Blue
      case 'Open':
      case 'Unassigned':
      default: return '#9CA3AF'; // Gray
    }
  };

  // Get zone color (matches database zone colors)
  const getZoneColor = () => {
    const zoneColors: Record<string, string> = {
      'A': '#EF4444', // Red - Downtown Lafayette
      'B': '#3B82F6', // Blue - West Lafayette
      'C': '#10B981', // Green - North Lafayette
      'D': '#F59E0B', // Orange - South Lafayette
      'E': '#8B5CF6', // Purple - East Lafayette
      'F': '#EC4899'  // Pink - County
    };

    return workOrder.customer_zone ?
      zoneColors[workOrder.customer_zone] || '#6B7280' :
      '#6B7280';
  };

  // Get zone-based background color (subtle background indication)
  const getZoneBackgroundColor = () => {
    const zoneColors: Record<string, string> = {
      'A': '#FEF2F2', // Light red
      'B': '#EFF6FF', // Light blue
      'C': '#F0FDF4', // Light green
      'D': '#FFFBEB', // Light yellow
      'E': '#F5F3FF', // Light purple
      'F': '#FDF2F8'  // Light pink
    };

    return workOrder.customer_zone ?
      zoneColors[workOrder.customer_zone] || '#F9FAFB' :
      '#F9FAFB';
  };

  // Get urgency indicator (subtle glow effect, not a badge)
  const getUrgencyGlow = () => {
    switch (workOrder.call_urgency) {
      case 'Emergency': return '0 0 0 3px #DC262630'; // Red glow
      case 'Urgent': return '0 0 0 3px #F59E0B30'; // Orange glow
      case 'Default':
      default: return 'none';
    }
  };

  // Get rate type color for small indicator
  const getRateTypeColor = () => {
    switch (workOrder.call_rate) {
      case 'OT': return '#7C3AED'; // Purple
      case 'Accelerated': return '#DC2626'; // Red
      case 'RT':
      default: return '#3B82F6'; // Blue
    }
  };

  // Handle single click vs double click properly
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      if (onQuickView) {
        onQuickView(workOrder);
      }
    }, 300);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (onOpenDetails) {
      onOpenDetails(workOrder);
    }
  };

  // Clean up timeout on unmount
  React.useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(e) => onContextMenu?.(e, workOrder)}
      style={{
        backgroundColor: getZoneBackgroundColor(),
        border: `2px solid ${getStatusBorderColor()}`,
        borderRadius: '0.5rem',
        padding: '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontSize: '0.875rem',
        position: 'relative',
        userSelect: 'none',
        boxShadow: getUrgencyGlow()
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `${getUrgencyGlow()}, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = getUrgencyGlow();
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '0.5rem'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: '0.125rem'
          }}>
            {workOrder.wo_number}
          </div>
          <div style={{
            fontSize: '0.813rem',
            color: '#4B5563',
            fontWeight: '500'
          }}>
            {workOrder.customer_name}
          </div>
        </div>

        {/* Zone indicator and rate type badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          {/* Rate Type Badge - Small indicator only */}
          {workOrder.call_rate && workOrder.call_rate !== 'RT' && (
            <span style={{
              fontSize: '0.625rem',
              fontWeight: '600',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              backgroundColor: getRateTypeColor(),
              color: 'white'
            }}>
              {workOrder.call_rate}
            </span>
          )}

          {/* Zone Badge - Letter indicator with zone color */}
          {workOrder.customer_zone && (
            <span style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              backgroundColor: getZoneColor(),
              color: 'white',
              border: '1px solid white',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}
            title={`Zone ${workOrder.customer_zone}`}
            >
              {workOrder.customer_zone}
            </span>
          )}
        </div>
      </div>

      {/* Location and Time */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: '#6B7280',
          fontSize: '0.75rem'
        }}>
          <MapPin size={12} />
          <span>
            {workOrder.service_city}
            {workOrder.customer_zone && ` (${workOrder.customer_zone})`}
          </span>
        </div>

        {workOrder.scheduled_time_slot && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#6B7280',
            fontSize: '0.75rem'
          }}>
            <Clock size={12} />
            <span>{workOrder.scheduled_time_slot}</span>
          </div>
        )}
      </div>

      {/* Equipment or Notes Display - Controlled by parent toggle */}
      {showEquipment ? (
        // Equipment Mode - Show equipment type and number
        workOrder.equipment_type && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#4B5563',
            fontSize: '0.75rem',
            marginBottom: '0.25rem'
          }}>
            <Wrench size={12} />
            <span>
              {workOrder.equipment_type}
              {workOrder.equipment_number && ` #${workOrder.equipment_number}`}
            </span>
          </div>
        )
      ) : (
        // Notes Mode - Show problem description preview
        workOrder.problem_description && (
          <div style={{
            color: '#4B5563',
            fontSize: '0.75rem',
            lineHeight: '1.3',
            marginBottom: '0.25rem',
            maxHeight: '2.6rem',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical'
          }}>
            {workOrder.problem_description}
          </div>
        )
      )}

      {/* Tech Name - Only show if not hidden */}
      {!hideTechName && workOrder.tech_first_name && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: '#6B7280',
          fontSize: '0.75rem'
        }}>
          <User size={12} />
          <span>{workOrder.tech_first_name} {workOrder.tech_last_name}</span>
        </div>
      )}

      {/* Urgency indicator - Subtle icon instead of prominent badge */}
      {workOrder.call_urgency && workOrder.call_urgency !== 'Default' && (
        <div style={{
          position: 'absolute',
          bottom: '0.25rem',
          right: '0.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <AlertTriangle 
            size={10} 
            color={workOrder.call_urgency === 'Emergency' ? '#DC2626' : '#F59E0B'}
            fill={workOrder.call_urgency === 'Emergency' ? '#DC2626' : '#F59E0B'}
          />
        </div>
      )}
    </div>
  );
};

export default WorkOrderCard;