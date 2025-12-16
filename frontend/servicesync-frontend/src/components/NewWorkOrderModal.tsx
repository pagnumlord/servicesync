import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, AlertCircle, User, Wrench, Calendar, Clock, FileText, Plus } from 'lucide-react';
import { Customer, Technician } from '../types';


interface Equipment {
  id: number;
  equipment_number: string;
  equipment_type: string;
  location_description: string;
}


interface NewWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (workOrder: any) => void;
  technicians: Technician[];
  preSelectedCustomer?: Customer;
}

// Customer Search Component
const CustomerSearch: React.FC<{
  onCustomerSelected: (customer: Customer) => void;
  onCreateNew: () => void;
}> = ({ onCustomerSelected, onCreateNew }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced search with abort controller
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setCustomers([]);
        setSearchPerformed(false);
        return;
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/customers/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { signal: abortController.signal }
        );
        
        if (response.ok && !abortController.signal.aborted) {
          const results = await response.json();
          setCustomers(results);
          setSearchPerformed(true);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Customer search error:', error);
          setCustomers([]);
          setSearchPerformed(true);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(performSearch, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '0.875rem', 
          fontWeight: '500', 
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          Search Customer
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type customer name, number, or contact..."
          autoFocus
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}
        />
        {loading && (
          <div style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Searching...
          </div>
        )}
      </div>

      {searchPerformed && customers.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
            Found {customers.length} customer{customers.length !== 1 ? 's' : ''}:
          </h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {customers.map(customer => (
              <div
                key={customer.id}
                onClick={() => onCustomerSelected(customer)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
              >
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{customer.name}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {customer.service_city}
                  {customer.primary_contact_name && ` • ${customer.primary_contact_name}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {searchPerformed && customers.length === 0 && searchQuery.trim().length >= 2 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem', 
          backgroundColor: '#f9fafb',
          borderRadius: '0.375rem',
          border: '1px solid #e5e7eb'
        }}>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            No customers found for "{searchQuery}"
          </p>
          <button
            onClick={onCreateNew}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
          >
            <Plus size={16} />
            Create New Customer
          </button>
        </div>
      )}

      {!searchPerformed && searchQuery.trim().length < 2 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '2rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.375rem',
          border: '1px dashed #cbd5e1'
        }}>
          <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem' }}>
            Start typing to search for a customer
          </p>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            If the customer doesn't exist, you'll be able to create a new one
          </p>
        </div>
      )}
    </div>
  );
};

// Customer Creation Component
const GuidedCustomerCreation: React.FC<{
  onComplete: (customerData: any) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [customerData, setCustomerData] = useState({
    name: '',
    type: 'commercial',
    primaryContactName: '',
    primaryContactPhone: '',
    serviceAddress: {
      line1: '',
      city: 'Lafayette',
      state: 'IN',
      zip: ''
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerData.name.trim()) {
      alert('Please enter a business name');
      return;
    }
    onComplete(customerData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Business Name *
          </label>
          <input
            type="text"
            value={customerData.name}
            onChange={(e) => setCustomerData(prev => ({ ...prev, name: e.target.value }))}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Primary Contact Name
          </label>
          <input
            type="text"
            value={customerData.primaryContactName}
            onChange={(e) => setCustomerData(prev => ({ ...prev, primaryContactName: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={customerData.primaryContactPhone}
            onChange={(e) => setCustomerData(prev => ({ ...prev, primaryContactPhone: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>

        <div>
          <label style={{ 
            display: 'block', 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Service Address
          </label>
          <input
            type="text"
            value={customerData.serviceAddress.line1}
            onChange={(e) => setCustomerData(prev => ({ 
              ...prev, 
              serviceAddress: { ...prev.serviceAddress, line1: e.target.value }
            }))}
            placeholder="Street address"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              marginBottom: '0.5rem'
            }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
            <input
              type="text"
              value={customerData.serviceAddress.city}
              onChange={(e) => setCustomerData(prev => ({ 
                ...prev, 
                serviceAddress: { ...prev.serviceAddress, city: e.target.value }
              }))}
              placeholder="City"
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <input
              type="text"
              value={customerData.serviceAddress.state}
              onChange={(e) => setCustomerData(prev => ({ 
                ...prev, 
                serviceAddress: { ...prev.serviceAddress, state: e.target.value }
              }))}
              placeholder="State"
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <input
              type="text"
              value={customerData.serviceAddress.zip}
              onChange={(e) => setCustomerData(prev => ({ 
                ...prev, 
                serviceAddress: { ...prev.serviceAddress, zip: e.target.value }
              }))}
              placeholder="ZIP"
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.75rem 1.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            backgroundColor: 'white',
            color: '#374151',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            borderRadius: '0.375rem',
            backgroundColor: '#10b981',
            color: 'white',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}
        >
          Create Customer & Continue
        </button>
      </div>
    </form>
  );
};

// Main Modal Component
const NewWorkOrderModal: React.FC<NewWorkOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  technicians,
  preSelectedCustomer 
}) => {
  const [currentStep, setCurrentStep] = useState<'search' | 'create-customer' | 'work-order'>('search');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerEquipment, setCustomerEquipment] = useState<Equipment[]>([]);
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [workOrder, setWorkOrder] = useState({
    problemDescription: '',
    callRate: 'RT',
    callUrgency: 'Default',
    callType: 'Time and Material',
    priority: 'Normal',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTimeSlot: '',
    assignedTechId: '',
    equipmentId: '',
    customerPO: ''
  });

  const callRateOptions = [
    { value: 'RT', label: 'Regular Time' },
    { value: 'OT', label: 'Overtime' }
  ];

  const callUrgencyOptions = [
    { value: 'Default', label: 'Default' },
    { value: 'Urgent', label: 'Urgent' }, 
    { value: 'Emergency', label: 'Emergency' }
  ];

  const callTypeOptions = [
    { value: 'Time and Material', label: 'Time and Material' },
    { value: 'Callback', label: 'Callback' },
    { value: 'Quoted Job', label: 'Quoted Job' },
    { value: 'Preventive Maintenance', label: 'Preventive Maintenance' },
    { value: 'Time Off', label: 'Time Off' }
  ];

  // Reset form when modal opens/closes
  const resetForm = useCallback(() => {
    setCurrentStep('search');
    setSelectedCustomer(null);
    setCustomerEquipment([]);
    setWorkOrder({
      problemDescription: '',
      callRate: 'RT',
      callUrgency: 'Default',
      callType: 'Time and Material',
      priority: 'Normal',
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTimeSlot: '',
      assignedTechId: '',
      equipmentId: '',
      customerPO: ''
    });
    setError(null);
    setLoading(false);
    isSubmittingRef.current = false;
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetForm();
      if (preSelectedCustomer) {
        setSelectedCustomer(preSelectedCustomer);
        setCurrentStep('work-order');
      }
    } else {
      // Cancel any ongoing requests when modal closes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen, preSelectedCustomer, resetForm]);

  // Load customer equipment
  const loadCustomerEquipment = useCallback(async (customerId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/customers/${customerId}/equipment`);
      if (response.ok) {
        const equipment = await response.json();
        setCustomerEquipment(equipment);
      } else {
        setCustomerEquipment([]);
      }
    } catch (error) {
      console.error('Failed to load customer equipment:', error);
      setCustomerEquipment([]);
    }
  }, []);

  useEffect(() => {
    if (selectedCustomer?.id) {
      loadCustomerEquipment(selectedCustomer.id);
    }
  }, [selectedCustomer, loadCustomerEquipment]);

  // Create work order with proper deduplication
  const createWorkOrder = useCallback(async () => {
  console.log('🚀 createWorkOrder called, current state:', {
    isSubmitting: isSubmittingRef.current,
    loading,
    hasCustomer: !!selectedCustomer,
    customerIdFromState: selectedCustomer?.id
  });

  if (!selectedCustomer) {
    setError('Please select a customer');
    return;
  }

  if (!workOrder.problemDescription.trim()) {
    setError('Please enter a problem description');
    return;
  }

  // Prevent duplicate submissions
  if (isSubmittingRef.current || loading) {
    console.log('🚫 BLOCKED: Request already in progress');
    return;
  }

  console.log('✅ PROCEEDING with work order creation');
    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const woData = {
        customerId: selectedCustomer.id,
        equipmentId: workOrder.equipmentId ? parseInt(workOrder.equipmentId) : null,
        problemDescription: workOrder.problemDescription.trim(),
        callRate: workOrder.callRate,
        callUrgency: workOrder.callUrgency,
        callType: workOrder.callType,
        priority: workOrder.priority,
        scheduledDate: workOrder.scheduledDate || null,
        scheduledTimeSlot: workOrder.scheduledTimeSlot || null,
        assignedTechId: workOrder.assignedTechId ? parseInt(workOrder.assignedTechId) : null,
        customerPO: workOrder.customerPO.trim() || null
      };

      console.log('Creating work order with data:', woData);

      const response = await fetch('http://localhost:5000/api/work-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(woData),
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      if (response.ok) {
        const newWO = await response.json();
        console.log('Work order created successfully:', newWO);
        onSave(newWO);
        resetForm();
      } else {
        const errorText = await response.text();
        console.error('Work order creation failed:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.error || 'Failed to create work order');
        } catch {
          setError(`Server error: ${response.status} - ${errorText}`);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Network error creating work order:', error);
        setError('Network error occurred. Please check if the backend server is running.');
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        isSubmittingRef.current = false;
      }
    }
  }, [selectedCustomer, workOrder, loading, onSave, resetForm]);

  const handleCustomerSelected = useCallback((customer: Customer) => {
    console.log('Customer selected:', customer);
    setSelectedCustomer(customer);
    setCurrentStep('work-order');
  }, []);

  const handleCustomerCreated = useCallback(() => {
    setCurrentStep('create-customer');
  }, []);

  const handleCustomerCreationComplete = useCallback(async (customerData: any) => {
    setLoading(true);
    setError(null);

    try {
      const apiData = {
        name: customerData.name,
        phone: customerData.primaryContactPhone,
        service_address: customerData.serviceAddress.line1,
        service_city: customerData.serviceAddress.city,
        service_state: customerData.serviceAddress.state,
        service_zip: customerData.serviceAddress.zip,
        customer_type: customerData.type || 'commercial'
      };

      const response = await fetch('http://localhost:5000/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        const newCustomer = await response.json();
        console.log('Customer created successfully:', newCustomer);
        setSelectedCustomer(newCustomer);
        setCurrentStep('work-order');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Customer creation error:', error);
      setError('Network error while creating customer');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (currentStep === 'create-customer') {
      setCurrentStep('search');
    } else if (currentStep === 'work-order') {
      setCurrentStep('search');
      setSelectedCustomer(null);
    }
  }, [currentStep]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    createWorkOrder();
  }, [createWorkOrder]);

  const formatTechnicianName = (tech: Technician) => {
    return `${tech.first_name} ${tech.last_name} (${tech.crew})`;
  };

  const getTechnicianId = (tech: Technician) => {
    return tech.tech_id || tech.id;
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
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentStep !== 'search' && (
              <button
                onClick={handleBack}
                type="button"
                style={{
                  padding: '0.5rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                ←
              </button>
            )}
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              {currentStep === 'search' && 'New Work Order - Select Customer'}
              {currentStep === 'create-customer' && 'New Work Order - Create Customer'}
              {currentStep === 'work-order' && 'New Work Order - Work Order Details'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              padding: '0.5rem',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            margin: '1rem 1.5rem 0',
            padding: '0.75rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '0.375rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
          {currentStep === 'search' && (
            <CustomerSearch
              onCustomerSelected={handleCustomerSelected}
              onCreateNew={handleCustomerCreated}
            />
          )}

          {currentStep === 'create-customer' && (
            <GuidedCustomerCreation
              onComplete={handleCustomerCreationComplete}
              onCancel={handleBack}
            />
          )}

          {currentStep === 'work-order' && selectedCustomer && (
            <form onSubmit={handleSubmit}>
              {/* Customer Info */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <User size={16} color="#3b82f6" />
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {selectedCustomer.name}
                  </h3>
                  {selectedCustomer.zone && (
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '500'
                    }}>
                      Zone {selectedCustomer.zone}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  {selectedCustomer.service_city}, {selectedCustomer.service_state}
                  {selectedCustomer.primary_contact_name && (
                    <span> • {selectedCustomer.primary_contact_name}</span>
                  )}
                  {selectedCustomer.primary_contact_phone && (
                    <span> • {selectedCustomer.primary_contact_phone}</span>
                  )}
                </div>
              </div>

              {/* Work Order Form */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                {/* Problem Description */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Problem Description *
                  </label>
                  <textarea
                    value={workOrder.problemDescription}
                    onChange={(e) => setWorkOrder(prev => ({ ...prev, problemDescription: e.target.value }))}
                    placeholder="Describe the issue or service needed..."
                    required
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Call Type, Rate, and Urgency */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Call Rate
                    </label>
                    <select
                      value={workOrder.callRate}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, callRate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {callRateOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Call Urgency
                    </label>
                    <select
                      value={workOrder.callUrgency}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, callUrgency: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {callUrgencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem' }}>
                      Call Type
                    </label>
                    <select
                      value={workOrder.callType}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, callType: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {callTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Scheduled Date and Time Slot */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={workOrder.scheduledDate}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Time Slot
                    </label>
                    <select
                      value={workOrder.scheduledTimeSlot}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, scheduledTimeSlot: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Unscheduled</option>
                      <option value="First AM">First AM</option>
                      <option value="8:00 AM - 10:00 AM">8:00 AM - 10:00 AM</option>
                      <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM</option>
                      <option value="12:00 PM - 2:00 PM">12:00 PM - 2:00 PM</option>
                      <option value="2:00 PM - 4:00 PM">2:00 PM - 4:00 PM</option>
                      <option value="4:00 PM - 6:00 PM">4:00 PM - 6:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Assigned Technician and Equipment */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Assign Technician (Optional)
                    </label>
                    <select
                      value={workOrder.assignedTechId}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, assignedTechId: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Unassigned (will go to dispatch board)</option>
                      {technicians.map(tech => (
                        <option key={getTechnicianId(tech)} value={getTechnicianId(tech)}>
                          {formatTechnicianName(tech)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '0.875rem', 
                      fontWeight: '500', 
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Equipment (Optional)
                    </label>
                    <select
                      value={workOrder.equipmentId}
                      onChange={(e) => setWorkOrder(prev => ({ ...prev, equipmentId: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">No specific equipment</option>
                      {customerEquipment.map(equipment => (
                        <option key={equipment.id} value={equipment.id}>
                          {equipment.equipment_type} - {equipment.equipment_number} ({equipment.location_description})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Customer PO Number */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.875rem', 
                    fontWeight: '500', 
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Customer PO Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={workOrder.customerPO}
                    onChange={(e) => setWorkOrder(prev => ({ ...prev, customerPO: e.target.value }))}
                    placeholder="Optional PO number"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                marginTop: '2rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e5e7eb'
              }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    backgroundColor: 'white',
                    color: '#374151',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    opacity: loading ? 0.5 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !workOrder.problemDescription.trim()}
                  style={{
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    backgroundColor: (loading || !workOrder.problemDescription.trim()) ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    cursor: (loading || !workOrder.problemDescription.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {loading ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewWorkOrderModal;