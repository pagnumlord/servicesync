import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Users,
  Package,
  ShoppingCart,
  Sparkles,
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign,
  Phone,
  X,
  AlertCircle
} from 'lucide-react';

// ================================
// TYPE DEFINITIONS
// ================================

interface WorkOrder {
  id: number;
  wo_number: string;
  customer_name: string;
  status: string;
  call_type: string;
  equipment_type: string;
  scheduled_date: string;
  problem_description: string;
  internal_notes: string;
}

interface Customer {
  id: number;
  name: string;
  customer_number: string;
  phone: string;
  service_address_line1: string;
  service_city: string;
  service_state: string;
  zone: string;
  balance_due: number;
}

interface InventoryItem {
  id: number;
  part_number: string;
  description: string;
  category: string;
  manufacturer: string;
  cost: number;
  retail_price: number;
  markup_percentage: number;
  quantity_in_stock: number;
  location: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_name: string;
  total_amount: number;
  status: string;
  order_date: string;
  expected_delivery_date: string;
  work_order_id: number;
}

interface SearchResults {
  workOrders: WorkOrder[];
  customers: Customer[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
}

type SearchType = 'all' | 'work_orders' | 'customers' | 'inventory' | 'purchase_orders';

// ================================
// MAIN COMPONENT
// ================================

const Find: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [results, setResults] = useState<SearchResults>({
    workOrders: [],
    customers: [],
    inventory: [],
    purchaseOrders: []
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 300);
    } else if (searchQuery.trim().length === 0) {
      setResults({
        workOrders: [],
        customers: [],
        inventory: [],
        purchaseOrders: []
      });
      setHasSearched(false);
      setTotalResults(0);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, searchType]);

  const performSearch = async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setLoading(true);
    setHasSearched(true);

    try {
      console.log(`🔍 Searching for: "${query}" (type: ${searchType})`);

      const response = await fetch(
        `http://localhost:5000/api/search?q=${encodeURIComponent(query)}&type=${searchType}`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        setTotalResults(data.totalResults);
        console.log(`✅ Found ${data.totalResults} results`);
      } else {
        console.error('❌ Search failed:', response.status);
        setResults({
          workOrders: [],
          customers: [],
          inventory: [],
          purchaseOrders: []
        });
        setTotalResults(0);
      }
    } catch (error) {
      console.error('❌ Search error:', error);
      setResults({
        workOrders: [],
        customers: [],
        inventory: [],
        purchaseOrders: []
      });
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setResults({
      workOrders: [],
      customers: [],
      inventory: [],
      purchaseOrders: []
    });
    setHasSearched(false);
    setTotalResults(0);
    searchInputRef.current?.focus();
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    if (searchQuery.trim().length >= 2) {
      // Will trigger search via useEffect
    }
  };

  // ================================
  // RENDER HELPERS
  // ================================

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#3b82f6';
      case 'completed':
        return '#10b981';
      case 'suspended':
        return '#f59e0b';
      case 'deleted':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // ================================
  // RENDER
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
          <Sparkles style={{ width: '2rem', height: '2rem', color: '#6366f1' }} />
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0
          }}>
            Universal Search
          </h1>
        </div>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          margin: 0
        }}>
          Search across work orders, customers, inventory, and purchase orders
        </p>
      </div>

      {/* Search Type Buttons */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 1.5rem'
      }}>
        <p style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#4b5563',
          marginBottom: '0.75rem'
        }}>
          What are you looking for?
        </p>
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => handleSearchTypeChange('all')}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: searchType === 'all' ? '#6366f1' : 'white',
              color: searchType === 'all' ? 'white' : '#4b5563',
              border: searchType === 'all' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Sparkles style={{ width: '1rem', height: '1rem' }} />
            Everything
          </button>

          <button
            onClick={() => handleSearchTypeChange('work_orders')}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: searchType === 'work_orders' ? '#6366f1' : 'white',
              color: searchType === 'work_orders' ? 'white' : '#4b5563',
              border: searchType === 'work_orders' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <FileText style={{ width: '1rem', height: '1rem' }} />
            Work Orders
          </button>

          <button
            onClick={() => handleSearchTypeChange('customers')}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: searchType === 'customers' ? '#6366f1' : 'white',
              color: searchType === 'customers' ? 'white' : '#4b5563',
              border: searchType === 'customers' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Users style={{ width: '1rem', height: '1rem' }} />
            Customers
          </button>

          <button
            onClick={() => handleSearchTypeChange('inventory')}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: searchType === 'inventory' ? '#6366f1' : 'white',
              color: searchType === 'inventory' ? 'white' : '#4b5563',
              border: searchType === 'inventory' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Package style={{ width: '1rem', height: '1rem' }} />
            Inventory Parts
          </button>

          <button
            onClick={() => handleSearchTypeChange('purchase_orders')}
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: searchType === 'purchase_orders' ? '#6366f1' : 'white',
              color: searchType === 'purchase_orders' ? 'white' : '#4b5563',
              border: searchType === 'purchase_orders' ? 'none' : '2px solid #e5e7eb',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <ShoppingCart style={{ width: '1rem', height: '1rem' }} />
            Purchase Orders
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto 2rem',
        position: 'relative'
      }}>
        <Search
          style={{
            position: 'absolute',
            left: '1.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '1.5rem',
            height: '1.5rem',
            color: loading ? '#3b82f6' : '#9ca3af',
            animation: loading ? 'spin 1s linear infinite' : 'none'
          }}
        />

        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search by WO#, customer name, PO#, part number, amount, description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            padding: '1.25rem 1.5rem 1.25rem 4rem',
            paddingRight: searchQuery ? '4rem' : '1.5rem',
            border: '2px solid #e5e7eb',
            borderRadius: '0.75rem',
            fontSize: '1.125rem',
            outline: 'none',
            backgroundColor: 'white',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#6366f1';
            e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#e5e7eb';
            e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
          }}
        />

        {searchQuery && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '1.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              border: 'none',
              background: '#f3f4f6',
              borderRadius: '50%',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
          </button>
        )}
      </div>

      {/* Results Summary */}
      {hasSearched && (
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto 1.5rem'
        }}>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            margin: 0
          }}>
            {loading ? (
              'Searching...'
            ) : (
              totalResults === 0 ? (
                `No results found for "${searchQuery}"`
              ) : (
                `Found ${totalResults} result${totalResults === 1 ? '' : 's'} for "${searchQuery}"`
              )
            )}
          </p>
        </div>
      )}

      {/* Results Grid */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(600px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Work Orders Results */}
        {(searchType === 'all' || searchType === 'work_orders') && results.workOrders.length > 0 && (
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileText style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
              Work Orders ({results.workOrders.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.workOrders.map((wo) => (
                <div
                  key={wo.id}
                  onClick={() => navigate(`/work-orders/${wo.id}`)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        WO #{wo.wo_number}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: getStatusColor(wo.status),
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem'
                      }}>
                        {wo.status}
                      </span>
                    </div>
                    <ExternalLink style={{ width: '1rem', height: '1rem', color: '#9ca3af' }} />
                  </div>

                  <div style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                    <strong>{wo.customer_name}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {wo.call_type && (
                      <span>{wo.call_type}</span>
                    )}
                    {wo.equipment_type && (
                      <span>• {wo.equipment_type}</span>
                    )}
                  </div>

                  {wo.scheduled_date && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      <Calendar style={{ width: '0.875rem', height: '0.875rem' }} />
                      {formatDate(wo.scheduled_date)}
                    </div>
                  )}

                  {wo.problem_description && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {wo.problem_description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customers Results */}
        {(searchType === 'all' || searchType === 'customers') && results.customers.length > 0 && (
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Users style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
              Customers ({results.customers.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.customers.map((customer) => (
                <div
                  key={customer.id}
                  onClick={() => navigate(`/customers/${customer.id}`)}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                          {customer.name}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          backgroundColor: '#f3f4f6',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem'
                        }}>
                          #{customer.customer_number}
                        </span>
                      </div>
                    </div>
                    <ExternalLink style={{ width: '1rem', height: '1rem', color: '#9ca3af' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    {customer.service_address_line1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <MapPin style={{ width: '0.875rem', height: '0.875rem' }} />
                        {customer.service_address_line1}, {customer.service_city}, {customer.service_state}
                      </div>
                    )}
                    {customer.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Phone style={{ width: '0.875rem', height: '0.875rem' }} />
                        {customer.phone}
                      </div>
                    )}
                    {customer.balance_due > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#dc2626' }}>
                        <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                        Balance: {formatCurrency(customer.balance_due)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Results */}
        {(searchType === 'all' || searchType === 'inventory') && results.inventory.length > 0 && (
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Package style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
              Inventory Parts ({results.inventory.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.inventory.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                          {item.part_number}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#6b7280',
                          backgroundColor: '#f3f4f6',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '0.25rem'
                        }}>
                          {item.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#4b5563' }}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                    {item.manufacturer && <span>{item.manufacturer}</span>}
                    <span>• Cost: {formatCurrency(item.cost)}</span>
                    <span>• Retail: {formatCurrency(item.retail_price)}</span>
                    <span>• Stock: {item.quantity_in_stock}</span>
                  </div>

                  {item.location && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      <MapPin style={{ width: '0.875rem', height: '0.875rem' }} />
                      Location: {item.location}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Purchase Orders Results */}
        {(searchType === 'all' || searchType === 'purchase_orders') && results.purchaseOrders.length > 0 && (
          <div>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShoppingCart style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
              Purchase Orders ({results.purchaseOrders.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {results.purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937' }}>
                        PO #{po.po_number}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'white',
                        backgroundColor: getStatusColor(po.status),
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem'
                      }}>
                        {po.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '0.5rem' }}>
                    {po.vendor_name}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <DollarSign style={{ width: '0.875rem', height: '0.875rem' }} />
                      {formatCurrency(po.total_amount)}
                    </div>
                    {po.order_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Calendar style={{ width: '0.875rem', height: '0.875rem' }} />
                        {formatDate(po.order_date)}
                      </div>
                    )}
                    {po.work_order_id && (
                      <span>
                        • Linked to WO
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* No Results Message */}
      {hasSearched && !loading && totalResults === 0 && searchQuery.trim().length >= 2 && (
        <div style={{
          maxWidth: '600px',
          margin: '4rem auto',
          textAlign: 'center'
        }}>
          <AlertCircle style={{
            width: '4rem',
            height: '4rem',
            color: '#d1d5db',
            margin: '0 auto 1rem'
          }} />
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            No results found
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '1.5rem'
          }}>
            We couldn't find anything matching "{searchQuery}". Try a different search term or filter.
          </p>
          <button
            onClick={clearSearch}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Loading/Search Animation */}
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

export default Find;
