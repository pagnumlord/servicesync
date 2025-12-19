// CheckoutDialog.tsx - Work order checkout with automatic queue routing
import React, { useState } from 'react';
import {
  X,
  Package,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

interface CheckoutDialogProps {
  isOpen: boolean;
  workOrder: {
    id: number;
    work_order_number: string;
    customer_name?: string;
  } | null;
  userId: number;
  onClose: () => void;
  onCheckoutComplete?: (targetQueue: string) => void;
}

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({
  isOpen,
  workOrder,
  userId,
  onClose,
  onCheckoutComplete
}) => {
  const [needsParts, setNeedsParts] = useState(false);
  const [needsReturn, setNeedsReturn] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !workOrder) return null;

  // Determine target queue based on selections
  const getTargetQueue = () => {
    if (needsParts) {
      return 'Needs Parts';
    } else if (needsReturn) {
      return 'Needs Return Trip';
    } else {
      return 'Invoice Review';
    }
  };

  const getQueueColor = () => {
    if (needsParts) return '#F59E0B';
    if (needsReturn) return '#8B5CF6';
    return '#3B82F6';
  };

  const getQueueDescription = () => {
    if (needsParts) {
      return 'Work order will be moved to Needs Parts queue and awaits parts ordering.';
    } else if (needsReturn) {
      return 'Work order will be moved to Needs Return Trip queue for NON-parts return visit.';
    } else {
      return 'Work order will be moved to Invoice Review queue for billing.';
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/work-orders/${workOrder.id}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          needsParts,
          needsReturn,
          userId,
          statusNotes: statusNotes.trim() || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Work order checked out to ${data.target_queue}`);

        setSuccess(true);

        // Notify parent component
        if (onCheckoutComplete) {
          onCheckoutComplete(data.target_queue);
        }

        // Auto-close after 1.5 seconds
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Checkout failed');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setNeedsParts(false);
    setNeedsReturn(false);
    setStatusNotes('');
    setError(null);
    setSuccess(false);
    onClose();
  };

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
            maxWidth: '600px',
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
            alignItems: 'center'
          }}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '0.25rem'
              }}>
                Check Out Work Order
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: '#6B7280'
              }}>
                WO #{workOrder.work_order_number}
                {workOrder.customer_name && ` • ${workOrder.customer_name}`}
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
                justifyContent: 'center',
                opacity: submitting ? 0.5 : 1
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
                  Work order checked out successfully!
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
                {/* Checkout Questions */}
                <div style={{
                  marginBottom: '1.5rem',
                  padding: '1.25rem',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '0.75rem',
                  border: '1px solid #E5E7EB'
                }}>
                  <h3 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Checkout Questions
                  </h3>

                  {/* Needs Parts */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    backgroundColor: needsParts ? '#FEF3C7' : 'white',
                    borderRadius: '0.5rem',
                    border: needsParts ? '2px solid #F59E0B' : '1px solid #E5E7EB',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={needsParts}
                      onChange={(e) => {
                        setNeedsParts(e.target.checked);
                        // If needs parts is checked, needs return is implied (don't auto-check it)
                        if (e.target.checked) {
                          setNeedsReturn(false);
                        }
                      }}
                      disabled={submitting}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        marginTop: '2px'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem'
                      }}>
                        <Package size={18} color={needsParts ? '#F59E0B' : '#6B7280'} />
                        <span style={{
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: needsParts ? '#92400E' : '#374151'
                        }}>
                          Needs Parts
                        </span>
                      </div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        margin: 0
                      }}>
                        Parts must be ordered (includes return trip automatically)
                      </p>
                    </div>
                  </label>

                  {/* Needs Return Trip (NON-parts) */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    padding: '0.75rem',
                    backgroundColor: needsReturn ? '#EDE9FE' : 'white',
                    borderRadius: '0.5rem',
                    border: needsReturn ? '2px solid #8B5CF6' : '1px solid #E5E7EB',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="checkbox"
                      checked={needsReturn}
                      onChange={(e) => {
                        setNeedsReturn(e.target.checked);
                        // If needs return is checked, uncheck needs parts
                        if (e.target.checked) {
                          setNeedsParts(false);
                        }
                      }}
                      disabled={submitting || needsParts}
                      style={{
                        width: '18px',
                        height: '18px',
                        cursor: (submitting || needsParts) ? 'not-allowed' : 'pointer',
                        marginTop: '2px'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem'
                      }}>
                        <RotateCcw size={18} color={needsReturn ? '#8B5CF6' : '#6B7280'} />
                        <span style={{
                          fontSize: '0.9375rem',
                          fontWeight: '600',
                          color: needsReturn ? '#5B21B6' : '#374151'
                        }}>
                          Needs Return Trip (NON-parts)
                        </span>
                      </div>
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        margin: 0
                      }}>
                        Return visit required for reasons OTHER than parts
                      </p>
                    </div>
                  </label>
                </div>

                {/* Status Notes */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Status Notes (Optional)
                  </label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    disabled={submitting}
                    placeholder="Add any notes about this checkout..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      opacity: submitting ? 0.5 : 1
                    }}
                  />
                </div>

                {/* Queue Routing Preview */}
                <div style={{
                  padding: '1rem',
                  backgroundColor: getQueueColor() + '10',
                  border: `2px solid ${getQueueColor()}`,
                  borderRadius: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      width: '2rem',
                      height: '2rem',
                      borderRadius: '0.375rem',
                      backgroundColor: getQueueColor(),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {needsParts ? (
                        <Package size={16} color="white" />
                      ) : needsReturn ? (
                        <RotateCcw size={16} color="white" />
                      ) : (
                        <FileText size={16} color="white" />
                      )}
                    </div>
                    <div>
                      <p style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.125rem'
                      }}>
                        Routing To
                      </p>
                      <p style={{
                        fontSize: '1rem',
                        fontWeight: '700',
                        color: getQueueColor(),
                        margin: 0
                      }}>
                        {getTargetQueue()}
                      </p>
                    </div>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: '#4B5563',
                    margin: 0
                  }}>
                    {getQueueDescription()}
                  </p>
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
              justifyContent: 'flex-end'
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
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: submitting ? '#9CA3AF' : getQueueColor(),
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
                    Checking Out...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Check Out
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

export default CheckoutDialog;
