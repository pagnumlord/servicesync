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
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../utils/constants';

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
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

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
