// PurchasingTab.tsx - Purchase Order Management for Work Orders
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Package,
  Truck,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  ExternalLink
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_id: number;
  vendor_name: string;
  order_date: string;
  expected_delivery?: string;
  received_date?: string;
  status: 'Open' | 'Ordered' | 'Partial' | 'Received' | 'Cancelled';
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_method?: string;
  tracking_number?: string;
  notes?: string;
  line_items?: any[];
}

interface Vendor {
  id: number;
  vendor_number: string;
  name: string;
  phone?: string;
  email?: string;
  payment_terms?: string;
}

interface PurchasingTabProps {
  workOrderId: number;
  isReadOnly?: boolean;
}

const PurchasingTab: React.FC<PurchasingTabProps> = ({ workOrderId, isReadOnly = false }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    loadPurchaseOrders();
    loadVendors();
  }, [workOrderId]);

  const loadPurchaseOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE}/purchase-orders?work_order_id=${workOrderId}`
      );
      if (!response.ok) throw new Error('Failed to load purchase orders');
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const response = await fetch(`${API_BASE}/vendors?active_only=true`);
      if (!response.ok) throw new Error('Failed to load vendors');
      const data = await response.json();
      setVendors(data);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Received':
        return { bg: '#ECFDF5', text: '#10B981', border: '#10B981' };
      case 'Ordered':
        return { bg: '#DBEAFE', text: '#3B82F6', border: '#3B82F6' };
      case 'Partial':
        return { bg: '#FEF3C7', text: '#F59E0B', border: '#F59E0B' };
      case 'Cancelled':
        return { bg: '#FEE2E2', text: '#EF4444', border: '#EF4444' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#6B7280' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Received':
        return <CheckCircle size={16} />;
      case 'Ordered':
        return <Truck size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
        Loading purchase orders...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
            Purchase Orders
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
            Manage parts orders and vendor tracking
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setShowCreatePO(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Create PO
          </button>
        )}
      </div>

      {/* Purchase Orders List */}
      {purchaseOrders.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#F9FAFB',
          borderRadius: '0.75rem',
          border: '2px dashed #D1D5DB'
        }}>
          <Package size={48} color="#9CA3AF" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#6B7280', fontSize: '1rem', margin: 0 }}>
            No purchase orders yet
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Create a PO to order parts for this work order
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {purchaseOrders.map((po) => {
            const statusStyle = getStatusColor(po.status);
            return (
              <div
                key={po.id}
                style={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.75rem',
                  padding: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedPO(po)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#1F2937' }}>
                        {po.po_number}
                      </h4>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        border: `1px solid ${statusStyle.border}`
                      }}>
                        {getStatusIcon(po.status)}
                        {po.status}
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                      Vendor: {po.vendor_name}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                      ${po.total_amount.toFixed(2)}
                    </div>
                    {po.payment_method && (
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                        {po.payment_method}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                      Order Date
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                      {new Date(po.order_date).toLocaleDateString()}
                    </div>
                  </div>

                  {po.expected_delivery && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                        Expected Delivery
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                        {new Date(po.expected_delivery).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {po.tracking_number && (
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                        Tracking
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#3B82F6',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        {po.tracking_number}
                        <ExternalLink size={12} />
                      </div>
                    </div>
                  )}
                </div>

                {po.notes && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: '#6B7280'
                  }}>
                    <strong>Notes:</strong> {po.notes}
                  </div>
                )}

                <div style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {po.line_items?.length || 0} line items
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPO(po);
                    }}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: 'transparent',
                      color: '#3B82F6',
                      border: '1px solid #3B82F6',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}
                  >
                    <FileText size={14} />
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create PO Modal Placeholder */}
      {showCreatePO && (
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
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              Create Purchase Order
            </h3>
            <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
              Select a vendor and add line items to create a purchase order.
            </p>

            {/* Vendor Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Vendor *
              </label>
              <select style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}>
                <option value="">Select a vendor...</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setShowCreatePO(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {selectedPO && (
        <div
          style={{
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
          }}
          onClick={() => setSelectedPO(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '800px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
              {selectedPO.po_number} - Details
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Vendor
                </div>
                <div style={{ fontSize: '1rem', color: '#111827', fontWeight: '600' }}>
                  {selectedPO.vendor_name}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Total Amount
                </div>
                <div style={{ fontSize: '1.5rem', color: '#111827', fontWeight: '700' }}>
                  ${selectedPO.total_amount.toFixed(2)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Order Date
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {new Date(selectedPO.order_date).toLocaleDateString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Status
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '600' }}>
                  {selectedPO.status}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPO(null)}
              style={{
                marginTop: '1.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#F3F4F6',
                color: '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                width: '100%'
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

export default PurchasingTab;
