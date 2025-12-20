// ReceivePODialog.tsx - Receive purchase order and auto-add to register
import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle,
  AlertCircle,
  Package,
  TrendingDown,
  Calendar,
  FileText
} from 'lucide-react';

interface POItem {
  id: number;
  line_number: number;
  part_number: string;
  description: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  extended_price: number;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  vendor_name: string;
  work_order_number: string | null;
  total_amount: number;
}

interface ReceivePODialogProps {
  isOpen: boolean;
  purchaseOrder: PurchaseOrder | null;
  userId: number;
  onClose: () => void;
  onPOReceived?: () => void;
}

interface ItemReceiveState {
  id: number;
  quantity_received: number;
  is_backordered: boolean;
  backorder_eta: string;
}

const ReceivePODialog: React.FC<ReceivePODialogProps> = ({
  isOpen,
  purchaseOrder,
  userId,
  onClose,
  onPOReceived
}) => {
  const [items, setItems] = useState<POItem[]>([]);
  const [itemStates, setItemStates] = useState<{ [key: number]: ItemReceiveState }>({});
  const [receivingNotes, setReceivingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && purchaseOrder) {
      loadPOItems();
    }
  }, [isOpen, purchaseOrder]);

  const loadPOItems = async () => {
    if (!purchaseOrder) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/purchase-orders/${purchaseOrder.id}`);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);

        // Initialize item states with full quantities
        const initialStates: { [key: number]: ItemReceiveState } = {};
        data.items.forEach((item: POItem) => {
          initialStates[item.id] = {
            id: item.id,
            quantity_received: item.quantity_ordered, // Default to full quantity
            is_backordered: false,
            backorder_eta: ''
          };
        });
        setItemStates(initialStates);
      } else {
        throw new Error('Failed to load PO items');
      }
    } catch (err: any) {
      console.error('PO items load error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateItemState = (itemId: number, field: string, value: any) => {
    setItemStates(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const isPartialReceive = () => {
    return items.some(item => {
      const state = itemStates[item.id];
      return state && (
        state.quantity_received < item.quantity_ordered ||
        state.is_backordered
      );
    });
  };

  const handleSubmit = async () => {
    if (!purchaseOrder) return;

    // Validate
    const hasInvalidQty = items.some(item => {
      const state = itemStates[item.id];
      return state && state.quantity_received > item.quantity_ordered;
    });

    if (hasInvalidQty) {
      setError('Received quantity cannot exceed ordered quantity');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/purchase-orders/${purchaseOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          received_by: userId,
          receiving_notes: receivingNotes.trim() || null,
          partial_receive: isPartialReceive(),
          items: Object.values(itemStates)
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ PO received: ${purchaseOrder.po_number}`);

        setSuccess(true);

        if (onPOReceived) {
          onPOReceived();
        }

        // Auto-close after 2 seconds
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to receive purchase order');
      }
    } catch (err: any) {
      console.error('PO receive error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setItems([]);
    setItemStates({});
    setReceivingNotes('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen || !purchaseOrder) return null;

  const totalReceived = items.reduce((sum, item) => {
    const state = itemStates[item.id];
    return sum + ((state?.quantity_received || 0) * item.unit_price);
  }, 0);

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
                Receive Purchase Order
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280'
              }}>
                {purchaseOrder.po_number} • {purchaseOrder.vendor_name}
                {purchaseOrder.work_order_number && ` • WO #${purchaseOrder.work_order_number}`}
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
                <div>
                  <div style={{ color: '#047857', fontSize: '0.875rem', fontWeight: '500' }}>
                    Purchase order received successfully!
                  </div>
                  {purchaseOrder.work_order_number && (
                    <div style={{ color: '#047857', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      Items have been automatically added to work order register
                    </div>
                  )}
                </div>
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
                {/* Instructions */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '0.5rem',
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem',
                  color: '#1E40AF'
                }}>
                  <strong>Instructions:</strong> Enter the quantity received for each item. If any items are backordered,
                  check the backorder box and optionally enter an ETA date.
                </div>

                {/* Items Table */}
                {loading ? (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '200px'
                  }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      border: '3px solid #E5E7EB',
                      borderTop: '3px solid #3B82F6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  </div>
                ) : (
                  <div style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '1.5rem'
                  }}>
                    {items.map((item, index) => {
                      const state = itemStates[item.id] || {
                        id: item.id,
                        quantity_received: item.quantity_ordered,
                        is_backordered: false,
                        backorder_eta: ''
                      };

                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: '1rem',
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '0.5rem',
                            marginBottom: index < items.length - 1 ? '0.75rem' : 0
                          }}
                        >
                          {/* Item Header */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem'
                          }}>
                            <div>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: '#111827',
                                marginBottom: '0.25rem'
                              }}>
                                {item.description}
                              </div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6B7280',
                                fontFamily: 'monospace'
                              }}>
                                Part #: {item.part_number || 'N/A'}
                              </div>
                            </div>
                            <div style={{
                              textAlign: 'right',
                              fontSize: '0.875rem',
                              color: '#6B7280'
                            }}>
                              Ordered: <strong style={{ color: '#111827' }}>{item.quantity_ordered}</strong>
                            </div>
                          </div>

                          {/* Receive Controls */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '150px 1fr auto',
                            gap: '0.75rem',
                            alignItems: 'center'
                          }}>
                            {/* Quantity Received */}
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.375rem'
                              }}>
                                Qty Received
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={item.quantity_ordered}
                                value={state.quantity_received}
                                onChange={(e) => updateItemState(item.id, 'quantity_received', Number(e.target.value))}
                                disabled={submitting}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem',
                                  textAlign: 'right',
                                  fontWeight: '600'
                                }}
                              />
                            </div>

                            {/* Backorder ETA */}
                            <div>
                              <label style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#374151',
                                marginBottom: '0.375rem'
                              }}>
                                Backorder ETA (if applicable)
                              </label>
                              <input
                                type="date"
                                value={state.backorder_eta}
                                onChange={(e) => {
                                  updateItemState(item.id, 'backorder_eta', e.target.value);
                                  if (e.target.value) {
                                    updateItemState(item.id, 'is_backordered', true);
                                  }
                                }}
                                disabled={submitting}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '0.375rem',
                                  fontSize: '0.875rem'
                                }}
                              />
                            </div>

                            {/* Backorder Checkbox */}
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: state.is_backordered ? '#FEF2F2' : '#F9FAFB',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              color: state.is_backordered ? '#DC2626' : '#6B7280',
                              whiteSpace: 'nowrap'
                            }}>
                              <input
                                type="checkbox"
                                checked={state.is_backordered}
                                onChange={(e) => updateItemState(item.id, 'is_backordered', e.target.checked)}
                                disabled={submitting}
                                style={{ cursor: 'pointer' }}
                              />
                              <TrendingDown size={14} />
                              Backordered
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Receiving Notes */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Receiving Notes (Optional)
                  </label>
                  <textarea
                    value={receivingNotes}
                    onChange={(e) => setReceivingNotes(e.target.value)}
                    disabled={submitting}
                    placeholder="Condition notes, packaging issues, etc..."
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

                {/* Summary */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: isPartialReceive() ? '#FEF2F2' : '#ECFDF5',
                  border: `1px solid ${isPartialReceive() ? '#FCA5A5' : '#A7F3D0'}`,
                  borderRadius: '0.75rem'
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
                        {isPartialReceive() ? 'Partial Receive' : 'Full Receive'}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: isPartialReceive() ? '#991B1B' : '#047857'
                      }}>
                        {isPartialReceive()
                          ? 'Some items are backordered or partially received'
                          : 'All items will be received and added to register'
                        }
                      </div>
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: isPartialReceive() ? '#DC2626' : '#059669'
                    }}>
                      ${totalReceived.toFixed(2)}
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
                disabled={submitting || loading}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: (submitting || loading) ? '#9CA3AF' : '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: (submitting || loading) ? 'not-allowed' : 'pointer',
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
                    Receiving...
                  </>
                ) : (
                  <>
                    <Package size={16} />
                    Receive Purchase Order
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

export default ReceivePODialog;
