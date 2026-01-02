// TechCheckOutModal.tsx - Comprehensive technician checkout with auto line item generation
import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  Clock,
  Users,
  Wrench,
  Package,
  RotateCcw,
  DollarSign,
  Shield,
  AlertCircle,
  FileText
} from 'lucide-react';
import { WorkOrder } from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface TechCheckOutModalProps {
  workOrder: WorkOrder;
  checkInTime?: string; // When tech checked in/started
  onClose: () => void;
  onCheckOut: (data: CheckoutData) => void;
}

export interface CheckoutData {
  // Time tracking
  check_in_time: string;
  check_out_time: string;
  total_hours: number;

  // Labor details
  num_helpers: number;
  is_overtime: boolean;
  is_after_hours: boolean;

  // Equipment
  equipment_used?: string[];

  // Work status & routing
  work_status: 'complete' | 'needs_parts' | 'needs_return_trip' | 'needs_quote' | 'warranty';
  work_performed: string;

  // Queue routing
  queue_assignments: string[]; // Queue names to assign

  // Generated line items (preview for tech to review)
  generated_line_items: LineItemPreview[];
}

interface LineItemPreview {
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

// Labor rates (these should come from settings/config in production)
const LABOR_RATES = {
  regular_time: 120.00,
  helper: 100.00,
  overtime: 180.00,
  after_hours: 200.00
};

const EQUIPMENT_OPTIONS = [
  'Vacuum Pump',
  'Refrigerant Recovery Machine',
  'Torch Set',
  'Nitrogen Tank',
  'Gauges',
  'Multimeter',
  'Camera Equipment',
  'Lift/Ladder'
];

const TechCheckOutModal: React.FC<TechCheckOutModalProps> = ({
  workOrder,
  checkInTime,
  onClose,
  onCheckOut
}) => {
  const [checkOutTime] = useState(new Date().toISOString());
  const [numHelpers, setNumHelpers] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [isAfterHours, setIsAfterHours] = useState(false);
  const [equipmentUsed, setEquipmentUsed] = useState<string[]>([]);
  const [workStatus, setWorkStatus] = useState<'complete' | 'needs_parts' | 'needs_return_trip' | 'needs_quote' | 'warranty'>('complete');
  const [workPerformed, setWorkPerformed] = useState('');
  const [lineItemPreviews, setLineItemPreviews] = useState<LineItemPreview[]>([]);

  // Calculate hours worked
  const calculateHours = (): number => {
    if (!checkInTime) return 0;
    const start = new Date(checkInTime);
    const end = new Date(checkOutTime);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return Math.round(hours * 4) / 4; // Round to nearest 0.25
  };

  const totalHours = calculateHours();

  // Generate line item previews whenever inputs change
  useEffect(() => {
    const items: LineItemPreview[] = [];

    if (totalHours > 0) {
      // Determine labor rate
      let laborRate = LABOR_RATES.regular_time;
      let laborDescription = 'RT Labor';

      if (isAfterHours) {
        laborRate = LABOR_RATES.after_hours;
        laborDescription = 'After Hours Labor';
      } else if (isOvertime) {
        laborRate = LABOR_RATES.overtime;
        laborDescription = 'Overtime Labor';
      }

      // Main tech labor
      items.push({
        item_type: 'labor',
        description: laborDescription,
        quantity: totalHours,
        unit_price: laborRate,
        total: totalHours * laborRate
      });

      // Helper labor
      if (numHelpers > 0) {
        const helperRate = isOvertime ? LABOR_RATES.overtime * 0.83 : LABOR_RATES.helper;
        items.push({
          item_type: 'labor',
          description: `Helper${numHelpers > 1 ? ` x${numHelpers}` : ''}${isOvertime ? ' (OT)' : ''}`,
          quantity: totalHours * numHelpers,
          unit_price: helperRate,
          total: totalHours * numHelpers * helperRate
        });
      }
    }

    // Equipment charges (if applicable)
    equipmentUsed.forEach(equipment => {
      // In production, these rates would come from a settings table
      const equipmentRate = 25.00; // Flat rate for equipment
      items.push({
        item_type: 'equipment',
        description: equipment,
        quantity: 1,
        unit_price: equipmentRate,
        total: equipmentRate
      });
    });

    setLineItemPreviews(items);
  }, [totalHours, numHelpers, isOvertime, isAfterHours, equipmentUsed]);

  // Determine queue assignments based on work status
  const getQueueAssignments = (): string[] => {
    const queues: string[] = [];

    switch (workStatus) {
      case 'needs_parts':
        queues.push('Needs Parts');
        break;
      case 'needs_return_trip':
        queues.push('Needs Return Trip');
        break;
      case 'needs_quote':
        queues.push('Josh Quoting/Working'); // or appropriate quoting queue
        break;
      case 'warranty':
        queues.push('Warranty Review');
        break;
      case 'complete':
        queues.push('Invoice Review'); // Ready for invoicing
        break;
    }

    return queues;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!workPerformed.trim()) {
      alert('Please describe the work performed');
      return;
    }

    const checkoutData: CheckoutData = {
      check_in_time: checkInTime || new Date().toISOString(),
      check_out_time: checkOutTime,
      total_hours: totalHours,
      num_helpers: numHelpers,
      is_overtime: isOvertime,
      is_after_hours: isAfterHours,
      equipment_used: equipmentUsed.length > 0 ? equipmentUsed : undefined,
      work_status: workStatus,
      work_performed: workPerformed,
      queue_assignments: getQueueAssignments(),
      generated_line_items: lineItemPreviews
    };

    onCheckOut(checkoutData);
  };

  const totalAmount = lineItemPreviews.reduce((sum, item) => sum + item.total, 0);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '1rem',
        overflowY: 'auto'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          width: '100%',
          maxWidth: '650px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
              Check Out
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
              WO #{workOrder.wo_number} - {workOrder.customer_name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Time Summary */}
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '2px solid #3B82F6',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <Clock size={24} style={{ color: '#3B82F6' }} />
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#1E40AF' }}>
                Time Summary
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Check-in</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>
                  {checkInTime ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </div>
              </div>
              <div>
                <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Check-out</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>
                  {new Date(checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div>
                <div style={{ color: '#6B7280', marginBottom: '0.25rem' }}>Total Hours</div>
                <div style={{ fontWeight: '700', fontSize: '1.125rem', color: '#3B82F6' }}>
                  {totalHours.toFixed(2)} hrs
                </div>
              </div>
            </div>
          </div>

          {/* Labor Details */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Users size={20} style={{ color: '#6B7280' }} />
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                Labor Details
              </h4>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* Number of Helpers */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Number of Helpers
                </label>
                <select
                  value={numHelpers}
                  onChange={(e) => setNumHelpers(parseInt(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value={0}>No helpers</option>
                  <option value={1}>1 helper</option>
                  <option value={2}>2 helpers</option>
                  <option value={3}>3 helpers</option>
                </select>
              </div>

              {/* Overtime/After Hours Flags */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isOvertime}
                    onChange={(e) => setIsOvertime(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500', color: '#374151' }}>Overtime (1.5x)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isAfterHours}
                    onChange={(e) => setIsAfterHours(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500', color: '#374151' }}>After Hours (weekends/holidays)</span>
                </label>
              </div>
            </div>

            {/* Equipment Used */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                <Wrench size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
                Equipment Used (optional)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {EQUIPMENT_OPTIONS.map(equipment => (
                  <label
                    key={equipment}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      backgroundColor: equipmentUsed.includes(equipment) ? '#F0FDF4' : 'white'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={equipmentUsed.includes(equipment)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEquipmentUsed([...equipmentUsed, equipment]);
                        } else {
                          setEquipmentUsed(equipmentUsed.filter(eq => eq !== equipment));
                        }
                      }}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <span>{equipment}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Work Status */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>
              Work Status *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Complete */}
              <button
                type="button"
                onClick={() => setWorkStatus('complete')}
                style={{
                  padding: '0.875rem',
                  border: `2px solid ${workStatus === 'complete' ? '#10B981' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                  backgroundColor: workStatus === 'complete' ? '#ECFDF5' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle size={20} style={{ color: workStatus === 'complete' ? '#10B981' : '#9CA3AF' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Complete</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Job finished</div>
                </div>
              </button>

              {/* Needs Parts */}
              <button
                type="button"
                onClick={() => setWorkStatus('needs_parts')}
                style={{
                  padding: '0.875rem',
                  border: `2px solid ${workStatus === 'needs_parts' ? '#EF4444' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                  backgroundColor: workStatus === 'needs_parts' ? '#FEE2E2' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <Package size={20} style={{ color: workStatus === 'needs_parts' ? '#EF4444' : '#9CA3AF' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Needs Parts</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Waiting for parts</div>
                </div>
              </button>

              {/* Needs Return Trip */}
              <button
                type="button"
                onClick={() => setWorkStatus('needs_return_trip')}
                style={{
                  padding: '0.875rem',
                  border: `2px solid ${workStatus === 'needs_return_trip' ? '#8B5CF6' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                  backgroundColor: workStatus === 'needs_return_trip' ? '#F3E8FF' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <RotateCcw size={20} style={{ color: workStatus === 'needs_return_trip' ? '#8B5CF6' : '#9CA3AF' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Needs Return</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Return trip needed</div>
                </div>
              </button>

              {/* Needs Quote */}
              <button
                type="button"
                onClick={() => setWorkStatus('needs_quote')}
                style={{
                  padding: '0.875rem',
                  border: `2px solid ${workStatus === 'needs_quote' ? '#F59E0B' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                  backgroundColor: workStatus === 'needs_quote' ? '#FEF3C7' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <DollarSign size={20} style={{ color: workStatus === 'needs_quote' ? '#F59E0B' : '#9CA3AF' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Needs Quote</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Pricing needed</div>
                </div>
              </button>

              {/* Warranty */}
              <button
                type="button"
                onClick={() => setWorkStatus('warranty')}
                style={{
                  padding: '0.875rem',
                  border: `2px solid ${workStatus === 'warranty' ? '#3B82F6' : '#E5E7EB'}`,
                  borderRadius: '0.5rem',
                  backgroundColor: workStatus === 'warranty' ? '#EFF6FF' : 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  gridColumn: 'span 2'
                }}
              >
                <Shield size={20} style={{ color: workStatus === 'warranty' ? '#3B82F6' : '#9CA3AF' }} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>Warranty Work</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Under warranty coverage</div>
                </div>
              </button>
            </div>
          </div>

          {/* Work Performed */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Work Performed *
            </label>
            <textarea
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              required
              rows={4}
              placeholder="Describe what was done during this visit..."
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Line Items Preview */}
          {lineItemPreviews.length > 0 && (
            <div style={{
              backgroundColor: '#F9FAFB',
              border: '2px solid #E5E7EB',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                Line Items to be Created
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {lineItemPreviews.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem',
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      border: '1px solid #E5E7EB'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                        {item.description}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.125rem' }}>
                        {item.quantity} × ${item.unit_price.toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#111827' }}>
                      ${item.total.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '2px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Total Amount:</span>
                <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3B82F6' }}>
                  ${totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '0.875rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '2px solid #D1D5DB',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '0.875rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
              }}
            >
              Complete Check Out → Create Line Items
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TechCheckOutModal;
