// Queue Selection Modal Component
// File: frontend/servicesync-frontend/src/components/QueueSelectionModal.tsx

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Queue, WorkOrder, QueueSelectionModalProps } from '../types';

const QueueSelectionModal: React.FC<QueueSelectionModalProps> = ({
  isOpen,
  workOrder,
  queues,
  onClose,
  onConfirm
}) => {
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedQueue) {
      onConfirm(selectedQueue, notes);
      setSelectedQueue('');
      setNotes('');
    }
  };

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000
  };

  const contentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)'
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: 0
          }}>
            Complete Work Order
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '0.375rem',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Work Order: <strong>{workOrder.wo_number}</strong>
            </p>
            <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Customer: <strong>{workOrder.customer_name}</strong>
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Select Queue <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {queues.map((queue) => (
                <label
                  key={queue.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem',
                    border: '2px solid',
                    borderColor: selectedQueue === queue.name ? queue.color_code : '#e5e7eb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: selectedQueue === queue.name ? `${queue.color_code}20` : 'white'
                  }}
                >
                  <input
                    type="radio"
                    name="queue"
                    value={queue.name}
                    checked={selectedQueue === queue.name}
                    onChange={(e) => setSelectedQueue(e.target.value)}
                    style={{ marginRight: '0.75rem' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {queue.name}
                    </div>
                    {queue.description && (
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        {queue.description}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      width: '1rem',
                      height: '1rem',
                      backgroundColor: queue.color_code,
                      borderRadius: '0.25rem'
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Completion Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the completed work..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '1.5rem',
          borderTop: '1px solid #e5e7eb',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedQueue}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.375rem',
              backgroundColor: selectedQueue ? '#3b82f6' : '#e5e7eb',
              color: selectedQueue ? 'white' : '#9ca3af',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: selectedQueue ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedQueue) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (selectedQueue) e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Complete Work Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueueSelectionModal;