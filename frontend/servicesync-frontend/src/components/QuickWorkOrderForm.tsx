import React, { useState, useEffect } from 'react';
import { X, Search, AlertCircle, Calendar, User, Wrench, FileText } from 'lucide-react';

interface Customer {
  id: number;
  customer_number: string;
  name: string;
  phone: string;
  service_address: string;
  service_city: string;
  service_state: string;
  service_zip: string;
}

interface Technician {
  id: number;
  first_name: string;
  last_name: string;
  crew: string;
  van_number: string;
}

interface QuickWorkOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (workOrderData: any) => void;
  technicians: Technician[];
  preSelectedDate?: string;
  preSelectedTechId?: number;
}

const QuickWorkOrderForm: React.FC<QuickWorkOrderFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  technicians,
  preSelectedDate,
  preSelectedTechId
}) => {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    problem_description: '',
    call_type: 'Service Call',
    call_urgency: 'Routine',
    scheduled_date: preSelectedDate || new Date().toISOString().split('T')[0],
    assigned_tech_id: preSelectedTechId || '',
    scheduled_time_slot: ''
  });

  // Load customers for search
  useEffect(() => {
    if (isOpen) {
      loadCustomers();
    }
  }, [isOpen]);

  // Search customers
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.customer_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.includes(searchQuery) ||
        customer.service_address?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
      setShowCustomerDropdown(true);
    } else {
      setSearchResults([]);
      setShowCustomerDropdown(false);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/customers?limit=1000&active_only=true');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (!formData.problem_description.trim()) {
      alert('Please describe the problem');
      return;
    }

    setLoading(true);
    try {
      const workOrderData = {
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        phone: selectedCustomer.phone,
        service_address: selectedCustomer.service_address,
        service_city: selectedCustomer.service_city,
        service_state: selectedCustomer.service_state,
        service_zip: selectedCustomer.service_zip,
        problem_description: formData.problem_description,
        call_type: formData.call_type,
        call_urgency: formData.call_urgency,
        scheduled_date: formData.scheduled_date || null,
        assigned_tech_id: formData.assigned_tech_id || null,
        scheduled_time_slot: formData.scheduled_time_slot || null,
        status: 'Active'
      };

      await onSubmit(workOrderData);

      // Reset form
      setSelectedCustomer(null);
      setSearchQuery('');
      setFormData({
        problem_description: '',
        call_type: 'Service Call',
        call_urgency: 'Routine',
        scheduled_date: new Date().toISOString().split('T')[0],
        assigned_tech_id: '',
        scheduled_time_slot: ''
      });

      onClose();
    } catch (error) {
      console.error('Failed to create work order:', error);
      alert('Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

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
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '2rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            New Work Order
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <X style={{ width: '1.5rem', height: '1.5rem' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Customer Search */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Customer *
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: '#9ca3af' }} />
                <input
                  type="text"
                  value={selectedCustomer ? selectedCustomer.name : searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (selectedCustomer) setSelectedCustomer(null);
                  }}
                  placeholder="Search by name, number, phone, or address..."
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Search Results Dropdown */}
              {showCustomerDropdown && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  marginTop: '0.25rem',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  zIndex: 10
                }}>
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerDropdown(false);
                        setSearchQuery('');
                      }}
                      style={{
                        padding: '0.75rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1f2937' }}>
                        {customer.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        #{customer.customer_number} • {customer.phone}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {customer.service_address}, {customer.service_city}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Customer Display */}
              {selectedCustomer && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}>
                  <div style={{ fontWeight: '600', color: '#166534' }}>{selectedCustomer.name}</div>
                  <div style={{ color: '#15803d', fontSize: '0.75rem' }}>
                    {selectedCustomer.service_address}, {selectedCustomer.service_city}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Problem Description */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              <FileText style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.25rem' }} />
              Problem Description *
            </label>
            <textarea
              value={formData.problem_description}
              onChange={(e) => setFormData({ ...formData, problem_description: e.target.value })}
              placeholder="Describe the issue..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Call Type and Urgency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Call Type
              </label>
              <select
                value={formData.call_type}
                onChange={(e) => setFormData({ ...formData, call_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="Service Call">Service Call</option>
                <option value="Install">Install</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Estimate">Estimate</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Urgency
              </label>
              <select
                value={formData.call_urgency}
                onChange={(e) => setFormData({ ...formData, call_urgency: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="Routine">Routine</option>
                <option value="Priority">Priority</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Scheduled Date and Tech Assignment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                <Calendar style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.25rem' }} />
                Scheduled Date
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                <User style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.25rem' }} />
                Assign Technician
              </label>
              <select
                value={formData.assigned_tech_id}
                onChange={(e) => setFormData({ ...formData, assigned_tech_id: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Unassigned</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name} - {tech.crew}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Slot */}
          {formData.assigned_tech_id && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                Time Slot
              </label>
              <select
                value={formData.scheduled_time_slot}
                onChange={(e) => setFormData({ ...formData, scheduled_time_slot: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Unscheduled</option>
                <option value="First AM">First AM (8:30 departure)</option>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
                <option value="After Hours">After Hours</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            <button
              type="submit"
              disabled={loading || !selectedCustomer}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: loading || !selectedCustomer ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                opacity: loading || !selectedCustomer ? 0.5 : 1
              }}
            >
              {loading ? 'Creating...' : 'Create Work Order'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickWorkOrderForm;
