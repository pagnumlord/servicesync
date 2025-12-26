// WorkOrderDetails.tsx - Vision-inspired comprehensive work order modal
import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  User,
  Wrench,
  AlertTriangle,
  Phone,
  Mail,
  FileText,
  Calendar,
  DollarSign,
  Edit2,
  Save,
  Package,
  Settings,
  CheckSquare,
  Archive,
  Grid,
  Receipt,
  ShoppingCart,
  Paperclip,
  Map
} from 'lucide-react';
import { WorkOrder } from '../types';
import RegisterTab from './RegisterTab';
import PurchasingTab from './PurchasingTab';
import AttachmentsTab from './AttachmentsTab';
import AssignmentsTab from './AssignmentsTab';

interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedWorkOrder: WorkOrder) => void;
}

const WorkOrderDetails: React.FC<WorkOrderDetailsProps> = ({
  workOrder,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkOrder, setEditedWorkOrder] = useState<WorkOrder>(workOrder);
  const [activeTab, setActiveTab] = useState<'customer' | 'general' | 'register' | 'purchasing' | 'attachments' | 'assignments'>('general');

  useEffect(() => {
    setEditedWorkOrder(workOrder);
  }, [workOrder]);

  if (!isOpen) return null;

  const getUrgencyColor = () => {
    switch (workOrder.call_urgency) {
      case 'Emergency': return '#DC2626';
      case 'Urgent': return '#F59E0B';
      case 'Default':
      default: return '#6B7280';
    }
  };

  const getRateTypeColor = () => {
    switch (workOrder.call_rate) {
      case 'OT': return '#7C3AED';
      case 'Accelerated': return '#DC2626';
      case 'RT':
      default: return '#3B82F6';
    }
  };

  const getRateTypeDisplay = () => {
    switch (workOrder.call_rate) {
      case 'OT': return 'Overtime';
      case 'Accelerated': return 'Accelerated';
      case 'RT':
      default: return 'Regular Time';
    }
  };

  const getUrgencyDisplay = () => {
    switch (workOrder.call_urgency) {
      case 'Emergency': return 'Emergency';
      case 'Urgent': return 'Urgent';
      case 'Default':
      default: return 'Default';
    }
  };

  const handleSave = async () => {
    if (onUpdate) {
      onUpdate(editedWorkOrder);
    }
    setIsEditing(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        width: '100%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#F9FAFB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1F2937'
              }}>
                {workOrder.wo_number}
              </h2>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '1rem',
                color: '#6B7280',
                fontWeight: '500'
              }}>
                {workOrder.customer_name}
              </p>
            </div>
            
            {/* Urgency Badge */}
            {workOrder.call_urgency && workOrder.call_urgency !== 'Default' && (
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: getUrgencyColor(),
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <AlertTriangle size={14} />
                {getUrgencyDisplay()}
              </div>
            )}

            {/* Rate Type Badge */}
            <div style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              backgroundColor: getRateTypeColor(),
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              {getRateTypeDisplay()}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
              >
                <Edit2 size={16} />
                Edit
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#6B7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
            )}
            
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                color: '#6B7280',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          paddingLeft: '2rem',
          overflowX: 'auto'
        }}>
          {[
            { id: 'customer', label: 'Customer', icon: User },
            { id: 'general', label: 'General', icon: FileText },
            { id: 'register', label: 'Register', icon: CheckSquare },
            { id: 'purchasing', label: 'Purchasing', icon: Package },
            { id: 'attachments', label: 'Attachments', icon: Paperclip },
            { id: 'assignments', label: 'Assignments', icon: Map }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              style={{
                padding: '1rem 1.5rem',
                backgroundColor: activeTab === id ? 'white' : 'transparent',
                color: activeTab === id ? '#3B82F6' : '#6B7280',
                border: 'none',
                borderBottom: activeTab === id ? '2px solid #3B82F6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === id ? '600' : '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '2rem'
        }}>
          {activeTab === 'customer' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Customer Information Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <User size={18} style={{ color: '#3B82F6' }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1F2937'
                  }}>
                    Customer Information
                  </h3>
                </div>
                <div style={{
                  padding: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1.5rem'
                }}>
                  <InfoRow
                    icon={<User size={16} />}
                    label="Customer Name"
                    value={workOrder.customer_name}
                  />
                  <InfoRow
                    icon={<MapPin size={16} />}
                    label="Service City"
                    value={workOrder.service_city || 'N/A'}
                  />
                  {workOrder.customer_zone && (
                    <InfoRow
                      icon={<Settings size={16} />}
                      label="Zone"
                      value={workOrder.customer_zone}
                    />
                  )}
                  {workOrder.customer_po && (
                    <InfoRow
                      icon={<FileText size={16} />}
                      label="Customer PO"
                      value={workOrder.customer_po}
                    />
                  )}
                </div>
              </div>

              {/* Service Address Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <MapPin size={18} style={{ color: '#3B82F6' }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1F2937'
                  }}>
                    Service Location
                  </h3>
                </div>
                <div style={{
                  padding: '1.5rem'
                }}>
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem',
                    color: '#374151',
                    lineHeight: '1.6'
                  }}>
                    {workOrder.service_address || 'Service address not available'}
                    {workOrder.service_city && (
                      <div style={{ marginTop: '0.25rem' }}>
                        {workOrder.service_city}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Work Order Details Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Calendar size={18} style={{ color: '#3B82F6' }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1F2937'
                  }}>
                    Work Order Details
                  </h3>
                </div>
                <div style={{
                  padding: '1.5rem',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.5rem'
                }}>
                  <InfoRow
                    icon={<Calendar size={16} />}
                    label="Created Date"
                    value={new Date(workOrder.created_at || '').toLocaleDateString()}
                  />
                  {workOrder.scheduled_date && (
                    <InfoRow
                      icon={<Calendar size={16} />}
                      label="Scheduled Date"
                      value={new Date(workOrder.scheduled_date).toLocaleDateString()}
                    />
                  )}
                  {workOrder.scheduled_time_slot && (
                    <InfoRow
                      icon={<Clock size={16} />}
                      label="Time Slot"
                      value={workOrder.scheduled_time_slot}
                    />
                  )}
                  <InfoRow
                    icon={<Settings size={16} />}
                    label="Call Type"
                    value={workOrder.call_type || 'Time and Material'}
                  />
                  <InfoRow
                    icon={<DollarSign size={16} />}
                    label="Rate Type"
                    value={getRateTypeDisplay()}
                  />
                  <InfoRow
                    icon={<AlertTriangle size={16} />}
                    label="Urgency"
                    value={getUrgencyDisplay()}
                  />
                </div>
              </div>

              {/* Equipment & Problem Description Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Wrench size={18} style={{ color: '#3B82F6' }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1F2937'
                  }}>
                    Equipment & Problem
                  </h3>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  {/* Equipment Info Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '1.5rem',
                    marginBottom: '1.5rem'
                  }}>
                    {workOrder.equipment_type && (
                      <InfoRow
                        icon={<Wrench size={16} />}
                        label="Equipment Type"
                        value={workOrder.equipment_type}
                      />
                    )}
                    {workOrder.equipment_number && (
                      <InfoRow
                        icon={<Wrench size={16} />}
                        label="Equipment Number"
                        value={workOrder.equipment_number}
                      />
                    )}
                  </div>

                  {/* Problem Description */}
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FileText size={16} style={{ color: '#6B7280' }} />
                      Problem Description
                    </div>
                    {isEditing ? (
                      <textarea
                        value={editedWorkOrder.problem_description || ''}
                        onChange={(e) => setEditedWorkOrder({
                          ...editedWorkOrder,
                          problem_description: e.target.value
                        })}
                        style={{
                          width: '100%',
                          backgroundColor: 'white',
                          padding: '1rem',
                          borderRadius: '0.5rem',
                          border: '2px solid #3B82F6',
                          minHeight: '120px',
                          fontSize: '0.875rem',
                          color: '#374151',
                          lineHeight: '1.5',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                        placeholder="Enter problem description..."
                      />
                    ) : (
                      <div style={{
                        backgroundColor: '#F9FAFB',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #E5E7EB',
                        minHeight: '100px',
                        fontSize: '0.875rem',
                        color: '#374151',
                        lineHeight: '1.6'
                      }}>
                        {workOrder.problem_description || 'No problem description provided.'}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment & Status Card */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                overflow: 'hidden'
              }}>
                <div style={{
                  backgroundColor: '#F9FAFB',
                  borderBottom: '1px solid #E5E7EB',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <User size={18} style={{ color: '#3B82F6' }} />
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1F2937'
                  }}>
                    Assignment & Status
                  </h3>
                </div>
                <div style={{ padding: '1.5rem' }}>
                  {workOrder.tech_first_name && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <InfoRow
                        icon={<User size={16} />}
                        label="Assigned Technician"
                        value={`${workOrder.tech_first_name} ${workOrder.tech_last_name || ''}`}
                      />
                    </div>
                  )}

                  {workOrder.status_notes && (
                    <div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FileText size={16} style={{ color: '#6B7280' }} />
                        Status Notes
                      </div>
                      <div style={{
                        backgroundColor: '#F9FAFB',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid #E5E7EB',
                        fontSize: '0.875rem',
                        color: '#374151',
                        lineHeight: '1.6'
                      }}>
                        {workOrder.status_notes}
                      </div>
                    </div>
                  )}

                  {!workOrder.tech_first_name && !workOrder.status_notes && (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#9CA3AF',
                      fontSize: '0.875rem'
                    }}>
                      No assignment or status information available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'register' && (
            <RegisterTab workOrderId={workOrder.id} isReadOnly={false} />
          )}

          {activeTab === 'purchasing' && (
            <PurchasingTab workOrderId={workOrder.id} isReadOnly={false} />
          )}

          {activeTab === 'attachments' && (
            <AttachmentsTab workOrderId={workOrder.id} isReadOnly={false} />
          )}

          {activeTab === 'assignments' && (
            <AssignmentsTab workOrderId={workOrder.id} />
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const InfoSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h4 style={{
      margin: '0 0 1rem 0',
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1F2937',
      borderBottom: '1px solid #E5E7EB',
      paddingBottom: '0.5rem'
    }}>
      {title}
    </h4>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem'
    }}>
      {children}
    </div>
  </div>
);

const InfoRow: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  isClickable?: boolean;
}> = ({ icon, label, value, isClickable = false }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem'
  }}>
    <div style={{
      color: '#6B7280',
      marginTop: '0.125rem',
      flexShrink: 0
    }}>
      {icon}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: '500',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '0.125rem'
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: '500',
        cursor: isClickable ? 'pointer' : 'default',
        textDecoration: isClickable ? 'underline' : 'none'
      }}>
        {value}
      </div>
    </div>
  </div>
);

export default WorkOrderDetails;