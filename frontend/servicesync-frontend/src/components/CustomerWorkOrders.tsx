import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  PauseCircle,
  FileText,
  Filter,
  SortAsc,
  Plus,
  MoreVertical,
  Trash2,
  Archive,
  ExternalLink,
  Wrench,
  X
} from 'lucide-react';
import { WorkOrder, Customer, CustomerWorkOrdersResponse, CustomerWorkOrdersFilters } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';

interface CustomerWorkOrdersProps {
  customer: Customer;
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
  onCreateWorkOrder?: (customer: Customer) => void;
}

interface WorkOrderCardProps {
  workOrder: WorkOrder;
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
  onDelete: (workOrder: WorkOrder) => void;
  onInactivate: (workOrder: WorkOrder) => void;
}

// Confirmation Modal Component
const ConfirmModal: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}> = ({ isOpen, title, message, confirmText, cancelText = "Cancel", onConfirm, onCancel, isDestructive = false }) => {
  if (!isOpen) return null;

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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
            {title}
          </h3>
          <button
            onClick={onCancel}
            style={{
              padding: '0.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <X style={{ width: '1.25rem', height: '1.25rem' }} />
          </button>
        </div>
        
        <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.5' }}>
          {message}
        </p>
        
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isDestructive ? '#dc2626' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Work Order Card Component
const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  workOrder,
  onWorkOrderClick,
  onDelete,
  onInactivate
}) => {
  const [showActions, setShowActions] = useState(false);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Complete': return '#10b981';
      case 'In Progress': return '#3b82f6';
      case 'Assigned': return '#8b5cf6';
      case 'Suspended': return '#f59e0b';
      case 'Open': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case 'Complete': return '#d1fae5';
      case 'In Progress': return '#dbeafe';
      case 'Assigned': return '#e9d5ff';
      case 'Suspended': return '#fef3c7';
      case 'Open': return '#f3f4f6';
      default: return '#f3f4f6';
    }
  };

  const getStatusIcon = (status: string) => {
    const iconStyle = { width: '1rem', height: '1rem' };
    switch (status) {
      case 'Complete': return <CheckCircle style={iconStyle} />;
      case 'In Progress': return <Clock style={iconStyle} />;
      case 'Assigned': return <User style={iconStyle} />;
      case 'Suspended': return <PauseCircle style={iconStyle} />;
      case 'Open': return <AlertCircle style={iconStyle} />;
      default: return <FileText style={iconStyle} />;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'Emergency': return '#dc2626';
      case 'High': return '#ea580c';
      case 'Normal': return '#059669';
      case 'Low': return '#0891b2';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3b82f6';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)';
      }}
    >
      {/* Actions Menu */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          style={{
            padding: '0.25rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            color: '#6b7280'
          }}
        >
          <MoreVertical style={{ width: '1rem', height: '1rem' }} />
        </button>

        {showActions && (
          <>
            {/* Backdrop to close menu */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10
              }}
              onClick={() => setShowActions(false)}
            />
            
            {/* Actions Menu */}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.25rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                zIndex: 20,
                minWidth: '160px'
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onWorkOrderClick?.(workOrder);
                  setShowActions(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: '#374151',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <ExternalLink style={{ width: '1rem', height: '1rem' }} />
                View Details
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInactivate(workOrder);
                  setShowActions(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: '#374151',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Archive style={{ width: '1rem', height: '1rem' }} />
                {workOrder.status === 'Complete' ? 'Archive' : 'Suspend'}
              </button>

              <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.25rem 0' }} />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(workOrder);
                  setShowActions(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: '#dc2626',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Trash2 style={{ width: '1rem', height: '1rem' }} />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Work Order Content - Click to view details */}
      <div
        style={{
          cursor: 'pointer',
          marginBottom: '1rem'
        }}
        onClick={() => onWorkOrderClick?.(workOrder)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#2563eb'
          }}>
            {workOrder.wo_number}
          </span>
          
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.375rem',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: getStatusColor(workOrder.status),
            backgroundColor: getStatusBgColor(workOrder.status)
          }}>
            {getStatusIcon(workOrder.status)}
            {workOrder.status}
          </span>
          
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: '500',
            color: 'white',
            backgroundColor: getPriorityColor(workOrder.priority)
          }}>
            {workOrder.priority}
          </span>
        </div>

        {/* Problem Description */}
        <p style={{
          color: '#111827',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          marginBottom: '1rem'
        }}>
          {workOrder.problem_description}
        </p>

        {/* Work Order Details */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          fontSize: '0.75rem',
          color: '#6b7280'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar style={{ width: '0.875rem', height: '0.875rem' }} />
            <span>Created: {formatDate(workOrder.created_at)}</span>
          </div>
          
          {workOrder.scheduled_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Clock style={{ width: '0.875rem', height: '0.875rem' }} />
              <span>
                Scheduled: {formatDate(workOrder.scheduled_date)}
                {workOrder.scheduled_time_slot && ` at ${workOrder.scheduled_time_slot}`}
              </span>
            </div>
          )}
          
          {(workOrder.tech_first_name || workOrder.tech_last_name) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <User style={{ width: '0.875rem', height: '0.875rem' }} />
              <span>
                Tech: {workOrder.tech_first_name} {workOrder.tech_last_name}
              </span>
            </div>
          )}
          
          {workOrder.equipment_type && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Wrench style={{ width: '0.875rem', height: '0.875rem' }} />
              <span>
                {workOrder.equipment_type}
                {workOrder.equipment_number && ` #${workOrder.equipment_number}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const CustomerWorkOrders: React.FC<CustomerWorkOrdersProps> = ({ 
  customer, 
  onWorkOrderClick,
  onCreateWorkOrder 
}) => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CustomerWorkOrdersFilters>({
    status: 'all',
    sort: 'recent',
    limit: 50
  });

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    isDestructive: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
    isDestructive: false
  });

  // Load work orders when component mounts or filters change
  useEffect(() => {
    loadWorkOrders();
  }, [customer.id, filters]);

const loadWorkOrders = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(`http://localhost:5000/api/customers/${customer.id}/work-orders?page=1&limit=${filters.limit}&sort=${filters.sort}${filters.status !== 'all' ? `&status=${filters.status}` : ''}`);
    
    if (response.ok) {
      const data = await response.json();
      // NEW: Access workOrders from the response object
      setWorkOrders(data.workOrders || []);  // ← This is the key change
    } else {
      setError('Failed to load work orders');
    }
  } catch (error) {
    console.error('Error loading work orders:', error);
    setError('Failed to load work orders');
  } finally {
    setLoading(false);
  }
};

  // Delete work order with confirmation modal
  const handleDeleteWorkOrder = async (workOrder: WorkOrder) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Work Order',
      message: `Are you sure you want to delete Work Order ${workOrder.wo_number}? This action cannot be undone.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/work-orders/${workOrder.id}`, {
            method: 'DELETE'
          });

          if (response.ok) {
            console.log(`Work order ${workOrder.wo_number} deleted successfully`);
            loadWorkOrders(); // Refresh the list
          } else {
            throw new Error('Failed to delete work order');
          }
        } catch (err: any) {
          console.error('Error deleting work order:', err);
          alert('Failed to delete work order. Please try again.');
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  // Suspend/Archive work order with confirmation modal
  const handleInactivateWorkOrder = async (workOrder: WorkOrder) => {
    const action = workOrder.status === 'Complete' ? 'archive' : 'suspend';
    const actionText = workOrder.status === 'Complete' ? 'archived' : 'suspended';
    
    setConfirmModal({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Work Order`,
      message: `Are you sure you want to ${action} Work Order ${workOrder.wo_number}?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      isDestructive: false,
      onConfirm: async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/work-orders/${workOrder.id}/suspend`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              notes: `Work order ${actionText} from customer management`
            })
          });

          if (response.ok) {
            console.log(`Work order ${workOrder.wo_number} ${actionText} successfully`);
            loadWorkOrders(); // Refresh the list
          } else {
            throw new Error(`Failed to ${action} work order`);
          }
        } catch (err: any) {
          console.error(`Error ${action}ing work order:`, err);
          alert(`Failed to ${action} work order. Please try again.`);
        }
        setConfirmModal({ ...confirmModal, isOpen: false });
      }
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem'
      }}>
        <div style={{
          width: '2rem',
          height: '2rem',
          border: '2px solid #e5e7eb',
          borderTop: '2px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ marginLeft: '0.75rem', color: '#6b7280' }}>Loading work orders...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '0.5rem',
        padding: '1.5rem',
        textAlign: 'center'
      }}>
        <AlertCircle style={{
          width: '2rem',
          height: '2rem',
          color: '#dc2626',
          margin: '0 auto 0.5rem'
        }} />
        <p style={{ color: '#991b1b', fontWeight: '500' }}>Failed to load work orders</p>
        <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>{error}</p>
        <button 
          onClick={loadWorkOrders}
          style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header with filters and create button */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              Work Orders ({workOrders.length})
            </h3>
            
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  color: '#374151'
                }}
              >
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Suspended">Suspended</option>
                <option value="Complete">Complete</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SortAsc style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
              <select
                value={filters.sort}
                onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value as any }))}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  color: '#374151'
                }}
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="status">By Status</option>
                <option value="priority">By Priority</option>
              </select>
            </div>
          </div>

          {/* Create Work Order Button */}
          {onCreateWorkOrder && (
            <button
              onClick={() => onCreateWorkOrder(customer)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.2s ease'
              }}
            >
              <Plus style={{ width: '1rem', height: '1rem' }} />
              New Work Order
            </button>
          )}
        </div>

        {/* Work Orders Grid/Cards */}
        {workOrders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.75rem',
            border: '2px dashed #d1d5db'
          }}>
            <FileText style={{
              width: '3rem',
              height: '3rem',
              color: '#9ca3af',
              margin: '0 auto 1rem auto'
            }} />
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '500',
              color: '#111827',
              marginBottom: '0.5rem'
            }}>
              No work orders found
            </h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1rem'
            }}>
              {filters.status !== 'all' 
                ? `No work orders with status "${filters.status}"`
                : `${customer.name} doesn't have any work orders yet`
              }
            </p>
            {onCreateWorkOrder && (
              <button
                onClick={() => onCreateWorkOrder(customer)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Create First Work Order
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
          }}>
            {workOrders.map((workOrder) => (
              <WorkOrderCard
                key={workOrder.id}
                workOrder={workOrder}
                onWorkOrderClick={onWorkOrderClick}
                onDelete={handleDeleteWorkOrder}
                onInactivate={handleInactivateWorkOrder}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        isDestructive={confirmModal.isDestructive}
      />
    </>
  );
};

export default CustomerWorkOrders;