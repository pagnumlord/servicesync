// ============================================================
// AddNoteModal.tsx - Add/Edit Note Modal for Customer Pages
// File: frontend/servicesync-frontend/src/components/AddNoteModal.tsx
// 
// Features:
// - Unlimited text (no 500 char limit!)
// - Note type selection (General, Scheduling, Billing, Warning, Internal)
// - Pin to header option
// - Character count display
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  StickyNote,
  Pin,
  AlertTriangle,
  Calendar,
  DollarSign,
  MessageSquare,
  Lock,
  Save,
  Loader
} from 'lucide-react';
import { CustomerNote } from '../types';
import { getAuthHeaders } from '../contexts/AuthContext';

interface AddNoteModalProps {
  isOpen: boolean;
  customerId: number;
  customerName: string;
  existingNote?: CustomerNote; // For editing existing notes
  onClose: () => void;
  onSave: (note: CustomerNote) => void;
}

type NoteType = 'general' | 'scheduling' | 'billing' | 'warning' | 'internal';

interface NoteTypeOption {
  value: NoteType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}

const NOTE_TYPES: NoteTypeOption[] = [
  {
    value: 'general',
    label: 'General',
    icon: <MessageSquare size={16} />,
    color: '#374151',
    bgColor: '#f3f4f6',
    description: 'General information about the customer'
  },
  {
    value: 'scheduling',
    label: 'Scheduling',
    icon: <Calendar size={16} />,
    color: '#2563eb',
    bgColor: '#dbeafe',
    description: 'Scheduling preferences, hours, contact times'
  },
  {
    value: 'billing',
    label: 'Billing',
    icon: <DollarSign size={16} />,
    color: '#059669',
    bgColor: '#d1fae5',
    description: 'Payment terms, billing instructions'
  },
  {
    value: 'warning',
    label: 'Warning',
    icon: <AlertTriangle size={16} />,
    color: '#dc2626',
    bgColor: '#fee2e2',
    description: 'Important alerts, issues to be aware of'
  },
  {
    value: 'internal',
    label: 'Internal',
    icon: <Lock size={16} />,
    color: '#7c3aed',
    bgColor: '#ede9fe',
    description: 'Internal notes not for customer view'
  }
];

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddNoteModal: React.FC<AddNoteModalProps> = ({
  isOpen,
  customerId,
  customerName,
  existingNote,
  onClose,
  onSave
}) => {
  // State
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('general');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize form when editing existing note
  useEffect(() => {
    if (existingNote) {
      setNoteText(existingNote.note_text);
      setNoteType(existingNote.note_type as NoteType);
      setIsPinned(existingNote.is_pinned);
    } else {
      setNoteText('');
      setNoteType('general');
      setIsPinned(false);
    }
    setError(null);
  }, [existingNote, isOpen]);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle save
  const handleSave = async () => {
    if (!noteText.trim()) {
      setError('Please enter a note');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = existingNote
        ? `${API_BASE}/customers/${customerId}/notes/${existingNote.id}`
        : `${API_BASE}/customers/${customerId}/notes`;
      
      const method = existingNote ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          note_text: noteText.trim(),
          note_type: noteType,
          is_pinned: isPinned
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save note');
      }

      const savedNote = await response.json();
      onSave(savedNote);
      onClose();
    } catch (err: any) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    // Escape to close
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedType = NOTE_TYPES.find(t => t.value === noteType) || NOTE_TYPES[0];

  return (
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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              backgroundColor: '#dbeafe',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <StickyNote size={20} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#111827'
              }}>
                {existingNote ? 'Edit Note' : 'Add Note'}
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: '0.8125rem', 
                color: '#6b7280' 
              }}>
                {customerName}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ 
          padding: '1.5rem',
          flex: 1,
          overflow: 'auto'
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: '#991b1b',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {/* Note Type Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Note Type
            </label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {NOTE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setNoteType(type.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: noteType === type.value 
                      ? `2px solid ${type.color}` 
                      : '1px solid #d1d5db',
                    backgroundColor: noteType === type.value ? type.bgColor : 'white',
                    color: noteType === type.value ? type.color : '#6b7280',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: noteType === type.value ? '600' : '500',
                    transition: 'all 0.15s ease'
                  }}
                  title={type.description}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginTop: '0.375rem'
            }}>
              {selectedType.description}
            </p>
          </div>

          {/* Note Text */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.8125rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Note
            </label>
            <textarea
              ref={textareaRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note here... No character limit!"
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.9375rem',
                lineHeight: '1.5',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.375rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Press Ctrl+Enter to save
              </span>
              <span style={{ 
                fontSize: '0.75rem', 
                color: noteText.length > 500 ? '#059669' : '#9ca3af'
              }}>
                {noteText.length} characters
                {noteText.length > 500 && (
                  <span style={{ color: '#059669', marginLeft: '0.25rem' }}>
                    ✓ No limit!
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Pin Option */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            padding: '1rem',
            backgroundColor: isPinned ? '#fffbeb' : '#f9fafb',
            borderRadius: '0.5rem',
            border: isPinned ? '1px solid #fcd34d' : '1px solid #e5e7eb',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onClick={() => setIsPinned(!isPinned)}
          >
            <div style={{
              marginTop: '0.125rem'
            }}>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                style={{
                  width: '1rem',
                  height: '1rem',
                  cursor: 'pointer'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontWeight: '600',
                fontSize: '0.875rem',
                color: isPinned ? '#92400e' : '#374151'
              }}>
                <Pin size={14} color={isPinned ? '#f59e0b' : '#9ca3af'} />
                Pin to Customer Header
              </div>
              <p style={{
                margin: '0.25rem 0 0 0',
                fontSize: '0.8125rem',
                color: '#6b7280'
              }}>
                Pinned notes appear in the customer header for quick visibility. 
                Use for important info like "Call before visiting" or scheduling preferences.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          borderRadius: '0 0 0.75rem 0.75rem'
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !noteText.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.5rem',
              backgroundColor: saving || !noteText.trim() ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: saving || !noteText.trim() ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? (
              <>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {existingNote ? 'Update Note' : 'Save Note'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* CSS for spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AddNoteModal;
