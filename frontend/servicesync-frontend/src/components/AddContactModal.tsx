// ============================================================
// AddContactModal.tsx - Add/Edit Contact Modal for Customer Pages
// File: frontend/servicesync-frontend/src/components/AddContactModal.tsx
// 
// Features:
// - Contact type selection (Primary, Billing, Site, Emergency, General)
// - Multiple phone numbers with type indicators
// - Email
// - Set as primary contact option
// - Notification preferences (receives invoices, WO updates)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User,
  Phone,
  Mail,
  Building,
  AlertTriangle,
  Shield,
  Users,
  Save,
  Loader,
  Star,
  Bell,
  FileText
} from 'lucide-react';
import { CustomerContact } from '../types';

interface AddContactModalProps {
  isOpen: boolean;
  customerId: number;
  customerName: string;
  existingContact?: CustomerContact; // For editing existing contacts
  onClose: () => void;
  onSave: (contact: CustomerContact) => void;
}

type ContactType = 'primary' | 'billing' | 'site' | 'emergency' | 'general';
type PhoneType = 'mobile' | 'office' | 'home' | 'fax';

interface ContactTypeOption {
  value: ContactType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}

const CONTACT_TYPES: ContactTypeOption[] = [
  {
    value: 'primary',
    label: 'Primary',
    icon: <Star size={16} />,
    color: '#2563eb',
    bgColor: '#dbeafe',
    description: 'Main point of contact for this customer'
  },
  {
    value: 'billing',
    label: 'Billing',
    icon: <FileText size={16} />,
    color: '#059669',
    bgColor: '#d1fae5',
    description: 'Contact for invoices and payment issues'
  },
  {
    value: 'site',
    label: 'Site Contact',
    icon: <Building size={16} />,
    color: '#7c3aed',
    bgColor: '#ede9fe',
    description: 'On-site contact for service visits'
  },
  {
    value: 'emergency',
    label: 'Emergency',
    icon: <Shield size={16} />,
    color: '#dc2626',
    bgColor: '#fee2e2',
    description: 'After-hours or emergency contact'
  },
  {
    value: 'general',
    label: 'General',
    icon: <Users size={16} />,
    color: '#6b7280',
    bgColor: '#f3f4f6',
    description: 'Additional contact'
  }
];

const PHONE_TYPES: { value: PhoneType; label: string }[] = [
  { value: 'mobile', label: 'Mobile' },
  { value: 'office', label: 'Office' },
  { value: 'home', label: 'Home' },
  { value: 'fax', label: 'Fax' }
];

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AddContactModal: React.FC<AddContactModalProps> = ({
  isOpen,
  customerId,
  customerName,
  existingContact,
  onClose,
  onSave
}) => {
  // Form state
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [contactType, setContactType] = useState<ContactType>('general');
  const [phone, setPhone] = useState('');
  const [phoneType, setPhoneType] = useState<PhoneType>('office');
  const [phone2, setPhone2] = useState('');
  const [phone2Type, setPhone2Type] = useState<PhoneType>('mobile');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [receivesInvoices, setReceivesInvoices] = useState(false);
  const [receivesWoUpdates, setReceivesWoUpdates] = useState(false);
  const [notes, setNotes] = useState('');
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecondPhone, setShowSecondPhone] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when editing existing contact
  useEffect(() => {
    if (existingContact) {
      setName(existingContact.name || '');
      setTitle(existingContact.title || '');
      setContactType((existingContact.contact_type as ContactType) || 'general');
      setPhone(existingContact.phone || '');
      setPhoneType((existingContact.phone_type as PhoneType) || 'office');
      setPhone2(existingContact.phone_2 || '');
      setPhone2Type((existingContact.phone_2_type as PhoneType) || 'mobile');
      setEmail(existingContact.email || '');
      setIsPrimary(existingContact.is_primary || false);
      setReceivesInvoices(existingContact.receives_invoices || false);
      setReceivesWoUpdates(existingContact.receives_wo_updates || false);
      setNotes(existingContact.notes || '');
      setShowSecondPhone(!!existingContact.phone_2);
    } else {
      // Reset form for new contact
      setName('');
      setTitle('');
      setContactType('general');
      setPhone('');
      setPhoneType('office');
      setPhone2('');
      setPhone2Type('mobile');
      setEmail('');
      setIsPrimary(false);
      setReceivesInvoices(false);
      setReceivesWoUpdates(false);
      setNotes('');
      setShowSecondPhone(false);
    }
    setError(null);
  }, [existingContact, isOpen]);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  // Handle save
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Contact name is required');
      return;
    }

    if (!phone.trim() && !email.trim()) {
      setError('Please provide at least a phone number or email');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = existingContact
        ? `${API_BASE}/customers/${customerId}/contacts/${existingContact.id}`
        : `${API_BASE}/customers/${customerId}/contacts`;
      
      const method = existingContact ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          title: title.trim() || null,
          contact_type: contactType,
          phone: phone.replace(/\D/g, '') || null, // Store raw digits
          phone_type: phoneType,
          phone_2: phone2.replace(/\D/g, '') || null,
          phone_2_type: phone2Type,
          email: email.trim() || null,
          is_primary: isPrimary,
          receives_invoices: receivesInvoices,
          receives_wo_updates: receivesWoUpdates,
          notes: notes.trim() || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save contact');
      }

      const savedContact = await response.json();
      onSave(savedContact);
      onClose();
    } catch (err: any) {
      console.error('Error saving contact:', err);
      setError(err.message || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedType = CONTACT_TYPES.find(t => t.value === contactType) || CONTACT_TYPES[4];

  // Input style helper
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    transition: 'border-color 0.15s ease'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.375rem'
  };

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
          maxWidth: '550px',
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
              <User size={20} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.125rem', 
                fontWeight: '600',
                color: '#111827'
              }}>
                {existingContact ? 'Edit Contact' : 'Add Contact'}
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
              color: '#6b7280'
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

          {/* Contact Type Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Contact Type</label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              {CONTACT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setContactType(type.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: contactType === type.value 
                      ? `2px solid ${type.color}` 
                      : '1px solid #d1d5db',
                    backgroundColor: contactType === type.value ? type.bgColor : 'white',
                    color: contactType === type.value ? type.color : '#6b7280',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: contactType === type.value ? '600' : '500',
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

          {/* Name and Title Row */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={labelStyle}>Name *</label>
              <input
                ref={nameInputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Store Manager"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Primary Phone */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Phone</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="(765) 555-1234"
                style={{ ...inputStyle, flex: 1 }}
              />
              <select
                value={phoneType}
                onChange={(e) => setPhoneType(e.target.value as PhoneType)}
                style={{
                  padding: '0.625rem 0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white',
                  minWidth: '100px'
                }}
              >
                {PHONE_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>{pt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Secondary Phone (collapsible) */}
          {!showSecondPhone ? (
            <button
              type="button"
              onClick={() => setShowSecondPhone(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                padding: 0,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              <Phone size={14} />
              + Add second phone
            </button>
          ) : (
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Second Phone</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="tel"
                  value={phone2}
                  onChange={(e) => setPhone2(formatPhoneNumber(e.target.value))}
                  placeholder="(765) 555-5678"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={phone2Type}
                  onChange={(e) => setPhone2Type(e.target.value as PhoneType)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    minWidth: '100px'
                  }}
                >
                  {PHONE_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.smith@example.com"
              style={inputStyle}
            />
          </div>

          {/* Notification Preferences */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            marginBottom: '1.25rem'
          }}>
            <div style={{ 
              fontSize: '0.8125rem', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}>
              <Bell size={14} />
              Notifications
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Star size={14} color={isPrimary ? '#f59e0b' : '#9ca3af'} />
                Set as primary contact
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={receivesInvoices}
                  onChange={(e) => setReceivesInvoices(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <FileText size={14} color={receivesInvoices ? '#059669' : '#9ca3af'} />
                Receives invoices
              </label>
              
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: '#374151',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={receivesWoUpdates}
                  onChange={(e) => setReceivesWoUpdates(e.target.checked)}
                  style={{ margin: 0 }}
                />
                <Bell size={14} color={receivesWoUpdates ? '#2563eb' : '#9ca3af'} />
                Receives work order updates
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes about this contact</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional info about this contact..."
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
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
            disabled={saving || !name.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.625rem 1.5rem',
              backgroundColor: saving || !name.trim() ? '#9ca3af' : '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: saving || !name.trim() ? 'not-allowed' : 'pointer'
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
                {existingContact ? 'Update Contact' : 'Save Contact'}
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

export default AddContactModal;
