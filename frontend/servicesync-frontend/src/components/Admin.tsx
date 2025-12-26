import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  UserPlus,
  Edit2,
  Save,
  X,
  CheckSquare,
  Square,
  Eye,
  EyeOff,
  Lock,
  AlertCircle,
  Wrench,
  Upload,
  Camera
} from 'lucide-react';

// ================================
// TYPE DEFINITIONS
// ================================

interface User {
  id: number;
  employee_number: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Queue {
  id: number;
  name: string;
  color: string;
  display_order: number;
}

interface QueuePermission {
  user_id: number;
  queue_id: number;
  can_view: boolean;
}

interface Technician {
  id: number;
  tech_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  crew: string;
  van_number: string;
  skills: string[];
  profile_image?: string;
  current_location?: string;
}

// ================================
// MAIN COMPONENT
// ================================

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'technicians'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [permissions, setPermissions] = useState<QueuePermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<number | null>(null);

  // Technician management state
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showNewTechModal, setShowNewTechModal] = useState(false);
  const [editingTech, setEditingTech] = useState<number | null>(null);

  // New user form state
  const [newUser, setNewUser] = useState({
    employee_number: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'technician'
  });

  // New technician form state
  const [newTech, setNewTech] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    crew: '',
    van_number: '',
    skills: '',
    profile_image: ''
  });

  // Load users
  const loadUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  // Load queues
  const loadQueues = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/work-orders/queues');
      if (response.ok) {
        const data = await response.json();
        setQueues(data);
      }
    } catch (error) {
      console.error('Failed to load queues:', error);
    }
  };

  // Load permissions
  const loadPermissions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/queue-permissions');
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  // Load technicians
  const loadTechnicians = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/technicians');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      }
    } catch (error) {
      console.error('Failed to load technicians:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadQueues();
    loadPermissions();
    loadTechnicians();
  }, []);

  // Handle create new user
  const handleCreateUser = async () => {
    if (!newUser.employee_number || !newUser.password || !newUser.first_name || !newUser.last_name) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        await loadUsers();
        setShowNewUserModal(false);
        setNewUser({
          employee_number: '',
          password: '',
          first_name: '',
          last_name: '',
          role: 'technician'
        });
      } else {
        const error = await response.json();
        alert(`Failed to create user: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      alert('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  // Handle create new technician
  const handleCreateTechnician = async () => {
    if (!newTech.first_name || !newTech.last_name || !newTech.phone) {
      alert('Please fill in required fields (name and phone)');
      return;
    }

    setLoading(true);
    try {
      const techData = {
        first_name: newTech.first_name,
        last_name: newTech.last_name,
        phone: newTech.phone,
        crew: newTech.crew || 'Unassigned',
        van_number: newTech.van_number || '',
        skills: newTech.skills ? newTech.skills.split(',').map(s => s.trim()) : [],
        profile_image: newTech.profile_image || null
      };

      const response = await fetch('http://localhost:5000/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(techData)
      });

      if (response.ok) {
        await loadTechnicians();
        setShowNewTechModal(false);
        setNewTech({
          first_name: '',
          last_name: '',
          phone: '',
          crew: '',
          van_number: '',
          skills: '',
          profile_image: ''
        });
        alert('Technician created successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to create technician: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create technician:', error);
      alert('Failed to create technician');
    } finally {
      setLoading(false);
    }
  };

  // Handle update user role
  const handleUpdateUserRole = async (userId: number, newRole: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        await loadUsers();
        setEditingUser(null);
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  // Handle toggle user active status
  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        await loadUsers();
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  // Handle update queue permission
  const handleUpdateQueuePermission = async (userId: number, queueId: number, canView: boolean) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/queue-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, queue_id: queueId, can_view: canView })
      });

      if (response.ok) {
        await loadPermissions();
      }
    } catch (error) {
      console.error('Failed to update queue permission:', error);
    }
  };

  // Check if user has permission for queue
  const hasQueuePermission = (userId: number, queueId: number): boolean => {
    const permission = permissions.find(p => p.user_id === userId && p.queue_id === queueId);
    return permission?.can_view || false;
  };

  // ================================
  // RENDER: USERS TAB
  // ================================

  const renderUsersTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '0.5rem' }}>
            User Management
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Manage system users, roles, and access
          </p>
        </div>
        <button
          onClick={() => setShowNewUserModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          <UserPlus style={{ width: '1rem', height: '1rem' }} />
          Add New User
        </button>
      </div>

      {/* Users Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Employee #
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Name
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Role
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Status
              </th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#4b5563' }}>
                  {user.employee_number}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1f2937', fontWeight: '500' }}>
                  {user.first_name} {user.last_name}
                </td>
                <td style={{ padding: '1rem' }}>
                  {editingUser === user.id ? (
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                      style={{
                        padding: '0.375rem 0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="technician">Technician</option>
                      <option value="admin">Admin</option>
                      <option value="office">Office</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: user.role === 'admin' ? '#fef3c7' : user.role === 'office' ? '#dbeafe' : '#f3f4f6',
                      color: user.role === 'admin' ? '#92400e' : user.role === 'office' ? '#1e40af' : '#1f2937'
                    }}>
                      {user.role}
                    </span>
                  )}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button
                    onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.75rem',
                      border: 'none',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      backgroundColor: user.is_active ? '#dcfce7' : '#fee2e2',
                      color: user.is_active ? '#166534' : '#991b1b'
                    }}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setEditingUser(editingUser === user.id ? null : user.id)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        color: '#4b5563'
                      }}
                      title="Edit role"
                    >
                      <Edit2 style={{ width: '1rem', height: '1rem' }} />
                    </button>
                    <button
                      onClick={() => setSelectedUserForPermissions(user.id)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '0.375rem',
                        cursor: 'pointer',
                        color: '#4b5563'
                      }}
                      title="Manage queue permissions"
                    >
                      <Lock style={{ width: '1rem', height: '1rem' }} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ================================
  // RENDER: PERMISSIONS TAB
  // ================================

  const renderPermissionsTab = () => (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '0.5rem' }}>
          Queue Permissions
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
          Control which users can view specific work order queues
        </p>
      </div>

      {/* Permission Matrix */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{
                padding: '0.75rem 1rem',
                textAlign: 'left',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                position: 'sticky',
                left: 0,
                backgroundColor: '#f9fafb'
              }}>
                User
              </th>
              {queues.map(queue => (
                <th key={queue.id} style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase'
                }}>
                  {queue.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.filter(u => u.is_active).map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{
                  padding: '1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#1f2937',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: 'white'
                }}>
                  {user.first_name} {user.last_name}
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '400' }}>
                    #{user.employee_number} • {user.role}
                  </div>
                </td>
                {queues.map(queue => (
                  <td key={queue.id} style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleUpdateQueuePermission(
                        user.id,
                        queue.id,
                        !hasQueuePermission(user.id, queue.id)
                      )}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: hasQueuePermission(user.id, queue.id) ? '#10b981' : '#d1d5db'
                      }}
                    >
                      {hasQueuePermission(user.id, queue.id) ? (
                        <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                      ) : (
                        <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} />
                      )}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ================================
  // RENDER: TECHNICIANS TAB
  // ================================

  const renderTechniciansTab = () => (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '0.5rem' }}>
            Technician Management
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
            Manage dispatch board technicians, photos, and details
          </p>
        </div>
        <button
          onClick={() => setShowNewTechModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          <Wrench style={{ width: '1rem', height: '1rem' }} />
          Add Technician
        </button>
      </div>

      {/* Technicians Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {technicians.map(tech => (
          <div
            key={tech.id}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '2px solid #e5e7eb',
              padding: '1.5rem',
              transition: 'all 0.2s'
            }}
          >
            {/* Technician Photo */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              {tech.profile_image ? (
                <img
                  src={tech.profile_image}
                  alt={`${tech.first_name} ${tech.last_name}`}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #8B5CF6'
                  }}
                />
              ) : (
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  border: '3px solid #8B5CF6'
                }}>
                  <Camera style={{ width: '2rem', height: '2rem', color: '#9ca3af' }} />
                </div>
              )}
            </div>

            {/* Tech Info */}
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', textAlign: 'center', marginBottom: '0.5rem' }}>
              {tech.first_name} {tech.last_name}
            </h3>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
              <p style={{ margin: '0.25rem 0' }}>📞 {tech.phone}</p>
              <p style={{ margin: '0.25rem 0' }}>🚐 Van #{tech.van_number}</p>
              <p style={{ margin: '0.25rem 0' }}>👥 Crew: {tech.crew}</p>
              {tech.skills && tech.skills.length > 0 && (
                <p style={{ margin: '0.25rem 0' }}>🛠️ {tech.skills.join(', ')}</p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  // Handle photo upload
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = async (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      // TODO: Upload to server
                      console.log('Upload photo for tech:', tech.id, file);
                      alert('Photo upload feature coming soon!');
                    }
                  };
                  input.click();
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  backgroundColor: '#f5f3ff',
                  color: '#8B5CF6',
                  border: '1px solid #8B5CF6',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                <Upload style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem' }} />
                Photo
              </button>
              <button
                onClick={() => setEditingTech(tech.id)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  backgroundColor: '#fffbeb',
                  color: '#F59E0B',
                  border: '1px solid #F59E0B',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}
              >
                <Edit2 style={{ width: '0.875rem', height: '0.875rem', display: 'inline', marginRight: '0.25rem' }} />
                Edit
              </button>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {technicians.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '2px dashed #e5e7eb'
          }}>
            <Wrench style={{ width: '3rem', height: '3rem', color: '#d1d5db', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              No technicians yet
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              Add your first technician to the dispatch board
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ================================
  // RENDER: NEW USER MODAL
  // ================================

  const renderNewUserModal = () => {
    if (!showNewUserModal) return null;

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
          padding: '2rem',
          width: '90%',
          maxWidth: '500px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Add New User
            </h3>
            <button
              onClick={() => setShowNewUserModal(false)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Employee Number
              </label>
              <input
                type="text"
                value={newUser.employee_number}
                onChange={(e) => setNewUser({ ...newUser, employee_number: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="e.g., 123"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                First Name
              </label>
              <input
                type="text"
                value={newUser.first_name}
                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="First name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Last Name
              </label>
              <input
                type="text"
                value={newUser.last_name}
                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="Last name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="Initial password"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Role
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="technician">Technician</option>
                <option value="office">Office</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              onClick={handleCreateUser}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
            <button
              onClick={() => setShowNewUserModal(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ================================
  // RENDER: NEW TECHNICIAN MODAL
  // ================================

  const renderNewTechModal = () => {
    if (!showNewTechModal) return null;

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
          padding: '2rem',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Add New Technician
            </h3>
            <button
              onClick={() => setShowNewTechModal(false)}
              style={{
                padding: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              <X style={{ width: '1.25rem', height: '1.25rem' }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                First Name *
              </label>
              <input
                type="text"
                value={newTech.first_name}
                onChange={(e) => setNewTech({ ...newTech, first_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="John"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Last Name *
              </label>
              <input
                type="text"
                value={newTech.last_name}
                onChange={(e) => setNewTech({ ...newTech, last_name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="Smith"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Phone *
              </label>
              <input
                type="tel"
                value={newTech.phone}
                onChange={(e) => setNewTech({ ...newTech, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Van Number
              </label>
              <input
                type="text"
                value={newTech.van_number}
                onChange={(e) => setNewTech({ ...newTech, van_number: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="V-101"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Crew
              </label>
              <input
                type="text"
                value={newTech.crew}
                onChange={(e) => setNewTech({ ...newTech, crew: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="A-Team"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Skills (comma-separated)
              </label>
              <input
                type="text"
                value={newTech.skills}
                onChange={(e) => setNewTech({ ...newTech, skills: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
                placeholder="HVAC, Refrigeration, Plumbing"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button
              onClick={handleCreateTechnician}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                opacity: loading ? 0.5 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Technician'}
            </button>
            <button
              onClick={() => setShowNewTechModal(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ================================
  // MAIN RENDER
  // ================================

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <Shield style={{ width: '2rem', height: '2rem', color: '#6366f1' }} />
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0
          }}>
            Admin Panel
          </h1>
        </div>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          margin: 0
        }}>
          Manage users, roles, and permissions
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #6366f1' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'users' ? '#6366f1' : '#6b7280',
              marginBottom: '-2px'
            }}
          >
            <Users style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.5rem' }} />
            Users
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'permissions' ? '2px solid #6366f1' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'permissions' ? '#6366f1' : '#6b7280',
              marginBottom: '-2px'
            }}
          >
            <Lock style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.5rem' }} />
            Queue Permissions
          </button>
          <button
            onClick={() => setActiveTab('technicians')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'technicians' ? '2px solid #8B5CF6' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: activeTab === 'technicians' ? '#8B5CF6' : '#6b7280',
              marginBottom: '-2px'
            }}
          >
            <Wrench style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.5rem' }} />
            Technicians
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {activeTab === 'users' && renderUsersTab()}
        {activeTab === 'permissions' && renderPermissionsTab()}
        {activeTab === 'technicians' && renderTechniciansTab()}
      </div>

      {/* Modals */}
      {renderNewUserModal()}
      {renderNewTechModal()}
    </div>
  );
};

export default Admin;
