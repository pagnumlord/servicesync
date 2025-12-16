// QuickNotesPreview.tsx - Vision-style bottom preview panel
import React from 'react';
import { WorkOrder } from '../types';
import { X, MapPin, Wrench, Clock, AlertTriangle, FileText } from 'lucide-react';

interface QuickNotesPreviewProps {
  workOrder: WorkOrder | null;
  onClose: () => void;
  onOpenFull: (workOrder: WorkOrder) => void;
}

const QuickNotesPreview: React.FC<QuickNotesPreviewProps> = ({
  workOrder,
  onClose,
  onOpenFull
}) => {
  if (!workOrder) return null;

  const getPriorityColor = () => {
    switch (workOrder.priority) {
      case 'Emergency': return '#DC2626';
      case 'High': return '#F59E0B';
      case 'Normal': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusColor = () => {
    switch (workOrder.status) {
      case 'Suspended': return '#8B5CF6';
      case 'Complete': return '#10B981';
      case 'In Progress': return '#F59E0B';
      case 'Assigned': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'white',
      borderTop: '2px solid #E5E7EB',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 100,
      animation: 'slideUp 0.2s ease-out'
    }}>
      {/* Header Bar */}
      <div style={{
        backgroundColor: '#F3F4F6',
        padding: '0.5rem 1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* WO Number */}
          <span style={{
            fontWeight: '600',
            fontSize: '0.875rem',
            color: '#1F2937'
          }}>
            {workOrder.wo_number}
          </span>

          {/* Customer Name */}
          <span style={{
            fontSize: '0.875rem',
            color: '#4B5563'
          }}>
            {workOrder.customer_name}
          </span>

          {/* Priority Badge */}
          <span style={{
            backgroundColor: getPriorityColor(),
            color: 'white',
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {workOrder.priority}
          </span>

          {/* Status Badge */}
          <span style={{
            backgroundColor: getStatusColor(),
            color: 'white',
            padding: '0.125rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {workOrder.status}
          </span>

          {/* Call Rate */}
          {workOrder.call_rate && (
            <span style={{
              backgroundColor: workOrder.call_rate === 'OT' ? '#7C3AED' : '#3B82F6',
              color: 'white',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              {workOrder.call_rate}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {/* Open Full Details Button */}
          <button
            onClick={() => onOpenFull(workOrder)}
            style={{
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <FileText size={14} />
            Open Full Details
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              color: '#6B7280',
              border: '1px solid #D1D5DB',
              padding: '0.375rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{
        padding: '1rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        maxHeight: '200px',
        overflow: 'auto'
      }}>
        {/* Column 1 - Problem & Equipment */}
        <div>
          <h4 style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>
            Problem Description
          </h4>
          <p style={{
            fontSize: '0.875rem',
            color: '#1F2937',
            marginBottom: '1rem',
            lineHeight: '1.4'
          }}>
            {workOrder.problem_description || 'No description provided'}
          </p>

          {workOrder.equipment_type && (
            <>
              <h4 style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6B7280',
                marginBottom: '0.25rem',
                textTransform: 'uppercase'
              }}>
                Equipment
              </h4>
              <div style={{
                fontSize: '0.875rem',
                color: '#1F2937',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <Wrench size={14} />
                {workOrder.equipment_type}
                {workOrder.equipment_number && ` #${workOrder.equipment_number}`}
              </div>
            </>
          )}
        </div>

        {/* Column 2 - Location & Contact */}
        <div>
  <h4 style={{
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: '0.5rem',
    textTransform: 'uppercase'
  }}>
    Service Location
  </h4>
  <div style={{
    fontSize: '0.875rem',
    color: '#1F2937',
    marginBottom: '0.5rem'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
      <MapPin size={14} />
      {workOrder.service_city}
      {workOrder.customer_zone && ` - Zone ${workOrder.customer_zone}`}
    </div>
  </div>
</div>

        {/* Column 3 - Schedule Info */}
        <div>
          <h4 style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>
            Schedule
          </h4>
          
          {workOrder.scheduled_date && (
            <div style={{
              fontSize: '0.875rem',
              color: '#1F2937',
              marginBottom: '0.5rem'
            }}>
              {new Date(workOrder.scheduled_date).toLocaleDateString()}
            </div>
          )}

          {workOrder.scheduled_time_slot && (
            <div style={{
              fontSize: '0.875rem',
              color: '#1F2937',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Clock size={14} />
              {workOrder.scheduled_time_slot}
            </div>
          )}

          {workOrder.tech_first_name && (
            <div style={{
              fontSize: '0.875rem',
              color: '#1F2937',
              marginTop: '0.5rem'
            }}>
              Tech: {workOrder.tech_first_name} {workOrder.tech_last_name}
            </div>
          )}
        </div>

        {/* Column 4 - Recent Notes */}
        <div>
          <h4 style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: '#6B7280',
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>
            Recent Notes
          </h4>
          <div style={{
            fontSize: '0.813rem',
            color: '#4B5563',
            lineHeight: '1.4',
            fontStyle: 'italic'
          }}>
            {workOrder.status_notes || 'No recent notes'}
          </div>

          {workOrder.customer_po && (
            <div style={{
              fontSize: '0.813rem',
              color: '#1F2937',
              marginTop: '0.5rem',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#F3F4F6',
              borderRadius: '0.25rem',
              display: 'inline-block'
            }}>
              PO: {workOrder.customer_po}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div style={{
        backgroundColor: '#F9FAFB',
        padding: '0.5rem 1rem',
        display: 'flex',
        gap: '0.5rem',
        borderTop: '1px solid #E5E7EB',
        fontSize: '0.75rem',
        color: '#6B7280'
      }}>
        <span>Press <kbd style={{ padding: '2px 4px', backgroundColor: '#E5E7EB', borderRadius: '2px' }}>Enter</kbd> to open full details</span>
        <span>•</span>
        <span>Press <kbd style={{ padding: '2px 4px', backgroundColor: '#E5E7EB', borderRadius: '2px' }}>Esc</kbd> to close</span>
        <span>•</span>
        <span>Right-click for more options</span>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default QuickNotesPreview;