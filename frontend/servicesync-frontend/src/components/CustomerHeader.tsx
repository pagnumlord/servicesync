// ============================================================
// CustomerHeader.tsx - Vision-style 4-column customer header
// File: frontend/servicesync-frontend/src/components/CustomerHeader.tsx
// 
// Displays: Service Location | Billing | Primary Contact | Pinned Notes
// ============================================================

import React, { useState } from 'react';
import { 
  MapPin, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  StickyNote,
  Edit2,
  Plus,
  Building,
  DollarSign,
  Pin,
  ChevronRight
} from 'lucide-react';
import { Customer, CustomerContact, CustomerNote } from '../types';

interface CustomerHeaderProps {
  customer: Customer;
  contacts?: CustomerContact[];
  pinnedNotes?: CustomerNote[];
  onEditCustomer?: () => void;
  onAddNote?: () => void;
  onEditContact?: (contact: CustomerContact) => void;
  onCreateWorkOrder?: () => void;
  onViewAllNotes?: () => void;
}

// Helper to format phone numbers
const formatPhone = (phone?: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Helper to format currency
const formatCurrency = (amount?: number): string => {
  if (amount === undefined || amount === null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Zone color mapping (matching Vision)
const getZoneColor = (zone?: string): string => {
  const colors: Record<string, string> = {
    'A': '#ef4444', // Red
    'B': '#f97316', // Orange  
    'C': '#eab308', // Yellow
    'D': '#22c55e', // Green
    'E': '#3b82f6', // Blue
    'F': '#a855f7'  // Purple
  };
  return colors[zone || ''] || '#6b7280';
};

const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  customer,
  contacts = [],
  pinnedNotes = [],
  onEditCustomer,
  onAddNote,
  onEditContact,
  onCreateWorkOrder,
  onViewAllNotes
}) => {
  // Find primary contact from contacts array, fallback to legacy fields
  const primaryContact = contacts.find(c => c.is_primary) || contacts.find(c => c.contact_type === 'primary');
  const billingContact = contacts.find(c => c.contact_type === 'billing');
  
  // Determine if billing is same as service
  const billingSameAsService = customer.billing_same_as_service !== false && (
    !customer.billing_address_line1 || 
    customer.billing_address_line1 === customer.service_address_line1
  );

  // Card style
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column'
  };

  const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid #f3f4f6',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginBottom: '0.125rem'
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '0.875rem',
    color: '#1f2937',
    fontWeight: '500'
  };

  const smallValueStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    color: '#374151'
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>
      {/* ============================================================ */}
      {/* COLUMN 1: Service Location */}
      {/* ============================================================ */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <MapPin size={14} />
          SERVICE LOCATION
        </div>
        
        <div style={{ flex: 1 }}>
          {/* Customer Name */}
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ ...valueStyle, fontSize: '1rem', fontWeight: '600' }}>
              {customer.name}
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: '0.75rem' }}>
            {customer.service_address_line1 && (
              <div style={smallValueStyle}>{customer.service_address_line1}</div>
            )}
            {customer.service_address_line2 && (
              <div style={smallValueStyle}>{customer.service_address_line2}</div>
            )}
            <div style={smallValueStyle}>
              {[customer.service_city, customer.service_state, customer.service_zip]
                .filter(Boolean)
                .join(', ')}
            </div>
          </div>

          {/* Invoice Delivery Method */}
          {customer.invoice_delivery_method && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280',
              backgroundColor: '#f3f4f6',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              display: 'inline-block',
              marginBottom: '0.5rem',
              textTransform: 'uppercase'
            }}>
              {customer.invoice_delivery_method === 'email' ? '📧 EMAIL INVOICES' : '📬 MAIL INVOICES'}
            </div>
          )}
        </div>

        {/* Footer: Customer# and Zone */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.5rem',
          borderTop: '1px solid #f3f4f6',
          marginTop: 'auto'
        }}>
          <div>
            <span style={labelStyle}>Customer# </span>
            <span style={{ ...valueStyle, fontSize: '0.8125rem' }}>
              {customer.customer_number || customer.id}
            </span>
          </div>
          {customer.zone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: getZoneColor(customer.zone)
              }} />
              <span style={{ fontSize: '0.8125rem', fontWeight: '500' }}>
                Zone {customer.zone}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* COLUMN 2: Billing */}
      {/* ============================================================ */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <FileText size={14} />
          BILLING
        </div>

        <div style={{ flex: 1 }}>
          {billingSameAsService ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              color: '#6b7280',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              marginBottom: '0.75rem'
            }}>
              <Building size={14} />
              Same as Service Location
            </div>
          ) : (
            <>
              {/* Billing Name (if different) */}
              {customer.name && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={valueStyle}>{customer.name}</div>
                </div>
              )}

              {/* Billing Address */}
              <div style={{ marginBottom: '0.75rem' }}>
                {customer.billing_address_line1 && (
                  <div style={smallValueStyle}>{customer.billing_address_line1}</div>
                )}
                {customer.billing_address_line2 && (
                  <div style={smallValueStyle}>{customer.billing_address_line2}</div>
                )}
                <div style={smallValueStyle}>
                  {[customer.billing_city, customer.billing_state, customer.billing_zip]
                    .filter(Boolean)
                    .join(', ')}
                </div>
              </div>
            </>
          )}

          {/* Payment Terms */}
          {customer.billing_preferences?.payment_terms && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={labelStyle}>Pay Terms</div>
              <div style={smallValueStyle}>{customer.billing_preferences.payment_terms}</div>
            </div>
          )}

          {/* Credit Limit */}
          {customer.credit_limit !== undefined && customer.credit_limit !== null && (
            <div style={{ marginBottom: '0.5rem' }}>
              <div style={labelStyle}>Credit Limit</div>
              <div style={smallValueStyle}>{formatCurrency(customer.credit_limit)}</div>
            </div>
          )}
        </div>

        {/* Footer: Balance Due */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '0.5rem',
          borderTop: '1px solid #f3f4f6',
          marginTop: 'auto'
        }}>
          <div>
            <span style={labelStyle}>Balance Due: </span>
            <span style={{ 
              ...valueStyle, 
              fontSize: '0.875rem',
              color: (customer.balance_due || 0) > 0 ? '#dc2626' : '#059669'
            }}>
              {formatCurrency(customer.balance_due)}
            </span>
          </div>
          {(customer.balance_due || 0) > 0 && (
            <button
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fcd34d',
                borderRadius: '0.25rem',
                padding: '0.25rem 0.5rem',
                fontSize: '0.6875rem',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Age
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* COLUMN 3: Primary Contact */}
      {/* ============================================================ */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <User size={14} />
          PRIMARY CONTACT
          {onEditContact && primaryContact && (
            <button
              onClick={() => onEditContact(primaryContact)}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '0.125rem'
              }}
              title="Edit Contact"
            >
              <Edit2 size={12} />
            </button>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {primaryContact || customer.primary_contact_name ? (
            <>
              {/* Contact Name */}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={valueStyle}>
                  {primaryContact?.name || customer.primary_contact_name}
                </div>
                {primaryContact?.title && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    {primaryContact.title}
                  </div>
                )}
              </div>

              {/* Phone */}
              {(primaryContact?.phone || customer.primary_contact_phone) && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Phone size={14} color="#6b7280" />
                  <a 
                    href={`tel:${primaryContact?.phone || customer.primary_contact_phone}`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}
                  >
                    {formatPhone(primaryContact?.phone || customer.primary_contact_phone)}
                  </a>
                  {primaryContact?.phone_type === 'mobile' && (
                    <span style={{
                      backgroundColor: '#dbeafe',
                      color: '#1d4ed8',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.625rem',
                      fontWeight: '600'
                    }}>
                      MOBILE
                    </span>
                  )}
                </div>
              )}

              {/* Secondary Phone */}
              {primaryContact?.phone_2 && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Phone size={14} color="#6b7280" />
                  <a 
                    href={`tel:${primaryContact.phone_2}`}
                    style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem' }}
                  >
                    {formatPhone(primaryContact.phone_2)}
                  </a>
                  {primaryContact.phone_2_type && (
                    <span style={{
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      padding: '0.125rem 0.375rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.625rem',
                      fontWeight: '500'
                    }}>
                      {primaryContact.phone_2_type.toUpperCase()}
                    </span>
                  )}
                </div>
              )}

              {/* Email */}
              {(primaryContact?.email || customer.primary_contact_email) && (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <Mail size={14} color="#6b7280" />
                  <a 
                    href={`mailto:${primaryContact?.email || customer.primary_contact_email}`}
                    style={{ 
                      color: '#2563eb', 
                      textDecoration: 'none', 
                      fontSize: '0.8125rem',
                      wordBreak: 'break-all'
                    }}
                  >
                    {primaryContact?.email || customer.primary_contact_email}
                  </a>
                </div>
              )}
            </>
          ) : (
            <div style={{ 
              color: '#9ca3af', 
              fontSize: '0.875rem',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <User size={16} />
              No primary contact set
            </div>
          )}
        </div>

        {/* Show billing contact if different */}
        {billingContact && billingContact.id !== primaryContact?.id && (
          <div style={{
            paddingTop: '0.5rem',
            borderTop: '1px solid #f3f4f6',
            marginTop: 'auto'
          }}>
            <div style={{ ...labelStyle, marginBottom: '0.25rem' }}>Billing Contact</div>
            <div style={{ fontSize: '0.8125rem', color: '#374151' }}>
              {billingContact.name}
              {billingContact.phone && ` • ${formatPhone(billingContact.phone)}`}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* COLUMN 4: Pinned Notes */}
      {/* ============================================================ */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <StickyNote size={14} />
          CUSTOMER NOTES
          {onAddNote && (
            <button
              onClick={onAddNote}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#2563eb',
                padding: '0.125rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.6875rem',
                fontWeight: '500'
              }}
              title="Add Note"
            >
              <Plus size={12} />
              Add
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {pinnedNotes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pinnedNotes.slice(0, 3).map((note) => (
                <div
                  key={note.id}
                  style={{
                    backgroundColor: note.note_type === 'warning' ? '#fef3c7' : '#f8fafc',
                    border: `1px solid ${note.note_type === 'warning' ? '#fcd34d' : '#e2e8f0'}`,
                    borderRadius: '0.375rem',
                    padding: '0.5rem',
                    fontSize: '0.8125rem'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '0.375rem'
                  }}>
                    <Pin size={12} color="#f59e0b" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        color: '#374151',
                        lineHeight: '1.4',
                        wordBreak: 'break-word'
                      }}>
                        {note.note_text.length > 120 
                          ? `${note.note_text.substring(0, 120)}...` 
                          : note.note_text
                        }
                      </div>
                      <div style={{ 
                        fontSize: '0.6875rem', 
                        color: '#9ca3af',
                        marginTop: '0.25rem'
                      }}>
                        {new Date(note.created_at).toLocaleDateString()} 
                        {note.created_by && ` • ${note.created_by}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : customer.notes ? (
            // Fallback to legacy notes field
            <div style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '0.375rem',
              padding: '0.5rem',
              fontSize: '0.8125rem',
              color: '#374151',
              lineHeight: '1.4'
            }}>
              {customer.notes.length > 200 
                ? `${customer.notes.substring(0, 200)}...` 
                : customer.notes
              }
            </div>
          ) : (
            <div style={{ 
              color: '#9ca3af', 
              fontSize: '0.875rem',
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <StickyNote size={16} />
              No notes yet
            </div>
          )}
        </div>

        {/* View all notes link */}
        {(pinnedNotes.length > 3 || customer.notes) && onViewAllNotes && (
          <div style={{
            paddingTop: '0.5rem',
            borderTop: '1px solid #f3f4f6',
            marginTop: 'auto'
          }}>
            <button
              onClick={onViewAllNotes}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: 0
              }}
            >
              View all notes
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerHeader;
