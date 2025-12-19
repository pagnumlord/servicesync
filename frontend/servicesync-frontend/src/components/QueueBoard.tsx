// QueueBoard.tsx - Vision-inspired queue management view
import React, { useState, useEffect } from 'react';
import {
  Clock,
  Package,
  RotateCcw,
  ShoppingCart,
  Calendar,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  MapPin,
  Phone
} from 'lucide-react';

interface Queue {
  id: number;
  queue_name: string;
  queue_type: string;
  color: string;
  display_order: number;
  work_order_count: number;
  priority_count: number;
}

interface WorkOrder {
  work_order_id: number;
  work_order_number: string;
  customer_id: number;
  status: string;
  created_at: string;
  scheduled_date: string | null;
  technician_id: number | null;
  queue_assigned_at: string;
  queue_priority: number;
  assignment_notes: string | null;
  // Additional fields from joins
  customer_name?: string;
  technician_name?: string;
  customer_phone?: string;
  service_address?: string;
}

const QueueBoard: React.FC = () => {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [expandedQueue, setExpandedQueue] = useState<number | null>(null);
  const [queueWorkOrders, setQueueWorkOrders] = useState<{ [key: number]: WorkOrder[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load all queues on mount
  useEffect(() => {
    loadQueues();

    // Set up real-time updates via Socket.IO
    const socket = (window as any).io?.('http://localhost:5000');

    if (socket) {
      socket.on('queueUpdated', () => {
        loadQueues();
        // Reload expanded queue if any
        if (expandedQueue !== null) {
          loadQueueWorkOrders(expandedQueue, queues.find(q => q.id === expandedQueue)?.queue_name || '');
        }
      });

      socket.on('purchaseOrderCreated', () => {
        loadQueues();
      });

      socket.on('purchaseOrderReceived', () => {
        loadQueues();
      });

      socket.on('workOrderCheckedOut', () => {
        loadQueues();
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [expandedQueue, queues]);

  const loadQueues = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/queues');
      if (response.ok) {
        const data = await response.json();
        setQueues(data.queues || []);
      } else {
        throw new Error('Failed to load queues');
      }
    } catch (err: any) {
      console.error('Queue load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadQueueWorkOrders = async (queueId: number, queueName: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/queues/${encodeURIComponent(queueName)}/work-orders`);
      if (response.ok) {
        const data = await response.json();
        setQueueWorkOrders(prev => ({ ...prev, [queueId]: data.work_orders || [] }));
      }
    } catch (err: any) {
      console.error('Queue work orders load error:', err);
    }
  };

  const toggleQueue = (queueId: number, queueName: string) => {
    if (expandedQueue === queueId) {
      setExpandedQueue(null);
    } else {
      setExpandedQueue(queueId);
      if (!queueWorkOrders[queueId]) {
        loadQueueWorkOrders(queueId, queueName);
      }
    }
  };

  const getQueueIcon = (queueName: string) => {
    switch (queueName) {
      case 'Unassigned':
        return <Clock size={20} />;
      case 'Needs Parts':
        return <Package size={20} />;
      case 'Needs Return Trip':
        return <RotateCcw size={20} />;
      case 'Parts Ordered':
        return <ShoppingCart size={20} />;
      case 'Ready to Schedule':
        return <Calendar size={20} />;
      case 'Invoice Review':
        return <FileText size={20} />;
      case 'Callback':
        return <AlertCircle size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && queues.length === 0) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px'
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '4px solid #E5E7EB',
          borderTop: '4px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Queue Management
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6B7280'
          }}>
            Vision-inspired work order queue system
          </p>
        </div>
        <div style={{
          padding: '0.75rem 1rem',
          backgroundColor: '#F3F4F6',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151'
        }}>
          {queues.reduce((sum, q) => sum + q.work_order_count, 0)} Total Work Orders
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="#DC2626" />
          <span style={{ color: '#991B1B', fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {/* Queue List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {queues.map((queue) => (
          <div
            key={queue.id}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '0.75rem',
              backgroundColor: 'white',
              overflow: 'hidden',
              transition: 'all 0.2s ease'
            }}
          >
            {/* Queue Header */}
            <div
              onClick={() => toggleQueue(queue.id, queue.queue_name)}
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: expandedQueue === queue.id ? '#F9FAFB' : 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (expandedQueue !== queue.id) {
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (expandedQueue !== queue.id) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Queue Icon */}
                <div style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '0.5rem',
                  backgroundColor: queue.color + '20',
                  color: queue.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getQueueIcon(queue.queue_name)}
                </div>

                {/* Queue Name & Count */}
                <div>
                  <h3 style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '0.25rem'
                  }}>
                    {queue.queue_name}
                  </h3>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#6B7280'
                  }}>
                    {queue.work_order_count} work order{queue.work_order_count !== 1 ? 's' : ''}
                    {queue.priority_count > 0 && (
                      <span style={{
                        marginLeft: '0.5rem',
                        color: '#DC2626',
                        fontWeight: '500'
                      }}>
                        • {queue.priority_count} priority
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Expand/Collapse Icon */}
              <div style={{ color: '#9CA3AF' }}>
                {expandedQueue === queue.id ? (
                  <ChevronUp size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
              </div>
            </div>

            {/* Work Orders List (Expanded) */}
            {expandedQueue === queue.id && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#F9FAFB',
                borderTop: '1px solid #E5E7EB'
              }}>
                {queueWorkOrders[queue.id]?.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '2rem',
                    color: '#9CA3AF',
                    fontSize: '0.875rem'
                  }}>
                    No work orders in this queue
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {queueWorkOrders[queue.id]?.map((wo) => (
                      <div
                        key={wo.work_order_id}
                        style={{
                          padding: '1rem',
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          {/* Work Order Info */}
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#111827',
                              marginBottom: '0.5rem'
                            }}>
                              WO #{wo.work_order_number}
                              {wo.queue_priority > 0 && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  padding: '0.125rem 0.5rem',
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '600'
                                }}>
                                  PRIORITY
                                </span>
                              )}
                            </div>

                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '0.5rem',
                              fontSize: '0.75rem',
                              color: '#6B7280'
                            }}>
                              {wo.customer_name && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <User size={14} />
                                  {wo.customer_name}
                                </div>
                              )}
                              {wo.technician_name && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <User size={14} style={{ color: '#3B82F6' }} />
                                  Tech: {wo.technician_name}
                                </div>
                              )}
                              {wo.service_address && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <MapPin size={14} />
                                  {wo.service_address}
                                </div>
                              )}
                              {wo.scheduled_date && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <Calendar size={14} />
                                  {formatDate(wo.scheduled_date)}
                                </div>
                              )}
                            </div>

                            {wo.assignment_notes && (
                              <div style={{
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                backgroundColor: '#F3F4F6',
                                borderRadius: '0.25rem',
                                fontSize: '0.75rem',
                                color: '#4B5563',
                                fontStyle: 'italic'
                              }}>
                                {wo.assignment_notes}
                              </div>
                            )}
                          </div>

                          {/* Status Badge */}
                          <div style={{
                            padding: '0.25rem 0.75rem',
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            whiteSpace: 'nowrap'
                          }}>
                            {wo.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QueueBoard;
