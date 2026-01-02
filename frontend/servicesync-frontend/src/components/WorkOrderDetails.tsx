// WorkOrderDetails.tsx - Professional ERP-grade work order view
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
  CheckCircle,
  CheckSquare,
  Pause,
  Play,
  Archive,
  Receipt,
  ShoppingCart,
  Paperclip,
  Eye,
  Users,
  Building2,
  Info,
  Activity,
  MessageSquare,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import { WorkOrder } from '../types';
import RegisterTab from './RegisterTab';

interface WorkOrderDetailsProps {
  workOrder: WorkOrder;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedWorkOrder: WorkOrder) => void;
  onNavigateToCustomer?: (customerId: number) => void;
}

const WorkOrderDetails: React.FC<WorkOrderDetailsProps> = ({
  workOrder,
  isOpen,
  onClose,
  onUpdate,
  onNavigateToCustomer
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'register' | 'assignments' | 'timeline' | 'parts' | 'labor' | 'attachments'>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorkOrder, setEditedWorkOrder] = useState<WorkOrder>(workOrder);

  // Assignment editing state
  const [editingField, setEditingField] = useState<'tech' | 'date' | 'timeslot' | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Work Queues state
  const [allQueues, setAllQueues] = useState<any[]>([]);
  const [queueAssignments, setQueueAssignments] = useState<Set<number>>(new Set());
  const [loadingQueues, setLoadingQueues] = useState(false);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const timeSlots = [
    'First AM',
    'AM',
    'Lunch',
    'PM',
    'Last PM',
    'Unscheduled'
  ];

  useEffect(() => {
    setEditedWorkOrder(workOrder);
  }, [workOrder]);

  // Load technicians when Assignments tab is active
  useEffect(() => {
    if (activeTab === 'assignments' && technicians.length === 0) {
      loadTechnicians();
    }
  }, [activeTab]);

  // Load attachments when Attachments tab is active
  useEffect(() => {
    if (activeTab === 'attachments') {
      loadAttachments();
    }
  }, [activeTab]);

  // Load queues and queue assignments when component mounts
  useEffect(() => {
    if (isOpen) {
      loadQueues();
      loadQueueAssignments();
    }
  }, [isOpen, workOrder.id]);

  const loadTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      const response = await fetch(`${API_BASE}/technicians`);
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const handleAssignmentUpdate = async (field: 'tech' | 'date' | 'timeslot', value: any) => {
    try {
      let endpoint = '';
      let body: any = {};

      if (field === 'tech') {
        if (value === null) {
          // Unassign
          endpoint = `${API_BASE}/work-orders/${workOrder.id}/unassign`;
          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: 'Unassigned from work order details' })
          });
          if (response.ok && onUpdate) {
            const updated = await response.json();
            onUpdate(updated.workOrder);
          }
        } else {
          // Assign to tech
          endpoint = `${API_BASE}/work-orders/${workOrder.id}/assign`;
          body = {
            tech_id: value,
            scheduled_date: workOrder.scheduled_date || new Date().toISOString().split('T')[0],
            scheduled_time_slot: workOrder.scheduled_time_slot || 'Unscheduled'
          };
          const response = await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
          if (response.ok && onUpdate) {
            const updated = await response.json();
            onUpdate(updated.workOrder);
          }
        }
      } else if (field === 'date' || field === 'timeslot') {
        // Update via assign endpoint
        endpoint = `${API_BASE}/work-orders/${workOrder.id}/assign`;
        body = {
          tech_id: workOrder.assigned_tech_id,
          scheduled_date: field === 'date' ? value : workOrder.scheduled_date,
          scheduled_time_slot: field === 'timeslot' ? value : workOrder.scheduled_time_slot
        };
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (response.ok && onUpdate) {
          const updated = await response.json();
          onUpdate(updated.workOrder);
        }
      }

      setEditingField(null);
    } catch (error) {
      console.error('Error updating assignment:', error);
    }
  };

  const loadAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/attachments`);
      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    const formData = new FormData();

    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/attachments`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        await loadAttachments(); // Reload attachments list
      } else {
        console.error('Upload failed:', await response.text());
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;

    try {
      const response = await fetch(
        `${API_BASE}/work-orders/${workOrder.id}/attachments/${attachmentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        await loadAttachments(); // Reload attachments list
      }
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  // Load all available queues
  const loadQueues = async () => {
    try {
      const response = await fetch(`${API_BASE}/queues`);
      if (response.ok) {
        const data = await response.json();
        setAllQueues(data.queues || []);
      }
    } catch (error) {
      console.error('Error loading queues:', error);
    }
  };

  // Load current queue assignments for this work order
  const loadQueueAssignments = async () => {
    setLoadingQueues(true);
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/queue-assignments`);
      if (response.ok) {
        const data = await response.json();
        const assignedQueueIds = new Set<number>(data.queues.map((q: any) => Number(q.queue_id)));
        setQueueAssignments(assignedQueueIds);
      }
    } catch (error) {
      console.error('Error loading queue assignments:', error);
    } finally {
      setLoadingQueues(false);
    }
  };

  // Toggle work order in/out of a queue
  const handleQueueToggle = async (queueId: number, isCurrentlyAssigned: boolean) => {
    try {
      if (isCurrentlyAssigned) {
        // Remove from queue
        const response = await fetch(
          `${API_BASE}/work-orders/${workOrder.id}/queue-assignments/${queueId}`,
          {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: null })
          }
        );
        if (response.ok) {
          setQueueAssignments(prev => {
            const newSet = new Set(prev);
            newSet.delete(queueId);
            return newSet;
          });
        }
      } else {
        // Add to queue
        const response = await fetch(
          `${API_BASE}/work-orders/${workOrder.id}/queue-assignments/${queueId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: null })
          }
        );
        if (response.ok) {
          setQueueAssignments(prev => new Set([...prev, queueId]));
        }
      }
    } catch (error) {
      console.error('Error toggling queue assignment:', error);
    }
  };

  const getFileIcon = (filename: string) => {
    if (!filename) return '📎';
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return null; // Return null for images - we'll show preview instead
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📎';
    }
  };

  const isImage = (filename: string) => {
    if (!filename) return false;
    const ext = filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'complete':
      case 'completed':
        return '#10B981';
      case 'in progress':
        return '#3B82F6';
      case 'suspended':
        return '#F59E0B';
      case 'open':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getUrgencyConfig = (urgency?: string) => {
    switch (urgency) {
      case 'Emergency':
        return { color: '#EF4444', icon: '🔴', label: 'Emergency' };
      case 'Urgent':
        return { color: '#F59E0B', icon: '🟡', label: 'Urgent' };
      default:
        return { color: '#10B981', icon: '🟢', label: 'Default' };
    }
  };

  const urgencyConfig = getUrgencyConfig(workOrder.call_urgency);

  const handleComplete = async () => {
    // TODO: API call to complete work order
    console.log('Complete work order:', workOrder.id);
  };

  const handleSuspend = async () => {
    // TODO: API call to suspend work order
    console.log('Suspend work order:', workOrder.id);
  };

  const handleResume = async () => {
    // TODO: API call to resume work order
    console.log('Resume work order:', workOrder.id);
  };

  const handleToggleMultiDay = async () => {
    try {
      if (workOrder.is_multi_day) {
        // Convert to single-day
        const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/make-single-day`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const updated = await response.json();
          const newWorkOrder = { ...editedWorkOrder, ...updated.work_order };
          setEditedWorkOrder(newWorkOrder);
          onUpdate?.(newWorkOrder);
        }
      } else {
        // Convert to multi-day - set today as start and tomorrow as end by default
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/make-multi-day`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_start_date: today,
            project_end_date: tomorrow,
            estimated_hours: null,
            project_notes: ''
          })
        });

        if (response.ok) {
          const updated = await response.json();
          const newWorkOrder = { ...editedWorkOrder, ...updated.work_order };
          setEditedWorkOrder(newWorkOrder);
          onUpdate?.(newWorkOrder);
        }
      }
    } catch (error) {
      console.error('Error toggling multi-day:', error);
      alert('Failed to update multi-day status');
    }
  };

  const handleMultiDayUpdate = async (field: string, value: any) => {
    const updates: any = {
      project_start_date: workOrder.project_start_date,
      project_end_date: workOrder.project_end_date,
      estimated_hours: workOrder.estimated_hours,
      project_notes: workOrder.project_notes
    };

    if (field === 'start_date') updates.project_start_date = value;
    else if (field === 'end_date') updates.project_end_date = value;
    else if (field === 'estimated_hours') updates.estimated_hours = value ? parseFloat(value) : null;
    else if (field === 'project_notes') updates.project_notes = value;

    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrder.id}/make-multi-day`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updated = await response.json();
        setEditedWorkOrder({ ...editedWorkOrder, ...updated.work_order });
        onUpdate?.();
      }
    } catch (error) {
      console.error('Error updating multi-day project:', error);
    }
  };

  const tabs = [
    { id: 'details' as const, label: 'Details', icon: Info },
    { id: 'register' as const, label: 'Register', icon: Receipt },
    { id: 'assignments' as const, label: 'Assignments', icon: Calendar },
    { id: 'timeline' as const, label: 'Timeline', icon: Activity },
    { id: 'parts' as const, label: 'Parts & Materials', icon: Package },
    { id: 'labor' as const, label: 'Labor & Time', icon: Clock },
    { id: 'attachments' as const, label: 'Attachments', icon: Paperclip }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#F9FAFB'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '1.75rem',
                  fontWeight: '700',
                  color: '#111827'
                }}>
                  {workOrder.wo_number}
                </h2>

                {/* Status Badge */}
                <div style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  backgroundColor: `${getStatusColor(workOrder.status)}20`,
                  border: `2px solid ${getStatusColor(workOrder.status)}`,
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: getStatusColor(workOrder.status)
                }}>
                  {workOrder.status}
                </div>

                {/* Urgency Badge */}
                {workOrder.call_urgency && workOrder.call_urgency !== 'Default' && (
                  <div style={{
                    padding: '0.375rem 0.875rem',
                    borderRadius: '9999px',
                    backgroundColor: `${urgencyConfig.color}20`,
                    border: `2px solid ${urgencyConfig.color}`,
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: urgencyConfig.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem'
                  }}>
                    <span>{urgencyConfig.icon}</span>
                    {urgencyConfig.label}
                  </div>
                )}
              </div>

              {/* Customer Name - Clickable */}
              <div
                onClick={() => onNavigateToCustomer?.(workOrder.customer_id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '1.125rem',
                  color: '#3B82F6',
                  fontWeight: '600',
                  cursor: onNavigateToCustomer ? 'pointer' : 'default',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => onNavigateToCustomer && (e.currentTarget.style.color = '#2563EB')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#3B82F6')}
              >
                <Building2 size={18} />
                {workOrder.customer_name}
              </div>

              {/* Service Address */}
              {workOrder.service_city && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  marginTop: '0.25rem',
                  fontSize: '0.875rem',
                  color: '#6B7280'
                }}>
                  <MapPin size={14} />
                  {workOrder.service_city}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Quick Actions */}
              {workOrder.status !== 'Complete' && workOrder.status !== 'Completed' && (
                <>
                  {workOrder.status === 'Suspended' ? (
                    <button
                      onClick={handleResume}
                      style={{
                        padding: '0.625rem 1.25rem',
                        backgroundColor: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <Play size={16} />
                      Resume
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleSuspend}
                        style={{
                          padding: '0.625rem 1.25rem',
                          backgroundColor: 'white',
                          color: '#6B7280',
                          border: '2px solid #E5E7EB',
                          borderRadius: '0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <Pause size={16} />
                        Suspend
                      </button>
                      <button
                        onClick={handleComplete}
                        style={{
                          padding: '0.625rem 1.25rem',
                          backgroundColor: '#10B981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                        }}
                      >
                        <CheckCircle size={16} />
                        Complete
                      </button>
                    </>
                  )}
                </>
              )}

              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6B7280'
                }}
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '2px solid #E5E7EB',
            marginTop: '1rem',
            paddingBottom: '0px'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '3px solid #3B82F6' : '3px solid transparent',
                    cursor: 'pointer',
                    fontSize: '0.9375rem',
                    fontWeight: isActive ? '700' : '500',
                    color: isActive ? '#3B82F6' : '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '-2px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#374151';
                      e.currentTarget.style.borderBottomColor = '#D1D5DB';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#6B7280';
                      e.currentTarget.style.borderBottomColor = 'transparent';
                    }
                  }}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {activeTab === 'details' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Problem Description */}
                <div style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  border: '2px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <FileText size={20} style={{ color: '#3B82F6' }} />
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      Problem Description
                    </h3>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9375rem',
                    lineHeight: '1.6',
                    color: '#374151',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {workOrder.problem_description || 'No description provided'}
                  </p>
                </div>

                {/* Equipment Info */}
                {workOrder.equipment_type && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '2px solid #E5E7EB'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <Wrench size={20} style={{ color: '#3B82F6' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        Equipment
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Type:</span>
                        <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{workOrder.equipment_type}</span>
                      </div>
                      {workOrder.equipment_number && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Number:</span>
                          <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{workOrder.equipment_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Scheduling Info */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  border: '2px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem'
                  }}>
                    <Calendar size={20} style={{ color: '#3B82F6' }} />
                    <h3 style={{
                      margin: 0,
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      Schedule
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {workOrder.scheduled_date && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Date:</span>
                        <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                          {new Date(workOrder.scheduled_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    {workOrder.scheduled_time_slot && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Time Slot:</span>
                        <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{workOrder.scheduled_time_slot}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Call Type:</span>
                      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{workOrder.call_type || 'Time and Material'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Call Rate:</span>
                      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                        {workOrder.call_rate === 'RT' ? 'Regular Time' : workOrder.call_rate === 'OT' ? 'Overtime' : 'Double Time'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Technician Assignment */}
                {(workOrder.tech_first_name || workOrder.tech_last_name) && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '2px solid #E5E7EB'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <User size={20} style={{ color: '#3B82F6' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        Assigned Technician
                      </h3>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '0.75rem',
                      border: '2px solid #BFDBFE'
                    }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: '700'
                      }}>
                        {workOrder.tech_first_name?.[0]}{workOrder.tech_last_name?.[0]}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: '#111827'
                        }}>
                          {workOrder.tech_first_name} {workOrder.tech_last_name}
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6B7280'
                        }}>
                          Technician
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Work Performed (if completed) */}
                {workOrder.work_performed && (
                  <div style={{
                    backgroundColor: '#F0FDF4',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '2px solid #86EFAC'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <CheckSquare size={20} style={{ color: '#10B981' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        Work Performed
                      </h3>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.9375rem',
                      lineHeight: '1.6',
                      color: '#374151',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {workOrder.work_performed}
                    </p>
                  </div>
                )}

                {/* Work Queues */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  border: '2px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Layers size={20} style={{ color: '#3B82F6' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        Work Queues
                      </h3>
                    </div>
                    <button
                      style={{
                        padding: '0.375rem 0.75rem',
                        backgroundColor: '#F3F4F6',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                    >
                      Audit Log
                    </button>
                  </div>

                  {loadingQueues ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6B7280',
                      fontSize: '0.875rem'
                    }}>
                      Loading queues...
                    </div>
                  ) : allQueues.length === 0 ? (
                    <div style={{
                      padding: '2rem',
                      textAlign: 'center',
                      color: '#6B7280',
                      fontSize: '0.875rem'
                    }}>
                      No queues configured
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      {allQueues.map((queue) => {
                        const isAssigned = queueAssignments.has(queue.id);
                        return (
                          <label
                            key={queue.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              padding: '0.75rem',
                              borderRadius: '0.5rem',
                              border: '1px solid #E5E7EB',
                              backgroundColor: isAssigned ? '#EFF6FF' : 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isAssigned) e.currentTarget.style.backgroundColor = '#F9FAFB';
                            }}
                            onMouseLeave={(e) => {
                              if (!isAssigned) e.currentTarget.style.backgroundColor = 'white';
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => handleQueueToggle(queue.id, isAssigned)}
                              style={{
                                width: '16px',
                                height: '16px',
                                cursor: 'pointer',
                                accentColor: queue.color || '#3B82F6'
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: isAssigned ? '600' : '500',
                                color: '#111827'
                              }}>
                                {queue.queue_name}
                              </div>
                            </div>
                            {queue.color && (
                              <div
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  borderRadius: '50%',
                                  backgroundColor: queue.color,
                                  border: '1px solid rgba(0,0,0,0.1)'
                                }}
                              />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cost Summary */}
                {(workOrder.total_cost || workOrder.labor_hours) && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '2px solid #E5E7EB'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '1rem'
                    }}>
                      <DollarSign size={20} style={{ color: '#3B82F6' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        Cost Summary
                      </h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {workOrder.labor_hours && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Labor Hours:</span>
                          <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>{workOrder.labor_hours} hrs</span>
                        </div>
                      )}
                      {workOrder.total_labor_cost && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Labor Cost:</span>
                          <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>${workOrder.total_labor_cost.toFixed(2)}</span>
                        </div>
                      )}
                      {workOrder.total_parts_cost && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: '500' }}>Parts Cost:</span>
                          <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>${workOrder.total_parts_cost.toFixed(2)}</span>
                        </div>
                      )}
                      {workOrder.total_cost && (
                        <>
                          <div style={{ borderTop: '2px solid #E5E7EB', marginTop: '0.5rem', paddingTop: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontSize: '1rem', color: '#111827', fontWeight: '700' }}>Total:</span>
                              <span style={{ fontSize: '1.125rem', color: '#3B82F6', fontWeight: '700' }}>${workOrder.total_cost.toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Customer PO */}
                {workOrder.customer_po && (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '1.5rem',
                    border: '2px solid #E5E7EB'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <Receipt size={20} style={{ color: '#3B82F6' }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: '#111827'
                      }}>
                        Customer PO
                      </h3>
                    </div>
                    <p style={{
                      margin: 0,
                      fontSize: '0.9375rem',
                      color: '#374151',
                      fontWeight: '600'
                    }}>
                      {workOrder.customer_po}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              {/* Current Assignment Card */}
              <div style={{
                backgroundColor: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Calendar size={20} />
                  Current Assignment
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem'
                }}>
                  {/* Assigned Technician */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6B7280',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Assigned To <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(double-click to edit)</span>
                    </label>
                    {editingField === 'tech' ? (
                      <select
                        autoFocus
                        value={workOrder.assigned_tech_id || ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value);
                          handleAssignmentUpdate('tech', value);
                        }}
                        onBlur={() => setEditingField(null)}
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          border: '2px solid #3B82F6',
                          outline: 'none'
                        }}
                      >
                        <option value="">Unassigned</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>
                            {tech.first_name} {tech.last_name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div
                        onDoubleClick={() => setEditingField('tech')}
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                          e.currentTarget.style.borderColor = '#D1D5DB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        {workOrder.tech_first_name && workOrder.tech_last_name
                          ? `${workOrder.tech_first_name} ${workOrder.tech_last_name}`
                          : 'Unassigned'}
                      </div>
                    )}
                  </div>

                  {/* Scheduled Date */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6B7280',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Scheduled Date <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(double-click to edit)</span>
                    </label>
                    {editingField === 'date' ? (
                      <input
                        type="date"
                        autoFocus
                        value={workOrder.scheduled_date || ''}
                        onChange={(e) => handleAssignmentUpdate('date', e.target.value)}
                        onBlur={() => setEditingField(null)}
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          border: '2px solid #3B82F6',
                          outline: 'none'
                        }}
                      />
                    ) : (
                      <div
                        onDoubleClick={() => setEditingField('date')}
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                          e.currentTarget.style.borderColor = '#D1D5DB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        {workOrder.scheduled_date
                          ? new Date(workOrder.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          : 'Not Scheduled'}
                      </div>
                    )}
                  </div>

                  {/* Time Slot */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6B7280',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Time Slot <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(double-click to edit)</span>
                    </label>
                    {editingField === 'timeslot' ? (
                      <select
                        autoFocus
                        value={workOrder.scheduled_time_slot || 'Unscheduled'}
                        onChange={(e) => handleAssignmentUpdate('timeslot', e.target.value)}
                        onBlur={() => setEditingField(null)}
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: 'white',
                          borderRadius: '0.5rem',
                          border: '2px solid #3B82F6',
                          outline: 'none'
                        }}
                      >
                        {timeSlots.map(slot => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    ) : (
                      <div
                        onDoubleClick={() => setEditingField('timeslot')}
                        style={{
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#F3F4F6';
                          e.currentTarget.style.borderColor = '#D1D5DB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#F9FAFB';
                          e.currentTarget.style.borderColor = '#E5E7EB';
                        }}
                      >
                        {workOrder.scheduled_time_slot || 'Unscheduled'}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6B7280',
                      marginBottom: '0.5rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Status
                    </label>
                    <div style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      borderRadius: '9999px',
                      backgroundColor: `${getStatusColor(workOrder.status || 'open')}20`,
                      border: `2px solid ${getStatusColor(workOrder.status || 'open')}`,
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: getStatusColor(workOrder.status || 'open')
                    }}>
                      {workOrder.status || 'Open'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Day Scheduling Card */}
              <div style={{
                backgroundColor: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '700',
                    color: '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <Calendar size={20} />
                    Multi-Day Project
                  </h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#6B7280',
                      textTransform: 'uppercase'
                    }}>
                      {workOrder.is_multi_day ? 'Multi-Day' : 'Single Day'}
                    </span>
                    <div style={{
                      width: '40px',
                      height: '22px',
                      backgroundColor: workOrder.is_multi_day ? '#10B981' : '#D1D5DB',
                      borderRadius: '11px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={handleToggleMultiDay}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: workOrder.is_multi_day ? '20px' : '2px',
                        width: '18px',
                        height: '18px',
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        transition: 'left 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }} />
                    </div>
                  </div>
                </div>

                {workOrder.is_multi_day ? (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem'
                  }}>
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase'
                      }}>
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={workOrder.project_start_date || ''}
                        onChange={(e) => handleMultiDayUpdate('start_date', e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase'
                      }}>
                        End Date
                      </label>
                      <input
                        type="date"
                        value={workOrder.project_end_date || ''}
                        onChange={(e) => handleMultiDayUpdate('end_date', e.target.value)}
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase'
                      }}>
                        Estimated Hours
                      </label>
                      <input
                        type="number"
                        value={workOrder.estimated_hours || ''}
                        onChange={(e) => handleMultiDayUpdate('estimated_hours', e.target.value)}
                        placeholder="0"
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase'
                      }}>
                        Project Notes
                      </label>
                      <textarea
                        value={workOrder.project_notes || ''}
                        onChange={(e) => handleMultiDayUpdate('project_notes', e.target.value)}
                        placeholder="Add notes about this multi-day project..."
                        rows={3}
                        style={{
                          width: '100%',
                          fontSize: '0.9375rem',
                          color: '#111827',
                          padding: '0.75rem',
                          backgroundColor: '#F9FAFB',
                          borderRadius: '0.5rem',
                          border: '1px solid #E5E7EB',
                          outline: 'none',
                          resize: 'vertical',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p style={{
                    margin: 0,
                    fontSize: '0.875rem',
                    color: '#6B7280',
                    fontStyle: 'italic'
                  }}>
                    This is a single-day work order. Toggle on to convert to a multi-day project.
                  </p>
                )}
              </div>

              {/* Assignment History Placeholder */}
              <div style={{
                backgroundColor: 'white',
                border: '2px solid #E5E7EB',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '700',
                  color: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Activity size={20} />
                  Assignment History
                </h3>

                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#9CA3AF'
                }}>
                  <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: '500' }}>
                    Assignment history coming soon
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8125rem' }}>
                    Track assignment changes, reassignments, and completion dates
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              maxWidth: '800px',
              margin: '0 auto'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#9CA3AF'
              }}>
                <Activity size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '500' }}>
                  Timeline feature coming soon
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                  View status changes, updates, and activity history
                </p>
              </div>
            </div>
          )}

          {activeTab === 'parts' && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9CA3AF'
            }}>
              <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '500' }}>
                Parts & Materials feature coming soon
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                Track parts used, costs, and inventory
              </p>
            </div>
          )}

          {activeTab === 'labor' && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9CA3AF'
            }}>
              <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '500' }}>
                Labor & Time feature coming soon
              </p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
                Log time entries, track labor hours, and costs
              </p>
            </div>
          )}

          {activeTab === 'register' && (
            <RegisterTab workOrderId={workOrder.id} isReadOnly={false} />
          )}

          {activeTab === 'attachments' && (
            <div style={{
              maxWidth: '900px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {/* Upload Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                style={{
                  border: `2px dashed ${dragOver ? '#3B82F6' : '#D1D5DB'}`,
                  borderRadius: '0.75rem',
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: dragOver ? '#EFF6FF' : '#F9FAFB',
                  transition: 'all 0.2s',
                  cursor: 'pointer'
                }}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  style={{ display: 'none' }}
                />
                <Paperclip size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                  {uploadingFiles ? 'Uploading...' : 'Drop files here or click to browse'}
                </p>
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
                  Upload photos, documents, PDFs, and other files
                </p>
              </div>

              {/* Attachments List */}
              {loadingAttachments ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                  Loading attachments...
                </div>
              ) : attachments.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: '#9CA3AF',
                  backgroundColor: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '0.75rem'
                }}>
                  <Paperclip size={32} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p style={{ margin: 0, fontSize: '0.9375rem' }}>No attachments yet</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '1rem'
                }}>
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      style={{
                        backgroundColor: 'white',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      {/* Image Preview or File Icon */}
                      {isImage(attachment.file_name) ? (
                        <div>
                          <img
                            src={`http://localhost:5000${attachment.file_url}`}
                            alt={attachment.file_name}
                            style={{
                              width: '100%',
                              height: '150px',
                              objectFit: 'cover',
                              borderRadius: '0.5rem',
                              marginBottom: '0.75rem'
                            }}
                          />
                          <div style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#111827',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {attachment.file_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                            {attachment.file_size && formatFileSize(attachment.file_size)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                          <span style={{ fontSize: '2rem' }}>{getFileIcon(attachment.file_name)}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {attachment.file_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                              {attachment.file_size && formatFileSize(attachment.file_size)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Upload Info */}
                      {attachment.uploaded_at && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#9CA3AF',
                          paddingTop: '0.5rem',
                          borderTop: '1px solid #E5E7EB'
                        }}>
                          {new Date(attachment.uploaded_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <a
                          href={`http://localhost:5000${attachment.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: 1,
                            padding: '0.5rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            textAlign: 'center',
                            textDecoration: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                        >
                          <Eye size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                          View
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#EF4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkOrderDetails;
