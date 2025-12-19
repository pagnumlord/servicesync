// AssignmentsTab.tsx - Track physical on-site visits via check-in/out
import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  User,
  Calendar,
  CheckCircle,
  PlayCircle,
  StopCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

interface Assignment {
  id: number;
  work_order_id: number;
  technician_id: number;
  tech_first_name: string;
  tech_last_name: string;
  tech_crew?: string;
  tech_van_number?: string;
  checked_in_at: string;
  checked_out_at?: string;
  final_status?: string;
  status_notes?: string;
  duration_minutes?: number;
}

interface AssignmentsTabProps {
  workOrderId: number;
}

const AssignmentsTab: React.FC<AssignmentsTabProps> = ({ workOrderId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, [workOrderId]);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/work-orders/${workOrderId}/assignments`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else if (response.status === 404) {
        setAssignments([]);
      } else {
        throw new Error('Failed to load assignments');
      }
    } catch (err: any) {
      console.error('Error loading assignments:', err);
      setError(err.message);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return 'In progress';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Complete': return '#10B981';
      case 'Suspended': return '#F59E0B';
      case 'Active': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'Complete': return <CheckCircle size={16} />;
      case 'Suspended': return <AlertCircle size={16} />;
      case 'Active': return <PlayCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem'
      }}>
        <div style={{
          width: '2rem',
          height: '2rem',
          border: '3px solid #E5E7EB',
          borderTop: '3px solid #3B82F6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderRadius: '0.5rem',
        textAlign: 'center'
      }}>
        <AlertCircle size={32} color="#DC2626" style={{ margin: '0 auto 0.75rem' }} />
        <p style={{ color: '#991B1B', fontWeight: '500' }}>{error}</p>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#F9FAFB',
        borderRadius: '0.75rem',
        border: '2px dashed #D1D5DB'
      }}>
        <MapPin size={48} color="#D1D5DB" style={{ margin: '0 auto 1rem' }} />
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          No site visits yet
        </h3>
        <p style={{
          fontSize: '0.875rem',
          color: '#6B7280',
          marginBottom: '0.5rem'
        }}>
          Assignment history will appear here when technicians check in and out at the customer site.
        </p>
        <p style={{
          fontSize: '0.875rem',
          color: '#9CA3AF'
        }}>
          Physical visits are tracked separately from work order assignment.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <StatCard
          label="Total Visits"
          value={assignments.length.toString()}
          icon={<MapPin size={20} />}
          color="#3B82F6"
        />
        <StatCard
          label="Total On-Site Time"
          value={formatDuration(assignments.reduce((sum, a) => sum + (a.duration_minutes || 0), 0))}
          icon={<Clock size={20} />}
          color="#10B981"
        />
        <StatCard
          label="Completed Visits"
          value={assignments.filter(a => a.checked_out_at).length.toString()}
          icon={<CheckCircle size={20} />}
          color="#8B5CF6"
        />
      </div>

      {/* Assignment Timeline */}
      <div>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Visit History
        </h4>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {assignments.map((assignment, index) => (
            <div
              key={assignment.id}
              style={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = '#3B82F6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6',
                    fontWeight: '600',
                    fontSize: '0.875rem'
                  }}>
                    {assignment.tech_first_name[0]}{assignment.tech_last_name[0]}
                  </div>
                  <div>
                    <p style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#1F2937',
                      marginBottom: '0.125rem'
                    }}>
                      {assignment.tech_first_name} {assignment.tech_last_name}
                    </p>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6B7280'
                    }}>
                      {assignment.tech_crew && `Crew ${assignment.tech_crew}`}
                      {assignment.tech_crew && assignment.tech_van_number && ' • '}
                      {assignment.tech_van_number && `Van ${assignment.tech_van_number}`}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                {assignment.final_status && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: `${getStatusColor(assignment.final_status)}20`,
                    color: getStatusColor(assignment.final_status),
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {getStatusIcon(assignment.final_status)}
                    {assignment.final_status}
                  </div>
                )}
              </div>

              {/* Visit Details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                padding: '1rem',
                backgroundColor: '#F9FAFB',
                borderRadius: '0.5rem'
              }}>
                {/* Check In */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <PlayCircle size={16} color="#10B981" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                  <div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginBottom: '0.125rem',
                      fontWeight: '500'
                    }}>
                      Checked In
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#1F2937',
                      fontWeight: '500'
                    }}>
                      {formatDateTime(assignment.checked_in_at)}
                    </p>
                  </div>
                </div>

                {/* Check Out */}
                {assignment.checked_out_at ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <StopCircle size={16} color="#EF4444" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        marginBottom: '0.125rem',
                        fontWeight: '500'
                      }}>
                        Checked Out
                      </p>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#1F2937',
                        fontWeight: '500'
                      }}>
                        {formatDateTime(assignment.checked_out_at)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <Clock size={16} color="#F59E0B" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        marginBottom: '0.125rem',
                        fontWeight: '500'
                      }}>
                        Status
                      </p>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#F59E0B',
                        fontWeight: '600'
                      }}>
                        Still on site
                      </p>
                    </div>
                  </div>
                )}

                {/* Duration */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Clock size={16} color="#3B82F6" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
                  <div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginBottom: '0.125rem',
                      fontWeight: '500'
                    }}>
                      Duration
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#1F2937',
                      fontWeight: '500'
                    }}>
                      {formatDuration(assignment.duration_minutes)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Notes */}
              {assignment.status_notes && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <FileText size={14} color="#92400E" />
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: '#92400E',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Notes
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#78350F',
                    lineHeight: '1.5',
                    margin: 0
                  }}>
                    {assignment.status_notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, icon, color }) => (
  <div style={{
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '0.75rem',
      backgroundColor: `${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color
    }}>
      {icon}
    </div>
    <div>
      <p style={{
        fontSize: '0.75rem',
        color: '#6B7280',
        marginBottom: '0.25rem',
        fontWeight: '500'
      }}>
        {label}
      </p>
      <p style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1F2937',
        lineHeight: 1
      }}>
        {value}
      </p>
    </div>
  </div>
);

export default AssignmentsTab;
