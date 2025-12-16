import React, { useState, useEffect, useRef } from 'react';
import { Search, User, MapPin, Phone, Plus, Building2, X } from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  customer_number: string;
  service_city: string;
  service_state: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  business_type: string;
}

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  onCreateNewCustomer: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({
  onSelectCustomer,
  onCreateNewCustomer,
  placeholder = "Search customers by name, number, or contact...",
  autoFocus = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Search API call
  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Searching for customers: "${query}"`);
      
      const response = await fetch(`http://localhost:5000/api/customers/search?q=${encodeURIComponent(query)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found ${data.length} customers`);
        setCustomers(data);
        setShowResults(true);
        setSelectedIndex(-1);
      } else {
        const errorText = await response.text();
        console.error('Search failed:', response.status, errorText);
        setError('Search failed');
        setCustomers([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      setError('Network error while searching');
      setCustomers([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        searchCustomers(searchQuery.trim());
      } else {
        setCustomers([]);
        setShowResults(false);
        setSelectedIndex(-1);
      }
    }, 300); // Wait 300ms after user stops typing

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || customers.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < customers.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < customers.length) {
          handleSelectCustomer(customers[selectedIndex]);
        } else if (customers.length === 1) {
          handleSelectCustomer(customers[0]);
        }
        break;
      
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    console.log('✅ Customer selected:', customer.name);
    setSearchQuery(customer.name);
    setShowResults(false);
    setSelectedIndex(-1);
    onSelectCustomer(customer);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setCustomers([]);
    setShowResults(false);
    setSelectedIndex(-1);
    setError(null);
    searchRef.current?.focus();
  };

  // Auto-focus
  useEffect(() => {
    if (autoFocus && searchRef.current) {
      searchRef.current.focus();
    }
  }, [autoFocus]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <div style={{ position: 'relative' }}>
        <Search 
          style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            width: '1.25rem', 
            height: '1.25rem', 
            color: loading ? '#3b82f6' : '#9ca3af',
            animation: loading ? 'spin 1s linear infinite' : 'none'
          }} 
        />
        
        <input
          ref={searchRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            e.target.style.borderColor = '#3b82f6';
            if (customers.length > 0) {
              setShowResults(true);
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
          }}
          style={{
            width: '100%',
            padding: '1rem 1rem 1rem 3rem',
            paddingRight: searchQuery ? '3rem' : '1rem',
            border: '2px solid #e5e7eb',
            borderRadius: '0.5rem',
            fontSize: '1rem',
            outline: 'none',
            transition: 'border-color 0.2s',
            backgroundColor: 'white'
          }}
        />

        {/* Clear Button */}
        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '0.25rem'
            }}
          >
            <X style={{ width: '1rem', height: '1rem' }} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div 
          ref={resultsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            marginTop: '0.25rem',
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {error && (
            <div style={{
              padding: '1rem',
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '0.5rem',
              margin: '0.5rem',
              fontSize: '0.875rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div style={{
              padding: '1rem',
              textAlign: 'center',
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              <Search style={{ width: '1rem', height: '1rem', display: 'inline', marginRight: '0.5rem' }} />
              Searching...
            </div>
          )}

          {!loading && !error && customers.length === 0 && searchQuery.length >= 2 && (
            <div style={{ padding: '1rem' }}>
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                marginBottom: '1rem'
              }}>
                <User style={{ width: '3rem', height: '3rem', margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <div style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.25rem' }}>
                  No customers found
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  for "{searchQuery}"
                </div>
              </div>
              
              <button
                onClick={onCreateNewCustomer}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Create New Customer
              </button>
            </div>
          )}

          {!loading && !error && customers.length > 0 && (
            <>
              {customers.map((customer, index) => (
                <div
                  key={customer.id}
                  onClick={() => handleSelectCustomer(customer)}
                  style={{
                    padding: '1rem',
                    cursor: 'pointer',
                    borderBottom: index < customers.length - 1 ? '1px solid #f3f4f6' : 'none',
                    backgroundColor: index === selectedIndex ? '#eff6ff' : 'white',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    if (index !== selectedIndex) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== selectedIndex) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Customer Icon */}
                    <div style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {customer.business_type === 'restaurant' ? '🍽️' : 
                       customer.business_type === 'medical' ? '🏥' : 
                       customer.business_type === 'factory' ? '🏭' : 
                       <Building2 style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />}
                    </div>

                    {/* Customer Details */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <h3 style={{ 
                          fontSize: '1rem', 
                          fontWeight: '600', 
                          color: '#1f2937', 
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {customer.name}
                        </h3>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          backgroundColor: '#f3f4f6',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem',
                          flexShrink: 0
                        }}>
                          #{customer.customer_number}
                        </span>
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        fontSize: '0.875rem', 
                        color: '#6b7280',
                        flexWrap: 'wrap'
                      }}>
                        {customer.service_city && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <MapPin style={{ width: '0.875rem', height: '0.875rem' }} />
                            {customer.service_city}, {customer.service_state}
                          </div>
                        )}
                        
                        {customer.primary_contact_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <User style={{ width: '0.875rem', height: '0.875rem' }} />
                            {customer.primary_contact_name}
                          </div>
                        )}
                        
                        {customer.primary_contact_phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Phone style={{ width: '0.875rem', height: '0.875rem' }} />
                            {customer.primary_contact_phone}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {index === selectedIndex && (
                      <div style={{
                        width: '0.5rem',
                        height: '0.5rem',
                        backgroundColor: '#3b82f6',
                        borderRadius: '50%'
                      }} />
                    )}
                  </div>
                </div>
              ))}

              {/* Create New Customer Option */}
              <div
                onClick={onCreateNewCustomer}
                style={{
                  padding: '1rem',
                  cursor: 'pointer',
                  borderTop: '1px solid #f3f4f6',
                  backgroundColor: '#f9fafb',
                  color: '#3b82f6',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Create New Customer
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading/Searching indicator */}
      <style>
        {`
          @keyframes spin {
            from { transform: translateY(-50%) rotate(0deg); }
            to { transform: translateY(-50%) rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default CustomerSearch;