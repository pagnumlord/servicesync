// Tasks.tsx - Internal company task management (separate from customer work orders)
import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  User,
  Clock,
  Flag,
  Filter,
  CheckCircle,
  Circle,
  AlertCircle,
  Trash2,
  Edit2,
  X
} from 'lucide-react';

interface Task {
  id: number;
  title: string;
  description?: string;
  category: 'Administrative' | 'Maintenance' | 'Follow-up' | 'Inventory' | 'Training' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  assigned_to_id?: number;
  assigned_to_name?: string;
  due_date?: string;
  completed_date?: string;
  created_at: string;
  notes?: string;
}

const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [filterStatus, filterCategory]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const response = await fetch(`${API_BASE_URL}/tasks?${params}`);
      const data = await response.json();

      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: number, updates: Partial<Task>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return '#DC2626';
      case 'High': return '#F59E0B';
      case 'Medium': return '#3B82F6';
      case 'Low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed': return <CheckCircle size={20} />;
      case 'In Progress': return <Clock size={20} />;
      case 'Cancelled': return <X size={20} />;
      default: return <Circle size={20} />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Administrative': return '#7C3AED';
      case 'Maintenance': return '#F59E0B';
      case 'Follow-up': return '#10B981';
      case 'Inventory': return '#3B82F6';
      case 'Training': return '#EC4899';
      default: return '#6B7280';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterCategory !== 'all' && task.category !== filterCategory) return false;
    return true;
  });

  const taskStats = stats || {
    total_tasks: 0,
    pending_count: 0,
    in_progress_count: 0,
    completed_count: 0,
    overdue_count: 0
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: 0
          }}>
            Task Management
          </h1>
          <p style={{
            color: '#6B7280',
            marginTop: '0.5rem'
          }}>
            Internal company tasks and reminders (separate from customer work orders)
          </p>
        </div>

        <button
          onClick={() => setShowNewTaskModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#7C3AED',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={20} />
          New Task
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <StatCard title="Total Tasks" value={taskStats.total_tasks} color="#7C3AED" />
        <StatCard title="Pending" value={taskStats.pending_count} color="#3B82F6" />
        <StatCard title="In Progress" value={taskStats.in_progress_count} color="#F59E0B" />
        <StatCard title="Completed" value={taskStats.completed_count} color="#10B981" />
        <StatCard title="Overdue" value={taskStats.overdue_count} color="#DC2626" />
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #E5E7EB',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} style={{ color: '#6B7280' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
              Filters:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Status:</span>
            {['all', 'Pending', 'In Progress', 'Completed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: filterStatus === status ? '#7C3AED' : 'white',
                  color: filterStatus === status ? 'white' : '#6B7280',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: '500'
                }}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Category:</span>
            {['all', 'Administrative', 'Maintenance', 'Follow-up', 'Inventory'].map(category => (
              <button
                key={category}
                onClick={() => setFilterCategory(category)}
                style={{
                  padding: '0.375rem 0.75rem',
                  backgroundColor: filterCategory === category ? '#7C3AED' : 'white',
                  color: filterCategory === category ? 'white' : '#6B7280',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: '500'
                }}
              >
                {category === 'all' ? 'All' : category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #E5E7EB',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <p>Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <CheckSquare size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No tasks found matching your filters</p>
          </div>
        ) : (
          <div style={{ padding: '1.5rem' }}>
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdate={handleUpdateTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Task Modal Placeholder */}
      {showNewTaskModal && (
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
            padding: '2rem',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Create New Task
            </h3>
            <p style={{ color: '#6B7280', marginBottom: '2rem' }}>
              Full task creation form coming soon. This will allow you to create internal company tasks
              like vehicle maintenance, follow-ups, inventory reminders, and administrative tasks.
            </p>
            <button
              onClick={() => setShowNewTaskModal(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: number; color: string }> = ({ title, value, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    border: '1px solid #E5E7EB',
    padding: '1.25rem',
    textAlign: 'center'
  }}>
    <div style={{
      fontSize: '2rem',
      fontWeight: '700',
      color: color,
      marginBottom: '0.25rem'
    }}>
      {value}
    </div>
    <div style={{
      fontSize: '0.875rem',
      color: '#6B7280'
    }}>
      {title}
    </div>
  </div>
);

const TaskCard: React.FC<{
  task: Task;
  onUpdate: (taskId: number, updates: Partial<Task>) => void;
  onDelete: (taskId: number) => void;
}> = ({ task, onUpdate, onDelete }) => {
  const isOverdue = task.status !== 'Completed' && task.due_date && new Date(task.due_date) < new Date();

  return (
    <div style={{
      backgroundColor: '#F9FAFB',
      borderRadius: '0.5rem',
      border: '1px solid #E5E7EB',
      padding: '1.25rem',
      marginBottom: '1rem',
      transition: 'all 0.2s'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.5rem'
          }}>
            <div style={{ color: task.status === 'Completed' ? '#10B981' : '#6B7280' }}>
              {getStatusIcon(task.status)}
            </div>
            <h4 style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1F2937',
              textDecoration: task.status === 'Completed' ? 'line-through' : 'none'
            }}>
              {task.title}
            </h4>
          </div>

          {task.description && (
            <p style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              color: '#6B7280',
              paddingLeft: '2rem'
            }}>
              {task.description}
            </p>
          )}

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingLeft: '2rem',
            fontSize: '0.8125rem',
            color: '#6B7280'
          }}>
            {task.due_date && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: isOverdue ? '#DC2626' : '#6B7280'
              }}>
                <Calendar size={14} />
                {new Date(task.due_date).toLocaleDateString()}
                {isOverdue && <span style={{ fontWeight: '600' }}>(Overdue)</span>}
              </div>
            )}

            {task.assigned_to_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <User size={14} />
                {task.assigned_to_name}
              </div>
            )}

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: getCategoryColor(task.category) + '20',
              color: getCategoryColor(task.category),
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              {task.category}
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.125rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: getPriorityColor(task.priority) + '20',
              color: getPriorityColor(task.priority),
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              <Flag size={12} />
              {task.priority}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: '#3B82F6',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
            title="Edit Task"
          >
            <Edit2 size={16} />
          </button>
          <button
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              color: '#DC2626',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer'
            }}
            title="Delete Task"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

function getStatusIcon(status: string) {
  switch (status) {
    case 'Completed': return <CheckCircle size={20} />;
    case 'In Progress': return <Clock size={20} />;
    case 'Cancelled': return <X size={20} />;
    default: return <Circle size={20} />;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case 'Administrative': return '#7C3AED';
    case 'Maintenance': return '#F59E0B';
    case 'Follow-up': return '#10B981';
    case 'Inventory': return '#3B82F6';
    case 'Training': return '#EC4899';
    default: return '#6B7280';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'Urgent': return '#DC2626';
    case 'High': return '#F59E0B';
    case 'Medium': return '#3B82F6';
    case 'Low': return '#6B7280';
    default: return '#6B7280';
  }
}

export default Tasks;
