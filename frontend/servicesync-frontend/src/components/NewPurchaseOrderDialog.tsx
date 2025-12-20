// NewPurchaseOrderDialog.tsx - Create new purchase order
import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  Save,
  AlertCircle,
  CheckCircle,
  Package
} from 'lucide-react';

interface Vendor {
  id: number;
  vendor_name: string;
  payment_type: string;
}

interface POLineItem {
  tempId: number;
  part_number: string;
  description: string;
  quantity_ordered: number;
  unit_price: number;
  item_notes: string;
}

interface NewPurchaseOrderDialogProps {
  isOpen: boolean;
  workOrderId?: number | null;
  userId: number;
  onClose: () => void;
  onPOCreated?: (poNumber: string) => void;
}

const NewPurchaseOrderDialog: React.FC<NewPurchaseOrderDialogProps> = ({
  isOpen,
  workOrderId,
  userId,
  onClose,
  onPOCreated
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [lineItems, setLineItems] = useState<POLineItem[]>([]);
  const [nextTempId, setNextTempId] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdPONumber, setCreatedPONumber] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadVendors();
      // Add one empty line item to start
      addLineItem();
    }
  }, [isOpen]);

  const loadVendors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/vendors?active_only=true');
      if (response.ok) {
        const data = await response.json();
        setVendors(data.vendors || []);
      }
    } catch (err) {
      console.error('Vendors load error:', err);
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        tempId: nextTempId,
        part_number: '',
        description: '',
        quantity_ordered: 1,
        unit_price: 0,
        item_notes: ''
      }
    ]);
    setNextTempId(nextTempId + 1);
  };

  const removeLineItem = (tempId: number) => {
    setLineItems(lineItems.filter(item => item.tempId !== tempId));
  };

  const updateLineItem = (tempId: number, field: string, value: any) => {
    setLineItems(lineItems.map(item =>
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      return sum + (item.quantity_ordered * item.unit_price);
    }, 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedVendorId) {
      setError('Please select a vendor');
      return;
    }

    const validItems = lineItems.filter(item =>
      item.description.trim() && item.quantity_ordered > 0 && item.unit_price >= 0
    );

    if (validItems.length === 0) {
      setError('Please add at least one line item with description, quantity, and price');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: workOrderId || null,
          vendor_id: selectedVendorId,
          expected_delivery_date: expectedDeliveryDate || null,
          order_notes: orderNotes.trim() || null,
          ordered_by: userId,
          items: validItems
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Purchase order created: ${data.purchase_order.po_number}`);

        setCreatedPONumber(data.purchase_order.po_number);
        setSuccess(true);

        if (onPOCreated) {
          onPOCreated(data.purchase_order.po_number);
        }

        // Auto-close after 1.5 seconds
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase order');
      }
    } catch (err: any) {
      console.error('PO creation error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedVendorId(null);
    setExpectedDeliveryDate('');
    setOrderNotes('');
    setLineItems([]);
    setNextTempId(1);
    setError(null);
    setSuccess(false);
    setCreatedPONumber('');
    onClose();
  };

  if (!isOpen) return null;

  const subtotal = calculateSubtotal();

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
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
          zIndex: 1000,
          padding: '1rem'
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1.5rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: 'white',
            zIndex: 10
          }}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.25rem'
              }}>
                Create Purchase Order
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280'
              }}>
                {workOrderId ? `For Work Order #${workOrderId}` : 'Stock order'}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={submitting}
              style={{
                padding: '0.5rem',
                backgroundColor: '#F3F4F6',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color="#6B7280" />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '1.5rem' }}>
            {/* Success Message */}
            {success && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <CheckCircle size={20} color="#059669" />
                <span style={{ color: '#047857', fontSize: '0.875rem', fontWeight: '500' }}>
                  Purchase order {createdPONumber} created successfully!
                </span>
              </div>
            )}

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

            {!success && (
              <>
                {/* Vendor & Date */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.5rem'
                    }}>
                      Vendor *
                    </label>
                    <select
                      value={selectedVendorId || ''}
                      onChange={(e) => setSelectedVendorId(Number(e.target.value))}
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value="">Select a vendor...</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.vendor_name} ({vendor.payment_type.replace('_', ' ').toUpperCase()})
                        </option>
                      ))}
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
                      Expected Delivery
                    </label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      disabled={submitting}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <label style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#374151',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Line Items
                    </label>
                    <button
                      onClick={addLineItem}
                      disabled={submitting}
                      style={{
                        padding: '0.5rem 0.75rem',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                      }}
                    >
                      <Plus size={14} />
                      Add Item
                    </button>
                  </div>

                  <div style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    padding: '1rem'
                  }}>
                    {lineItems.map((item, index) => (
                      <div
                        key={item.tempId}
                        style={{
                          padding: '1rem',
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '0.5rem',
                          marginBottom: index < lineItems.length - 1 ? '0.75rem' : 0
                        }}
                      >
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '120px 1fr 80px 100px auto',
                          gap: '0.75rem',
                          alignItems: 'start'
                        }}>
                          {/* Part Number */}
                          <input
                            type="text"
                            placeholder="Part #"
                            value={item.part_number}
                            onChange={(e) => updateLineItem(item.tempId, 'part_number', e.target.value)}
                            disabled={submitting}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              fontFamily: 'monospace'
                            }}
                          />

                          {/* Description */}
                          <input
                            type="text"
                            placeholder="Description *"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.tempId, 'description', e.target.value)}
                            disabled={submitting}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem'
                            }}
                          />

                          {/* Quantity */}
                          <input
                            type="number"
                            placeholder="Qty"
                            min="1"
                            value={item.quantity_ordered}
                            onChange={(e) => updateLineItem(item.tempId, 'quantity_ordered', Number(e.target.value))}
                            disabled={submitting}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              textAlign: 'right'
                            }}
                          />

                          {/* Unit Price */}
                          <input
                            type="number"
                            placeholder="Price"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(item.tempId, 'unit_price', Number(e.target.value))}
                            disabled={submitting}
                            style={{
                              padding: '0.5rem',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              fontSize: '0.875rem',
                              textAlign: 'right'
                            }}
                          />

                          {/* Total & Delete */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            <div style={{
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              color: '#111827',
                              minWidth: '80px',
                              textAlign: 'right'
                            }}>
                              ${(item.quantity_ordered * item.unit_price).toFixed(2)}
                            </div>
                            {lineItems.length > 1 && (
                              <button
                                onClick={() => removeLineItem(item.tempId)}
                                disabled={submitting}
                                style={{
                                  padding: '0.375rem',
                                  backgroundColor: '#FEE2E2',
                                  color: '#DC2626',
                                  border: 'none',
                                  borderRadius: '0.375rem',
                                  cursor: submitting ? 'not-allowed' : 'pointer'
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Notes */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    disabled={submitting}
                    placeholder="Special instructions, shipping details, etc..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Totals */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.75rem',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Order Total
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#6B7280'
                      }}>
                        {lineItems.filter(i => i.description.trim()).length} item{lineItems.filter(i => i.description.trim()).length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '1.875rem',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      ${subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'white'
            }}>
              <button
                onClick={handleClose}
                disabled={submitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: submitting ? '#9CA3AF' : '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {submitting ? (
                  <>
                    <div style={{
                      width: '1rem',
                      height: '1rem',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Create Purchase Order
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default NewPurchaseOrderDialog;
