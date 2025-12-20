// PurchaseOrderList.tsx - Purchase Order management interface
import React, { useState, useEffect } from 'react';
import {
  Package,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Truck,
  DollarSign,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';

interface Vendor {
  id: number;
  vendor_name: string;
  payment_type: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  received_date: string | null;
  total_amount: number;
  work_order_id: number | null;
  work_order_number: string | null;
  vendor_name: string;
  vendor_payment_type: string;
  item_count: number;
  items_received: number;
  items_backordered: number;
  ordered_by_name: string | null;
  auto_added_to_register: boolean;
}

interface POItem {
  id: number;
  line_number: number;
  part_number: string;
  description: string;
  quantity_ordered: number;
  quantity_received: number;
  quantity_backordered: number;
  unit_price: number;
  extended_price: number;
  is_backordered: boolean;
  backorder_eta: string | null;
}

interface PurchaseOrderListProps {
  onCreatePO?: () => void;
  onReceivePO?: (po: PurchaseOrder) => void;
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({
  onCreatePO,
  onReceivePO
}) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [expandedPO, setExpandedPO] = useState<number | null>(null);
  const [poItems, setPOItems] = useState<{ [key: number]: POItem[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadPurchaseOrders();

    // Set up real-time updates
    const socket = (window as any).io?.('http://localhost:5000');

    if (socket) {
      socket.on('purchaseOrderCreated', () => loadPurchaseOrders());
      socket.on('purchaseOrderUpdated', () => loadPurchaseOrders());
      socket.on('purchaseOrderReceived', () => loadPurchaseOrders());

      return () => socket.disconnect();
    }
  }, [statusFilter]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    setError(null);

    try {
      let url = 'http://localhost:5000/api/purchase-orders';
      if (statusFilter !== 'all') {
        url += `?status=${statusFilter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.purchase_orders || []);
      } else {
        throw new Error('Failed to load purchase orders');
      }
    } catch (err: any) {
      console.error('PO load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPOItems = async (poId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/purchase-orders/${poId}`);
      if (response.ok) {
        const data = await response.json();
        setPOItems(prev => ({ ...prev, [poId]: data.items || [] }));
      }
    } catch (err: any) {
      console.error('PO items load error:', err);
    }
  };

  const togglePO = (poId: number) => {
    if (expandedPO === poId) {
      setExpandedPO(null);
    } else {
      setExpandedPO(poId);
      if (!poItems[poId]) {
        loadPOItems(poId);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return '#F59E0B';
      case 'received':
        return '#10B981';
      case 'backordered':
        return '#EF4444';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return <Clock size={16} />;
      case 'received':
        return <CheckCircle size={16} />;
      case 'backordered':
        return <AlertCircle size={16} />;
      case 'cancelled':
        return <XCircle size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            Purchase Orders
          </h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6B7280'
          }}>
            Manage vendor purchase orders and parts inventory
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.625rem 1rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="received">Received</option>
            <option value="backordered">Backordered</option>
          </select>

          {/* Create PO Button */}
          {onCreatePO && (
            <button
              onClick={onCreatePO}
              style={{
                padding: '0.625rem 1.25rem',
                backgroundColor: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={16} />
              New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {['open', 'received', 'backordered'].map(status => {
          const count = purchaseOrders.filter(po => po.status.toLowerCase() === status).length;
          const total = purchaseOrders
            .filter(po => po.status.toLowerCase() === status)
            .reduce((sum, po) => sum + po.total_amount, 0);

          return (
            <div
              key={status}
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '0.75rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'uppercase'
                }}>
                  {status}
                </span>
                <div style={{ color: getStatusColor(status) }}>
                  {getStatusIcon(status)}
                </div>
              </div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.25rem'
              }}>
                {count}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#6B7280'
              }}>
                {formatCurrency(total)}
              </div>
            </div>
          );
        })}
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

      {/* Loading */}
      {loading && purchaseOrders.length === 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '300px'
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
      )}

      {/* Purchase Orders List */}
      {!loading && purchaseOrders.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: '#9CA3AF'
        }}>
          <Package size={48} style={{ margin: '0 auto 1rem' }} />
          <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            No purchase orders found
          </p>
          <p style={{ fontSize: '0.875rem' }}>
            {statusFilter !== 'all'
              ? `No ${statusFilter} purchase orders at this time.`
              : 'Create your first purchase order to get started.'
            }
          </p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {purchaseOrders.map((po) => (
          <div
            key={po.id}
            style={{
              border: '1px solid #E5E7EB',
              borderRadius: '0.75rem',
              backgroundColor: 'white',
              overflow: 'hidden'
            }}
          >
            {/* PO Header */}
            <div
              onClick={() => togglePO(po.id)}
              style={{
                padding: '1.25rem',
                cursor: 'pointer',
                backgroundColor: expandedPO === po.id ? '#F9FAFB' : 'white',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (expandedPO !== po.id) {
                  e.currentTarget.style.backgroundColor = '#FAFAFA';
                }
              }}
              onMouseLeave={(e) => {
                if (expandedPO !== po.id) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                {/* Left: PO Info */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.75rem'
                  }}>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: '700',
                      color: '#111827',
                      margin: 0
                    }}>
                      {po.po_number}
                    </h3>
                    <div style={{
                      padding: '0.25rem 0.75rem',
                      backgroundColor: getStatusColor(po.status) + '20',
                      color: getStatusColor(po.status),
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      {getStatusIcon(po.status)}
                      {po.status}
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#6B7280'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <ShoppingCart size={14} />
                      {po.vendor_name}
                    </div>
                    {po.work_order_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <FileText size={14} />
                        WO #{po.work_order_number}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Calendar size={14} />
                      Ordered: {formatDate(po.order_date)}
                    </div>
                    {po.expected_delivery_date && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Truck size={14} />
                        Expected: {formatDate(po.expected_delivery_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginBottom: '0.25rem'
                    }}>
                      Total Amount
                    </div>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      {formatCurrency(po.total_amount)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6B7280',
                      marginTop: '0.25rem'
                    }}>
                      {po.item_count} item{po.item_count !== 1 ? 's' : ''}
                      {po.items_backordered > 0 && (
                        <span style={{ color: '#EF4444', fontWeight: '500' }}>
                          {' '}• {po.items_backordered} backordered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Receive Button */}
                  {po.status.toLowerCase() !== 'received' && po.status.toLowerCase() !== 'cancelled' && onReceivePO && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReceivePO(po);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <CheckCircle size={14} />
                      Receive
                    </button>
                  )}

                  {/* Expand Icon */}
                  <div style={{ color: '#9CA3AF' }}>
                    {expandedPO === po.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PO Items (Expanded) */}
            {expandedPO === po.id && poItems[po.id] && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#F9FAFB',
                borderTop: '1px solid #E5E7EB'
              }}>
                <h4 style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Line Items
                </h4>

                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  overflow: 'hidden'
                }}>
                  <table style={{
                    width: '100%',
                    fontSize: '0.875rem',
                    borderCollapse: 'collapse'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F3F4F6' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>#</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Part Number</th>
                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Description</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Qty Ordered</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Qty Received</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Unit Price</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems[po.id].map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            borderTop: idx > 0 ? '1px solid #E5E7EB' : 'none',
                            backgroundColor: item.is_backordered ? '#FEF2F2' : 'white'
                          }}
                        >
                          <td style={{ padding: '0.75rem', color: '#6B7280' }}>{item.line_number}</td>
                          <td style={{ padding: '0.75rem', color: '#111827', fontFamily: 'monospace' }}>{item.part_number}</td>
                          <td style={{ padding: '0.75rem', color: '#111827' }}>{item.description}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#111827' }}>{item.quantity_ordered}</td>
                          <td style={{
                            padding: '0.75rem',
                            textAlign: 'right',
                            color: item.is_backordered ? '#DC2626' : '#059669',
                            fontWeight: '600'
                          }}>
                            {item.quantity_received}
                            {item.is_backordered && ` (${item.quantity_backordered} B/O)`}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#111827' }}>{formatCurrency(item.unit_price)}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', color: '#111827', fontWeight: '600' }}>{formatCurrency(item.extended_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {po.auto_added_to_register && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#047857'
                  }}>
                    <CheckCircle size={16} />
                    Items have been automatically added to work order register
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

export default PurchaseOrderList;
