import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, AlertCircle, User, Wrench, Phone, Mail, Plus, CheckCircle2 } from 'lucide-react';
import { Customer, Technician } from '../types';

interface Equipment {
  id: number;
  equipment_number: string;
  equipment_type: string;
  location_description: string;
}

interface Contact {
  id: number;
  customer_id: number;
  first_name: string;
  last_name: string;
  title?: string;
  role?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
}

interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workOrder: any) => void;
  technicians: Technician[];
  preSelectedCustomer?: Customer;
}

const NewWorkOrderModal: React.FC<NewWorkOrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  technicians,
  preSelectedCustomer
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(preSelectedCustomer || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customerEquipment, setCustomerEquipment] = useState<Equipment[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);

  const [workOrder, setWorkOrder] = useState({
    problemDescription: '',
    equipmentId: '',
    equipmentType: '',
    callRate: 'RT',
    callUrgency: 'Default',
    callType: 'Time and Material',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTimeSlot: '',
    assignedTechId: '',
    customerPO: ''
  });

  const [newContact, setNewContact] = useState({
    firstName: '',
    lastName: '',
    title: '',
    phone: '',
    email: ''
  });

  // Fetch contacts when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      fetchContacts(selectedCustomer.id);
      fetchEquipment(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Customer search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setCustomers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/api/customers/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (response.ok) {
          const results = await response.json();
          setCustomers(results);
        }
      } catch (error) {
        console.error('Customer search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const fetchContacts = async (customerId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${customerId}/contacts`);
      if (response.ok) {
        const data = await response.json();
        setContacts(data);
        // Auto-select primary contact if exists
        const primaryContact = data.find((c: Contact) => c.is_primary);
        if (primaryContact) {
          setSelectedContact(primaryContact);
        }
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchEquipment = async (customerId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${customerId}/equipment`);
      if (response.ok) {
        const data = await response.json();
        setCustomerEquipment(data);
      }
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const handleAddContact = async () => {
    if (!selectedCustomer || !newContact.firstName || !newContact.lastName) return;

    try {
      const response = await fetch(`http://localhost:5000/api/customers/${selectedCustomer.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: newContact.firstName,
          lastName: newContact.lastName,
          title: newContact.title,
          phone: newContact.phone,
          email: newContact.email,
          isPrimary: contacts.length === 0
        })
      });

      if (response.ok) {
        const contact = await response.json();
        setContacts([...contacts, contact]);
        setSelectedContact(contact);
        setShowAddContact(false);
        setNewContact({ firstName: '', lastName: '', title: '', phone: '', email: '' });
      }
    } catch (error) {
      console.error('Error adding contact:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }

    if (!workOrder.problemDescription.trim()) {
      setError('Please describe the problem');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customerId: selectedCustomer.id,
        contactId: selectedContact?.id,
        ...workOrder
      };

      const response = await fetch('http://localhost:5000/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const newWorkOrder = await response.json();
        onSave(newWorkOrder);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create work order');
      }
    } catch (error) {
      console.error('Error creating work order:', error);
      setError('Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

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
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0
          }}>
            New Service Call
          </h2>
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

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {error && (
            <div style={{
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <AlertCircle size={20} color="#DC2626" />
              <span style={{ color: '#DC2626', fontSize: '0.875rem' }}>{error}</span>
            </div>
          )}

          {/* SECTION 1: CUSTOMER & CONTACT */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3B82F6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: '700'
              }}>1</div>
              Who's Calling?
            </h3>

            {!selectedCustomer ? (
              <div style={{
                backgroundColor: '#F9FAFB',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                border: '2px dashed #D1D5DB'
              }}>
                <div style={{ position: 'relative' }}>
                  <Search size={20} style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }} />
                  <input
                    type="text"
                    placeholder="Search by customer name, address, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.875rem 1rem 0.875rem 3rem',
                      border: '2px solid #E5E7EB',
                      borderRadius: '0.75rem',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.2s',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                    onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                  />
                </div>

                {customers.length > 0 && (
                  <div style={{
                    marginTop: '1rem',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    backgroundColor: 'white',
                    maxHeight: '240px',
                    overflowY: 'auto'
                  }}>
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setSearchQuery('');
                          setCustomers([]);
                        }}
                        style={{
                          padding: '1rem',
                          borderBottom: '1px solid #F3F4F6',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                          {customer.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                          {customer.service_address_line1}, {customer.service_city}, {customer.service_state} {customer.service_zip}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Selected Customer Card */}
                <div style={{
                  backgroundColor: '#EFF6FF',
                  border: '2px solid #3B82F6',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                        {selectedCustomer.name}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.5' }}>
                        {selectedCustomer.service_address_line1}<br />
                        {selectedCustomer.service_city}, {selectedCustomer.service_state} {selectedCustomer.service_zip}
                      </div>
                      {selectedCustomer.phone && (
                        <div style={{ fontSize: '0.875rem', color: '#374151', marginTop: '0.25rem' }}>
                          📞 {selectedCustomer.phone}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setContacts([]);
                        setSelectedContact(null);
                      }}
                      style={{
                        background: 'white',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Contact Selection */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Contact Person
                  </div>

                  {contacts.length === 0 && !showAddContact ? (
                    <button
                      onClick={() => setShowAddContact(true)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        border: '2px dashed #D1D5DB',
                        borderRadius: '0.75rem',
                        backgroundColor: '#F9FAFB',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        color: '#6B7280',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      <Plus size={18} />
                      Add Contact Person
                    </button>
                  ) : showAddContact ? (
                    <div style={{
                      border: '2px solid #E5E7EB',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      backgroundColor: '#FAFAFA'
                    }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <input
                          type="text"
                          placeholder="First Name *"
                          value={newContact.firstName}
                          onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })}
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Last Name *"
                          value={newContact.lastName}
                          onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })}
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <input
                          type="text"
                          placeholder="Title (optional)"
                          value={newContact.title}
                          onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                          }}
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                          }}
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          style={{
                            padding: '0.75rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          onClick={handleAddContact}
                          style={{
                            flex: 1,
                            padding: '0.75rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Save Contact
                        </button>
                        <button
                          onClick={() => setShowAddContact(false)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'white',
                            color: '#6B7280',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '0.75rem',
                        marginBottom: '0.75rem'
                      }}>
                        {contacts.map((contact) => (
                          <div
                            key={contact.id}
                            onClick={() => setSelectedContact(contact)}
                            style={{
                              padding: '1rem',
                              border: selectedContact?.id === contact.id ? '2px solid #3B82F6' : '2px solid #E5E7EB',
                              borderRadius: '0.75rem',
                              cursor: 'pointer',
                              backgroundColor: selectedContact?.id === contact.id ? '#EFF6FF' : 'white',
                              transition: 'all 0.2s',
                              position: 'relative'
                            }}
                          >
                            {selectedContact?.id === contact.id && (
                              <div style={{
                                position: 'absolute',
                                top: '0.5rem',
                                right: '0.5rem',
                                backgroundColor: '#3B82F6',
                                borderRadius: '50%',
                                padding: '0.25rem',
                                display: 'flex'
                              }}>
                                <CheckCircle2 size={14} color="white" />
                              </div>
                            )}
                            <div style={{
                              fontWeight: '700',
                              color: '#111827',
                              marginBottom: '0.25rem',
                              fontSize: '0.9375rem'
                            }}>
                              {contact.first_name} {contact.last_name}
                              {contact.is_primary && (
                                <span style={{
                                  marginLeft: '0.5rem',
                                  fontSize: '0.6875rem',
                                  fontWeight: '600',
                                  color: '#059669',
                                  backgroundColor: '#D1FAE5',
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '0.25rem'
                                }}>
                                  PRIMARY
                                </span>
                              )}
                            </div>
                            {contact.title && (
                              <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                                {contact.title}
                              </div>
                            )}
                            {contact.phone && (
                              <div style={{
                                fontSize: '0.8125rem',
                                color: '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                marginTop: '0.5rem'
                              }}>
                                <Phone size={12} />
                                {contact.phone}
                              </div>
                            )}
                            {contact.email && (
                              <div style={{
                                fontSize: '0.8125rem',
                                color: '#374151',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.375rem',
                                marginTop: '0.25rem'
                              }}>
                                <Mail size={12} />
                                {contact.email}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setShowAddContact(true)}
                        style={{
                          padding: '0.625rem 1rem',
                          border: '1px solid #D1D5DB',
                          borderRadius: '0.5rem',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          color: '#374151',
                          fontSize: '0.8125rem',
                          fontWeight: '500'
                        }}
                      >
                        <Plus size={14} />
                        Add Another Contact
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Only show following sections if customer is selected */}
          {selectedCustomer && (
            <>
              {/* SECTION 2: PROBLEM DESCRIPTION */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '700'
                  }}>2</div>
                  What's the Problem?
                </h3>

                <textarea
                  placeholder="Describe the issue... (e.g., 'Ice machine making loud noises and ice production is slow')"
                  value={workOrder.problemDescription}
                  onChange={(e) => setWorkOrder({ ...workOrder, problemDescription: e.target.value })}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '1rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    fontSize: '1rem',
                    lineHeight: '1.5',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    marginBottom: '1rem',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                  onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                />

                {/* Equipment Type Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Equipment Type
                    </label>
                    <select
                      value={workOrder.equipmentType}
                      onChange={(e) => setWorkOrder({ ...workOrder, equipmentType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">Select equipment type...</option>
                      <option value="Ice Machine">Ice Machine</option>
                      <option value="Refrigerator">Refrigerator</option>
                      <option value="Freezer">Freezer</option>
                      <option value="Oven">Oven</option>
                      <option value="Fryer">Fryer</option>
                      <option value="Steamer">Steamer</option>
                      <option value="Dishwasher">Dishwasher</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Specific Equipment (Optional)
                    </label>
                    <select
                      value={workOrder.equipmentId}
                      onChange={(e) => setWorkOrder({ ...workOrder, equipmentId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                      disabled={customerEquipment.length === 0}
                    >
                      <option value="">No specific equipment</option>
                      {customerEquipment.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.equipment_type} - {eq.equipment_number} {eq.location_description && `(${eq.location_description})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: URGENCY & SCHEDULING */}
              <div style={{ marginBottom: '2.5rem' }}>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '700'
                  }}>3</div>
                  How Urgent Is This?
                </h3>

                {/* Urgency Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  {[
                    { value: 'Default', label: 'Default', icon: '🟢', desc: 'Standard service', color: '#10B981' },
                    { value: 'Urgent', label: 'Urgent', icon: '🟡', desc: 'Same day needed', color: '#F59E0B' },
                    { value: 'Emergency', label: 'Emergency', icon: '🔴', desc: 'Critical/After hours', color: '#EF4444' }
                  ].map((urgency) => (
                    <div
                      key={urgency.value}
                      onClick={() => setWorkOrder({ ...workOrder, callUrgency: urgency.value })}
                      style={{
                        padding: '1.25rem',
                        border: workOrder.callUrgency === urgency.value ? `3px solid ${urgency.color}` : '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                        backgroundColor: workOrder.callUrgency === urgency.value ? `${urgency.color}10` : 'white',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {workOrder.callUrgency === urgency.value && (
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          backgroundColor: urgency.color,
                          borderRadius: '50%',
                          padding: '0.25rem',
                          display: 'flex'
                        }}>
                          <CheckCircle2 size={14} color="white" />
                        </div>
                      )}
                      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{urgency.icon}</div>
                      <div style={{
                        fontWeight: '700',
                        fontSize: '1rem',
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        {urgency.label}
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                        {urgency.desc}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Call Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Call Rate
                    </label>
                    <select
                      value={workOrder.callRate}
                      onChange={(e) => setWorkOrder({ ...workOrder, callRate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="RT">Regular Time</option>
                      <option value="OT">Overtime</option>
                      <option value="DT">Double Time</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Call Type
                    </label>
                    <select
                      value={workOrder.callType}
                      onChange={(e) => setWorkOrder({ ...workOrder, callType: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="Time and Material">Time and Material</option>
                      <option value="Contract">Contract</option>
                      <option value="Warranty">Warranty</option>
                      <option value="Quote">Quote</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={workOrder.scheduledDate}
                      onChange={(e) => setWorkOrder({ ...workOrder, scheduledDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Time Slot (Optional)
                    </label>
                    <select
                      value={workOrder.scheduledTimeSlot}
                      onChange={(e) => setWorkOrder({ ...workOrder, scheduledTimeSlot: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        outline: 'none',
                        appearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.5em 1.5em',
                        paddingRight: '2.5rem'
                      }}
                    >
                      <option value="">Unscheduled</option>
                      <option value="FIRST AM">FIRST AM (7:00-9:00)</option>
                      <option value="AM">AM (9:00-12:00)</option>
                      <option value="PM">PM (12:00-5:00)</option>
                      <option value="ANYTIME">ANYTIME</option>
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Customer PO (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="PO Number"
                      value={workOrder.customerPO}
                      onChange={(e) => setWorkOrder({ ...workOrder, customerPO: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #E5E7EB',
                        borderRadius: '0.75rem',
                        fontSize: '0.9375rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: TECHNICIAN ASSIGNMENT */}
              <div>
                <h3 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#111827',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '700'
                  }}>4</div>
                  Assign Technician (Optional)
                </h3>

                <select
                  value={workOrder.assignedTechId}
                  onChange={(e) => setWorkOrder({ ...workOrder, assignedTechId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.875rem',
                    border: '2px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    fontSize: '0.9375rem',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">Unassigned (will go to dispatch board)</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.first_name} {tech.last_name} - Crew {tech.crew || 'No Crew'}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {selectedCustomer && (
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            backgroundColor: '#F9FAFB'
          }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: '2px solid #D1D5DB',
                borderRadius: '0.75rem',
                backgroundColor: 'white',
                color: '#374151',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !workOrder.problemDescription.trim()}
              style={{
                padding: '0.75rem 2rem',
                border: 'none',
                borderRadius: '0.75rem',
                backgroundColor: loading || !workOrder.problemDescription.trim() ? '#9CA3AF' : '#3B82F6',
                color: 'white',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: loading || !workOrder.problemDescription.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            >
              {loading ? 'Creating...' : 'Create Work Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewWorkOrderModal;
