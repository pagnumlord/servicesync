// Invoices.tsx - Invoice management with QuickBooks integration
import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Calendar,
  User,
  Plus,
  Download,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  CreditCard
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';
import { Invoice as InvoiceType, InvoiceLineItem, InvoicePayment } from '../types';
import { format } from 'date-fns';
import axios from 'axios';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  work_order_id?: number;
  wo_number?: string;
  invoice_date: string;
  due_date: string;
  status: 'Draft' | 'Pending' | 'Sent' | 'Paid' | 'Partial' | 'Overdue' | 'Void' | 'Cancelled';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  quickbooks_id?: string;
  sync_status: string;
}

const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceType | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'check' as 'check' | 'cash' | 'credit_card' | 'ach' | 'online' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const url = filterStatus === 'all'
        ? `${API_BASE_URL}/invoices`
        : `${API_BASE_URL}/invoices?status=${filterStatus}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return '#10B981';
      case 'Sent': return '#3B82F6';
      case 'Partial': return '#F59E0B';
      case 'Overdue': return '#DC2626';
      case 'Draft': return '#6B7280';
      case 'Void':
      case 'Cancelled': return '#9CA3AF';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle size={16} />;
      case 'Overdue': return <AlertCircle size={16} />;
      case 'Void':
      case 'Cancelled': return <XCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const handleQuickBooksExport = async (invoiceId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/invoices/${invoiceId}/quickbooks-export`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      alert(data.message + '\n\n' + data.note);
      fetchInvoices();
    } catch (error) {
      console.error('Error exporting to QuickBooks:', error);
      alert('Failed to export to QuickBooks');
    }
  };

  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/invoices/${invoiceId}`);
      setSelectedInvoice(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      alert('Error loading invoice details');
    }
  };

  const handleSendInvoice = async (invoiceId: number) => {
    if (!window.confirm('Send this invoice to the customer?')) return;

    try {
      await axios.post(`${API_BASE_URL}/api/invoices/${invoiceId}/send`);
      alert('Invoice sent successfully');
      fetchInvoices();
      if (selectedInvoice?.id === invoiceId) {
        handleViewInvoice(invoiceId);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Error sending invoice');
    }
  };

  const handleOpenPaymentModal = (invoice: InvoiceType) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balance_due,
      payment_method: 'check',
      payment_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedInvoice) return;

    try {
      await axios.post(`${API_BASE_URL}/api/invoices/${selectedInvoice.id}/payments`, paymentForm);
      alert('Payment recorded successfully');
      setShowPaymentModal(false);
      fetchInvoices();
      if (showDetailModal) {
        handleViewInvoice(selectedInvoice.id);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: 0
          }}>
            Invoices
          </h1>
          <p style={{
            color: '#6B7280',
            marginTop: '0.5rem'
          }}>
            Manage invoices and QuickBooks integration
          </p>
        </div>

        <button
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #E5E7EB',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap'
      }}>
        {['all', 'Draft', 'Sent', 'Paid', 'Partial', 'Overdue'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: filterStatus === status ? '#3B82F6' : 'white',
              color: filterStatus === status ? 'white' : '#6B7280',
              border: '1px solid #E5E7EB',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            {status === 'all' ? 'All Invoices' : status}
          </button>
        ))}
      </div>

      {/* Invoices Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #E5E7EB',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>No invoices found</p>
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#F9FAFB',
                borderBottom: '1px solid #E5E7EB'
              }}>
                <th style={headerCellStyle}>Invoice #</th>
                <th style={headerCellStyle}>Customer</th>
                <th style={headerCellStyle}>Work Order</th>
                <th style={headerCellStyle}>Date</th>
                <th style={headerCellStyle}>Due Date</th>
                <th style={headerCellStyle}>Amount</th>
                <th style={headerCellStyle}>Balance</th>
                <th style={headerCellStyle}>Status</th>
                <th style={headerCellStyle}>QuickBooks</th>
                <th style={headerCellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => (
                <tr
                  key={invoice.id}
                  style={{
                    borderBottom: '1px solid #E5E7EB',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <td style={cellStyle}>
                    <div style={{
                      fontWeight: '600',
                      color: '#1F2937'
                    }}>
                      {invoice.invoice_number}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <User size={16} style={{ color: '#6B7280' }} />
                      {invoice.customer_name}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    {invoice.wo_number || '-'}
                  </td>
                  <td style={cellStyle}>
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                  <td style={cellStyle}>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      fontWeight: '600',
                      color: '#1F2937'
                    }}>
                      ${parseFloat(invoice.total_amount.toString()).toFixed(2)}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      fontWeight: '600',
                      color: invoice.balance_due > 0 ? '#DC2626' : '#10B981'
                    }}>
                      ${parseFloat(invoice.balance_due.toString()).toFixed(2)}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      backgroundColor: getStatusColor(invoice.status) + '20',
                      color: getStatusColor(invoice.status),
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      fontSize: '0.75rem',
                      color: invoice.quickbooks_id ? '#10B981' : '#6B7280'
                    }}>
                      {invoice.quickbooks_id ? 'Synced' : invoice.sync_status}
                    </div>
                  </td>
                  <td style={cellStyle}>
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem'
                    }}>
                      <button
                        onClick={() => handleViewInvoice(invoice.id)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: '#3B82F6',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="View Invoice"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleQuickBooksExport(invoice.id)}
                        style={{
                          padding: '0.5rem',
                          backgroundColor: 'transparent',
                          color: '#10B981',
                          border: 'none',
                          borderRadius: '0.375rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Export to QuickBooks"
                      >
                        <Download size={16} />
                      </button>
                      {invoice.status === 'Draft' && (
                        <button
                          style={{
                            padding: '0.5rem',
                            backgroundColor: 'transparent',
                            color: '#F59E0B',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Send Invoice"
                        >
                          <Send size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        marginTop: '1.5rem'
      }}>
        <SummaryCard
          title="Total Outstanding"
          value={`$${invoices.reduce((sum, inv) => sum + parseFloat(inv.balance_due.toString()), 0).toFixed(2)}`}
          icon={<DollarSign size={24} />}
          color="#DC2626"
        />
        <SummaryCard
          title="Paid This Month"
          value={`$${invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + parseFloat(inv.total_amount.toString()), 0).toFixed(2)}`}
          icon={<CheckCircle size={24} />}
          color="#10B981"
        />
        <SummaryCard
          title="Overdue Invoices"
          value={invoices.filter(inv => inv.status === 'Overdue').length.toString()}
          icon={<AlertCircle size={24} />}
          color="#F59E0B"
        />
        <SummaryCard
          title="QuickBooks Synced"
          value={`${invoices.filter(inv => inv.quickbooks_id).length} / ${invoices.length}`}
          icon={<FileText size={24} />}
          color="#3B82F6"
        />
      </div>

      {/* Invoice Detail Modal */}
      {showDetailModal && selectedInvoice && (
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                  {selectedInvoice.invoice_number}
                </h2>
                <p style={{ color: '#6B7280', marginTop: '0.25rem', margin: 0, fontSize: '0.875rem' }}>
                  {selectedInvoice.customer_name}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Status</div>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.375rem',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: getStatusColor(selectedInvoice.status || 'draft') + '20',
                    color: getStatusColor(selectedInvoice.status || 'draft'),
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {getStatusIcon(selectedInvoice.status || 'draft')}
                    {selectedInvoice.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Issue Date</div>
                  <div style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: '500' }}>
                    {formatDate(selectedInvoice.issue_date)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Due Date</div>
                  <div style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: '500' }}>
                    {formatDate(selectedInvoice.due_date)}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.75rem' }}>
                  Line Items
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #E5E7EB', borderRadius: '0.5rem' }}>
                  <thead style={{ backgroundColor: '#F9FAFB' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Qty</th>
                      <th style={{ textAlign: 'center', padding: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>UoM</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Unit Price</th>
                      <th style={{ textAlign: 'right', padding: '0.75rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.line_items?.map((item, index) => (
                      <tr key={item.id} style={{ borderTop: index > 0 ? '1px solid #F3F4F6' : 'none' }}>
                        <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#1F2937' }}>{item.description}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>{item.quantity}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#6B7280' }}>{item.unit_of_measure}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#6B7280' }}>${item.unit_price.toFixed(2)}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>${item.line_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals and Payment History */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Payment History */}
                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.75rem' }}>
                      Payment History
                    </div>
                    <div style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem' }}>
                      {selectedInvoice.payments.map((payment, index) => (
                        <div key={payment.id} style={{
                          borderBottom: index < selectedInvoice.payments!.length - 1 ? '1px solid #F3F4F6' : 'none',
                          paddingBottom: index < selectedInvoice.payments!.length - 1 ? '0.75rem' : 0,
                          marginBottom: index < selectedInvoice.payments!.length - 1 ? '0.75rem' : 0
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: '600' }}>
                              ${payment.amount.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                              {formatDate(payment.payment_date)}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>
                            {payment.payment_method.replace('_', ' ')}
                            {payment.reference_number && ` - ${payment.reference_number}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.75rem' }}>
                    Summary
                  </div>
                  <div style={{ backgroundColor: '#F9FAFB', borderRadius: '0.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Subtotal:</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>${selectedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Tax ({(selectedInvoice.tax_rate * 100).toFixed(2)}%):</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>${selectedInvoice.tax_amount.toFixed(2)}</span>
                    </div>
                    {selectedInvoice.discount_amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Discount:</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#DC2626' }}>-${selectedInvoice.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>Total:</span>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>${selectedInvoice.total.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Amount Paid:</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#10B981' }}>${selectedInvoice.amount_paid.toFixed(2)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>Balance Due:</span>
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: selectedInvoice.balance_due > 0 ? '#DC2626' : '#10B981' }}>
                        ${selectedInvoice.balance_due.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div style={{ padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>
                    Notes
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    {selectedInvoice.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {selectedInvoice.status === 'draft' && (
                <button
                  onClick={() => handleSendInvoice(selectedInvoice.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={16} /> Send Invoice
                </button>
              )}
              {selectedInvoice.balance_due > 0 && selectedInvoice.status !== 'void' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleOpenPaymentModal(selectedInvoice);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <CreditCard size={16} /> Record Payment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
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
          zIndex: 1001,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            width: '100%',
            maxWidth: '500px'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                Record Payment
              </h2>
              <p style={{ color: '#6B7280', marginTop: '0.25rem', margin: 0, fontSize: '0.875rem' }}>
                {selectedInvoice.invoice_number} - Balance Due: ${selectedInvoice.balance_due.toFixed(2)}
              </p>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Payment Amount */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Payment Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Payment Method */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Payment Method *
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="ach">ACH</option>
                  <option value="online">Online</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>

              {/* Reference Number */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Reference Number
                </label>
                <input
                  type="text"
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="Check #, transaction ID, etc."
                />
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Notes
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Optional payment notes"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: 'white',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                style={{
                  padding: '0.625rem 1.25rem',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div style={{
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    border: '1px solid #E5E7EB',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  }}>
    <div style={{
      backgroundColor: color + '20',
      color: color,
      padding: '0.75rem',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center'
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontSize: '0.875rem',
        color: '#6B7280',
        marginBottom: '0.25rem'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1F2937'
      }}>
        {value}
      </div>
    </div>
  </div>
);

const headerCellStyle: React.CSSProperties = {
  padding: '1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const cellStyle: React.CSSProperties = {
  padding: '1rem',
  fontSize: '0.875rem',
  color: '#374151'
};

export default Invoices;
