// ============================================================
// CustomerManagement.tsx - Enhanced Customer Management with Vision-style UI
// File: frontend/servicesync-frontend/src/components/CustomerManagement.tsx
// 
// UPDATED: Now uses CustomerHeader (4-column layout) and 
// CustomerWorkOrdersTable (table view instead of cards)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Building, Phone, Mail, MapPin, User, 
  FileText, ChevronLeft, ChevronRight, Edit, Trash2,
  AlertCircle, CheckCircle, Clock, X, Filter, Users,
  Wrench, StickyNote, Paperclip, DollarSign, Calendar,
  RefreshCw, Pin
} from 'lucide-react';

// Import components
import GuidedCustomerCreation from './GuidedCustomerCreation';
import NewWorkOrderModal from './NewWorkOrderModal';
import CustomerHeader from './CustomerHeader';
import CustomerWorkOrdersTable from './CustomerWorkOrdersTable';
import AddNoteModal from './AddNoteModal';
import AddContactModal from './AddContactModal';


// Import unified types
import { 
  WorkOrder, 
  Customer, 
  CustomerManagementProps,
  Technician,
  CustomerContact,
  CustomerNote,
  Equipment
} from '../types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ============================================================
// Customer List Props
// ============================================================
interface CustomerListProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onCreateWorkOrder: (customer: Customer) => void;
  onEditCustomer?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
}

// ============================================================
// Customer Details Page Props
// ============================================================
interface CustomerDetailsPageProps {
  customer: Customer;
  onBack: () => void;
  onCreateWorkOrder: (customer: Customer) => void;
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
}

// ============================================================
// Zone color mapping
// ============================================================
const getZoneColor = (zone?: string) => {
  const colors: Record<string, string> = {
    'A': '#ef4444',
    'B': '#f97316',  
    'C': '#eab308',
    'D': '#22c55e',
    'E': '#3b82f6',
    'F': '#a855f7'
  };
  return colors[zone || ''] || '#6b7280';
};

// ============================================================
// Customer List Component
// ============================================================
const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  onSelectCustomer,
  onCreateWorkOrder,
  onEditCustomer,
  onDeleteCustomer
}) => {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      borderRadius: '0.75rem', 
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151'
      }}>
        <div>Customer Name</div>
        <div>City</div>
        <div>Zone</div>
        <div>Phone</div>
        <div>Status</div>
        <div>Actions</div>
      </div>

      {/* Customer Rows */}
      {customers.map((customer: Customer, index: number) => (
        <div
          key={customer.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px',
            gap: '1rem',
            padding: '1rem',
            borderBottom: index < customers.length - 1 ? '1px solid #f3f4f6' : 'none',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
          onClick={() => onSelectCustomer(customer)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div>
            <div style={{ fontWeight: '500', color: '#1f2937', marginBottom: '0.25rem' }}>
              {customer.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {customer.service_address_line1}
            </div>
          </div>
          <div style={{ color: '#6b7280' }}>
            {customer.service_city}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {customer.zone && (
              <>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getZoneColor(customer.zone)
                }} />
                {customer.zone}
              </>
            )}
          </div>
          <div style={{ color: '#6b7280' }}>
            {customer.phone || customer.primary_contact_phone}
          </div>
          <div>
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '500',
              backgroundColor: customer.is_active !== false ? '#dcfce7' : '#fee2e2',
              color: customer.is_active !== false ? '#166534' : '#991b1b'
            }}>
              {customer.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateWorkOrder(customer);
              }}
              style={{
                padding: '0.25rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
              title="Create Work Order"
            >
              <Plus size={12} />
            </button>
          </div>
        </div>
      ))}

      {customers.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          color: '#6b7280'
        }}>
          <Users style={{ width: '3rem', height: '3rem', margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>No customers found</p>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Customer Details Page Component (UPDATED WITH VISION-STYLE LAYOUT)
// ============================================================
const CustomerDetailsPage: React.FC<CustomerDetailsPageProps> = ({ 
  customer, 
  onBack, 
  onCreateWorkOrder,
  onWorkOrderClick
}) => {
  // Tab state - default to work orders like Vision
  const [activeTab, setActiveTab] = useState('workorders');
  
  // Data states
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [pinnedNotes, setPinnedNotes] = useState<CustomerNote[]>([]);
  const [allNotes, setAllNotes] = useState<CustomerNote[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  
  // Loading states
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<CustomerNote | undefined>(undefined);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomerContact | undefined>(undefined);

  // Tab configuration matching Vision
  const tabs = [
    { id: 'workorders', label: 'Work Orders', icon: FileText, count: workOrders.length },
    { id: 'equipment', label: 'Equipment', icon: Wrench, count: equipment.length },
    { id: 'contacts', label: 'Contacts', icon: User, count: contacts.length },
    { id: 'notes', label: 'Notes', icon: StickyNote, count: allNotes.length },
    // Future tabs - can be enabled later
    // { id: 'invoices', label: 'Invoices', icon: DollarSign },
    // { id: 'agreements', label: 'Agreements', icon: Calendar },
    // { id: 'attachments', label: 'Attachments', icon: Paperclip },
  ];

  // ============================================================
  // Data Fetching Functions
  // ============================================================
  
  // Fetch work orders for this customer
  const fetchWorkOrders = useCallback(async () => {
    setLoadingWorkOrders(true);
    try {
      const response = await fetch(`${API_BASE}/customers/${customer.id}/work-orders`);
      if (response.ok) {
        const data = await response.json();
        setWorkOrders(data.workOrders || []); // Backend returns camelCase 'workOrders'
      } else {
        console.error('Failed to fetch work orders:', response.status);
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoadingWorkOrders(false);
    }
  }, [customer.id]);

  // Fetch contacts for this customer
  const fetchContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const response = await fetch(`${API_BASE}/customers/${customer.id}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data.contacts || data || []);
      } else {
        // If endpoint doesn't exist yet, use legacy contact data
        if (customer.primary_contact_name) {
          setContacts([{
            id: 0,
            customer_id: customer.id,
            contact_type: 'primary',
            name: customer.primary_contact_name,
            phone: customer.primary_contact_phone,
            phone_type: 'office',
            email: customer.primary_contact_email,
            is_primary: true,
            created_at: customer.created_at || new Date().toISOString(),
            updated_at: customer.updated_at || new Date().toISOString()
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      // Fallback to legacy contact
      if (customer.primary_contact_name) {
        setContacts([{
          id: 0,
          customer_id: customer.id,
          contact_type: 'primary',
          name: customer.primary_contact_name,
          phone: customer.primary_contact_phone,
          phone_type: 'office',
          email: customer.primary_contact_email,
          is_primary: true,
          created_at: customer.created_at || new Date().toISOString(),
          updated_at: customer.updated_at || new Date().toISOString()
        }]);
      }
    } finally {
      setLoadingContacts(false);
    }
  }, [customer]);

  // Fetch notes for this customer
  const fetchNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const response = await fetch(`${API_BASE}/customers/${customer.id}/notes`);
      if (response.ok) {
        const data = await response.json();
        const notes = data.notes || data || [];
        setAllNotes(notes);
        setPinnedNotes(notes.filter((n: CustomerNote) => n.is_pinned));
      } else {
        // If endpoint doesn't exist yet, use legacy notes field
        if (customer.notes) {
          const legacyNote: CustomerNote = {
            id: 0,
            customer_id: customer.id,
            note_text: customer.notes,
            note_type: 'general',
            is_pinned: true,
            created_by: 'System',
            created_at: customer.created_at || new Date().toISOString(),
            updated_at: customer.updated_at || new Date().toISOString()
          };
          setAllNotes([legacyNote]);
          setPinnedNotes([legacyNote]);
        }
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      // Fallback to legacy notes
      if (customer.notes) {
        const legacyNote: CustomerNote = {
          id: 0,
          customer_id: customer.id,
          note_text: customer.notes,
          note_type: 'general',
          is_pinned: true,
          created_by: 'System',
          created_at: customer.created_at || new Date().toISOString(),
          updated_at: customer.updated_at || new Date().toISOString()
        };
        setAllNotes([legacyNote]);
        setPinnedNotes([legacyNote]);
      }
    } finally {
      setLoadingNotes(false);
    }
  }, [customer]);

  // Fetch equipment for this customer
  const fetchEquipment = useCallback(async () => {
    setLoadingEquipment(true);
    try {
      const response = await fetch(`${API_BASE}/customers/${customer.id}/equipment`);
      if (response.ok) {
        const data = await response.json();
        setEquipment(data.equipment || data || []);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoadingEquipment(false);
    }
  }, [customer.id]);

  // Initial data load
  useEffect(() => {
    fetchWorkOrders();
    fetchContacts();
    fetchNotes();
    fetchEquipment();
  }, [fetchWorkOrders, fetchContacts, fetchNotes, fetchEquipment]);

  // ============================================================
  // Event Handlers
  // ============================================================
  
  const handleAddNote = () => {
    setEditingNote(undefined);
    setShowAddNoteModal(true);
  };

  const handleEditNote = (note: CustomerNote) => {
    setEditingNote(note);
    setShowAddNoteModal(true);
  };

  const handleNoteSaved = (savedNote: CustomerNote) => {
    fetchNotes();
    setShowAddNoteModal(false);
    setEditingNote(undefined);
  };

   const handleDeleteNote = async (note: CustomerNote) => {
    if (note.id === 0) return; // Can't delete legacy notes
    
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE}/customers/${customer.id}/notes/${note.id}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        fetchNotes(); // Refresh the list
      } else {
        alert('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note');
    }
  };

   const handleEditContact = (contact: CustomerContact) => {
    setEditingContact(contact);
    setShowAddContactModal(true);
  };

  const handleAddContact = () => {
    setEditingContact(undefined);
    setShowAddContactModal(true);
  };

  const handleContactSaved = (savedContact: CustomerContact) => {
    fetchContacts();
    setShowAddContactModal(false);
    setEditingContact(undefined);
  };

  const handleDeleteContact = async (contact: CustomerContact) => {
    if (contact.id === 0) return;
    
    if (!window.confirm(`Delete contact "${contact.name}"?`)) {
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE}/customers/${customer.id}/contacts/${contact.id}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        fetchContacts();
      } else {
        alert('Failed to delete contact');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Failed to delete contact');
    }
  };

  const handleViewAllNotes = () => {
    setActiveTab('notes');
  };

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8fafc'
    }}>
      {/* ============================================================ */}
      {/* Page Header - Compact with back button and actions */}
      {/* ============================================================ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.5rem',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              color: '#374151'
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>
          
          <div>
            <h1 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600', 
              color: '#1f2937', 
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {customer.name}
              {customer.zone && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  color: '#6b7280',
                  backgroundColor: '#f3f4f6',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem'
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: getZoneColor(customer.zone)
                  }} />
                  Zone {customer.zone}
                </span>
              )}
            </h1>
            <p style={{ 
              fontSize: '0.8125rem', 
              color: '#6b7280', 
              margin: '0.25rem 0 0 0' 
            }}>
              {customer.service_address_line1}, {customer.service_city}, {customer.service_state} {customer.service_zip}
            </p>
          </div>
          
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => alert('Edit Customer - Coming soon!')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              color: '#374151'
            }}
          >
            <Edit size={14} />
            Edit
          </button>
          
          {customer.is_active !== false && (
            <button
              onClick={() => onCreateWorkOrder(customer)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: '500'
              }}
            >
              <Plus size={14} />
              New Work Order
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Customer Header - Vision-style 4-column layout */}
      {/* ============================================================ */}
      <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
        <CustomerHeader
          customer={customer}
          contacts={contacts}
          pinnedNotes={pinnedNotes}
          onAddNote={handleAddNote}
          onEditContact={handleEditContact}
          onViewAllNotes={handleViewAllNotes}
          onCreateWorkOrder={() => onCreateWorkOrder(customer)}
        />
      </div>

      {/* ============================================================ */}
      {/* Tabs - Vision style */}
      {/* ============================================================ */}
      <div style={{ 
        padding: '0 1.5rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '0.25rem',
          marginTop: '-1px' // Overlap with header border
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: isActive ? 'white' : 'transparent',
                  color: isActive ? '#2563eb' : '#6b7280',
                  border: isActive ? '1px solid #e5e7eb' : '1px solid transparent',
                  borderBottom: isActive ? '1px solid white' : '1px solid transparent',
                  borderRadius: '0.375rem 0.375rem 0 0',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? '600' : '500',
                  transition: 'all 0.15s ease',
                  marginBottom: '-1px'
                }}
              >
                <tab.icon size={14} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span style={{
                    backgroundColor: isActive ? '#dbeafe' : '#f3f4f6',
                    color: isActive ? '#2563eb' : '#6b7280',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.6875rem',
                    fontWeight: '600'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* Tab Content */}
      {/* ============================================================ */}
      <div style={{ 
        flex: 1, 
        padding: '1.5rem',
        overflow: 'auto'
      }}>
        {/* Work Orders Tab */}
        {activeTab === 'workorders' && (
          <CustomerWorkOrdersTable
            customer={customer}
            workOrders={workOrders}
            loading={loadingWorkOrders}
            onWorkOrderClick={onWorkOrderClick}
            onCreateWorkOrder={() => onCreateWorkOrder(customer)}
            onRefresh={fetchWorkOrders}
          />
        )}

        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                Equipment ({equipment.length})
              </h3>
              <button
                onClick={() => alert('Add Equipment - Coming soon!')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: '500'
                }}
              >
                <Plus size={14} />
                Add Equipment
              </button>
            </div>

            {loadingEquipment ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <p>Loading equipment...</p>
              </div>
            ) : equipment.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <Wrench size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ color: '#6b7280' }}>No equipment found for this customer</p>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Equipment #</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Brand</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Model</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Serial #</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', borderBottom: '1px solid #e5e7eb' }}>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((eq, index) => (
                      <tr 
                        key={eq.id}
                        style={{ 
                          borderBottom: index < equipment.length - 1 ? '1px solid #f3f4f6' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => alert(`View equipment ${eq.equipment_number} - Coming soon!`)}
                      >
                        <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#2563eb', fontWeight: '500' }}>
                          {eq.equipment_number || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{eq.equipment_type}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{eq.brand || '-'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{eq.model || '-'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8125rem' }}>{eq.serial_number || '-'}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.8125rem', color: '#6b7280' }}>{eq.location_description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                Contacts ({contacts.length})
              </h3>
              <button
                onClick={handleAddContact}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: '500'
                }}
              >
                <Plus size={14} />
                Add Contact
              </button>
            </div>

            {loadingContacts ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <p>Loading contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <User size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ color: '#6b7280' }}>No contacts found for this customer</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => contact.id !== 0 && handleEditContact(contact)}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      border: contact.is_primary ? '2px solid #2563eb' : '1px solid #e5e7eb',
                      padding: '1rem',
                      cursor: contact.id !== 0 ? 'pointer' : 'default',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (contact.id !== 0) {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = contact.is_primary ? '#2563eb' : '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9375rem' }}>{contact.name}</div>
                        {contact.title && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{contact.title}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        {contact.is_primary && (
                          <span style={{
                            backgroundColor: '#dbeafe',
                            color: '#2563eb',
                            padding: '0.125rem 0.375rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.625rem',
                            fontWeight: '600'
                          }}>
                            PRIMARY
                          </span>
                        )}
                        <span style={{
                          backgroundColor: '#f3f4f6',
                          color: '#6b7280',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          textTransform: 'uppercase'
                        }}>
                          {contact.contact_type}
                        </span>
                        {contact.id !== 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContact(contact);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem',
                              color: '#9ca3af',
                              borderRadius: '0.25rem',
                              marginLeft: '0.25rem'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                            title="Delete contact"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {contact.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <Phone size={14} color="#6b7280" />
                        <a 
                          href={`tel:${contact.phone}`} 
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}
                        >
                          {contact.phone}
                        </a>
                        {contact.phone_type === 'mobile' && (
                          <span style={{ fontSize: '0.625rem', color: '#6b7280' }}>(Mobile)</span>
                        )}
                      </div>
                    )}
                    
                    {contact.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Mail size={14} color="#6b7280" />
                        <a 
                          href={`mailto:${contact.email}`} 
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}
                        >
                          {contact.email}
                        </a>
                      </div>
                    )}
                    
                    {contact.id !== 0 && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        paddingTop: '0.5rem', 
                        borderTop: '1px solid #f3f4f6',
                        fontSize: '0.6875rem',
                        color: '#9ca3af'
                      }}>
                        Click to edit
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                Notes ({allNotes.length})
              </h3>
              <button
                onClick={handleAddNote}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: '500'
                }}
              >
                <Plus size={14} />
                Add Note
              </button>
            </div>

            {loadingNotes ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <p>Loading notes...</p>
              </div>
            ) : allNotes.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <StickyNote size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ color: '#6b7280' }}>No notes found for this customer</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {allNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      backgroundColor: note.is_pinned ? '#fffbeb' : 'white',
                      borderRadius: '0.5rem',
                      border: note.is_pinned ? '1px solid #fcd34d' : '1px solid #e5e7eb',
                      padding: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          backgroundColor: note.note_type === 'warning' ? '#fee2e2' : '#f3f4f6',
                          color: note.note_type === 'warning' ? '#991b1b' : '#6b7280',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.625rem',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {note.note_type}
                        </span>
                        {note.is_pinned && (
                          <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>📌 Pinned</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
    {new Date(note.created_at).toLocaleDateString()} 
    {note.created_by && ` • ${note.created_by}`}
  </span>
  {note.id !== 0 && (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteNote(note);
        }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          color: '#9ca3af',
          borderRadius: '0.25rem'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
        title="Delete note"
      >
        <Trash2 size={14} />
      </button>
    </>
  )}
</div>
                    </div>
                    <div style={{ 
                      fontSize: '0.875rem', 
                      color: '#374151', 
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {note.note_text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <AddNoteModal
        isOpen={showAddNoteModal}
        customerId={customer.id}
        customerName={customer.name}
        existingNote={editingNote}
        onClose={() => {
          setShowAddNoteModal(false);
          setEditingNote(undefined);
        }}
        onSave={handleNoteSaved}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddContactModal}
        customerId={customer.id}
        customerName={customer.name}
        existingContact={editingContact}
        onClose={() => {
          setShowAddContactModal(false);
          setEditingContact(undefined);
        }}
        onSave={handleContactSaved}
      />
    </div>
  );
};


// ============================================================
// Main CustomerManagement Component
// ============================================================
const CustomerManagement: React.FC<CustomerManagementProps> = ({
  onWorkOrderSelect,
  onOpenWorkOrder,
  initialCustomerId
}) => {
  const handleWorkOrderSelect = onWorkOrderSelect || onOpenWorkOrder;
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  
  // Selected customer and UI state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [workOrderCustomer, setWorkOrderCustomer] = useState<Customer | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);

  // Load customers
  const loadCustomers = useCallback(async (page: number = 1, search: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(showInactive && { includeInactive: 'true' })
      });
      
      const response = await fetch(`${API_BASE}/customers?${params}`);
      if (!response.ok) throw new Error('Failed to load customers');
      
      const data = await response.json();
      setCustomers(data.customers || data || []);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  // Load technicians for work order modal
  const loadTechnicians = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/technicians`);
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data || []);
      }
    } catch (err) {
      console.error('Error loading technicians:', err);
    }
  }, []);

  useEffect(() => {
    loadCustomers(currentPage, searchQuery);
    loadTechnicians();
  }, [currentPage, searchQuery, loadCustomers, loadTechnicians]);

  // Handle initial customer ID (for deep linking)
  useEffect(() => {
    if (initialCustomerId) {
      // Fetch and show specific customer
      const fetchCustomer = async () => {
        try {
          const response = await fetch(`${API_BASE}/customers/${initialCustomerId}`);
          if (response.ok) {
            const customer = await response.json();
            setSelectedCustomer(customer);
            setShowCustomerDetails(true);
          }
        } catch (err) {
          console.error('Error fetching customer:', err);
        }
      };
      fetchCustomer();
    }
  }, [initialCustomerId]);

  // Search handler
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Select customer
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Create work order
  const handleCreateWorkOrder = (customer: Customer) => {
    setWorkOrderCustomer(customer);
    setShowWorkOrderModal(true);
  };

  // Customer created
  const handleCustomerCreated = (customer: Customer) => {
    setShowCreateCustomer(false);
    loadCustomers(currentPage, searchQuery);
    // Optionally open the new customer's page
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Work order saved
  const handleWorkOrderSave = (workOrder: any) => {
    console.log('✅ Work order created:', workOrder);
    setShowWorkOrderModal(false);
    setWorkOrderCustomer(null);
    // Show success message
    alert(`Work Order ${workOrder.wo_number} created successfully!`);
  };

  // ============================================================
  // Render: Customer Details Page
  // ============================================================
  if (showCustomerDetails && selectedCustomer) {
    return (
      <>
        <CustomerDetailsPage
          customer={selectedCustomer}
          onBack={() => {
            setShowCustomerDetails(false);
            setSelectedCustomer(null);
          }}
          onCreateWorkOrder={handleCreateWorkOrder}
          onWorkOrderClick={handleWorkOrderSelect}
        />
        
        {/* Work Order Modal */}
        {showWorkOrderModal && workOrderCustomer && (
          <NewWorkOrderModal
            isOpen={showWorkOrderModal}
            onClose={() => {
              setShowWorkOrderModal(false);
              setWorkOrderCustomer(null);
            }}
            onSave={handleWorkOrderSave}
            technicians={technicians}
            preSelectedCustomer={workOrderCustomer}
          />
        )}
      </>
    );
  }

  

  // ============================================================
  // Render: Customer List Page
  // ============================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            Customer Management
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
            Search, view, and manage customer information
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateCustomer(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          <Plus size={16} />
          New Customer
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search 
            size={20} 
            style={{ 
              position: 'absolute', 
              left: '0.75rem', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#6b7280' 
            }} 
          />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 0.75rem 0.75rem 2.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
        
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem',
          color: '#374151'
        }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            style={{ margin: 0 }}
          />
          Show inactive customers
        </label>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#991b1b'
        }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Customer List */}
      <div style={{ flex: 1, marginBottom: '1rem' }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ color: '#6b7280' }}>Loading customers...</div>
          </div>
        ) : (
          <CustomerList
            customers={customers}
            onSelectCustomer={handleSelectCustomer}
            onCreateWorkOrder={handleCreateWorkOrder}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          padding: '1rem'
        }}>
          <button
            onClick={() => {
              if (currentPage > 1) {
                const newPage = currentPage - 1;
                setCurrentPage(newPage);
                loadCustomers(newPage, searchQuery);
              }
            }}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : '#3b82f6',
              color: currentPage === 1 ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            Page {currentPage} of {totalPages}
          </span>
          
          <button
            onClick={() => {
              if (currentPage < totalPages) {
                const newPage = currentPage + 1;
                setCurrentPage(newPage);
                loadCustomers(newPage, searchQuery);
              }
            }}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : '#3b82f6',
              color: currentPage === totalPages ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateCustomer && (
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
            borderRadius: '0.5rem',
            padding: '0',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <GuidedCustomerCreation
              onComplete={handleCustomerCreated}
              onCancel={() => setShowCreateCustomer(false)}
            />
          </div>
        </div>
      )}

      {/* Work Order Creation Modal */}
      {showWorkOrderModal && workOrderCustomer && (
        <NewWorkOrderModal
          isOpen={showWorkOrderModal}
          onClose={() => {
            setShowWorkOrderModal(false);
            setWorkOrderCustomer(null);
          }}
          onSave={handleWorkOrderSave}
          technicians={technicians}
          preSelectedCustomer={workOrderCustomer}
        />
      )}
    </div>
  );
};

export default CustomerManagement;
