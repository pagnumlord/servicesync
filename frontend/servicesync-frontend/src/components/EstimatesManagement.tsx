import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, FileText, Send, CheckCircle, XCircle, DollarSign, Edit2, Trash2, Eye, Calendar, X } from 'lucide-react';
import { Estimate, EstimateLineItem, Customer, PricebookItem } from '../types';
import { format } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const EstimatesManagement: React.FC = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadEstimates();
  }, [statusFilter, searchTerm]);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await axios.get(`${API_BASE_URL}/api/estimates`, { params });
      setEstimates(response.data.estimates || response.data);
    } catch (error) {
      console.error('Error loading estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEstimate = async (estimateId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/estimates/${estimateId}`);
      setSelectedEstimate(response.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error loading estimate details:', error);
      alert('Error loading estimate details');
    }
  };

  const handleSendEstimate = async (estimateId: number) => {
    if (!window.confirm('Send this estimate to the customer?')) return;

    try {
      await axios.post(`${API_BASE_URL}/api/estimates/${estimateId}/send`);
      alert('Estimate sent successfully');
      loadEstimates();
      if (selectedEstimate?.id === estimateId) {
        handleViewEstimate(estimateId);
      }
    } catch (error) {
      console.error('Error sending estimate:', error);
      alert('Error sending estimate');
    }
  };

  const handleApproveEstimate = async (estimateId: number) => {
    if (!window.confirm('Mark this estimate as approved?')) return;

    try {
      await axios.post(`${API_BASE_URL}/api/estimates/${estimateId}/approve`);
      alert('Estimate approved');
      loadEstimates();
      if (selectedEstimate?.id === estimateId) {
        handleViewEstimate(estimateId);
      }
    } catch (error) {
      console.error('Error approving estimate:', error);
      alert('Error approving estimate');
    }
  };

  const handleConvertToInvoice = async (estimateId: number) => {
    if (!window.confirm('Convert this estimate to an invoice?')) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/api/estimates/${estimateId}/convert-to-invoice`);
      alert(`Estimate converted to invoice ${response.data.invoice.invoice_number}`);
      loadEstimates();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error converting estimate:', error);
      alert('Error converting estimate to invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#6B7280';
      case 'sent': return '#3B82F6';
      case 'viewed': return '#8B5CF6';
      case 'approved': return '#10B981';
      case 'rejected': return '#DC2626';
      case 'expired': return '#F59E0B';
      case 'converted': return '#059669';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={16} />;
      case 'rejected': return <XCircle size={16} />;
      case 'sent': return <Send size={16} />;
      case 'converted': return <DollarSign size={16} />;
      default: return <FileText size={16} />;
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

  const statuses = ['all', 'draft', 'sent', 'viewed', 'approved', 'rejected', 'expired', 'converted'];

  return (
    <div style={{ padding: '2rem', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>
            Estimates
          </h1>
          <p style={{ color: '#6B7280', marginTop: '0.5rem', margin: 0 }}>
            Create and manage customer estimates
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3B82F6',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          <Plus size={20} /> Create Estimate
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6' }}>
              <FileText size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total Estimates</div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1F2937' }}>{estimates.length}</div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <CheckCircle size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Approved</div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1F2937' }}>
            {estimates.filter(e => e.status === 'approved').length}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
              <Send size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Pending Review</div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1F2937' }}>
            {estimates.filter(e => ['sent', 'viewed'].includes(e.status)).length}
          </div>
        </div>

        <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '0.75rem', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <DollarSign size={24} />
            </div>
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total Value</div>
          <div style={{ fontSize: '1.875rem', fontWeight: '700', color: '#1F2937' }}>
            ${estimates.reduce((sum, e) => sum + e.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {statuses.map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: statusFilter === status ? '#3B82F6' : 'white',
                  color: statusFilter === status ? 'white' : '#6B7280',
                  border: `1px solid ${statusFilter === status ? '#3B82F6' : '#D1D5DB'}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estimates List */}
      <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
            Loading estimates...
          </div>
        ) : estimates.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
            No estimates found
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <tr>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Estimate #</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Customer</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Title</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Total</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Valid Until</th>
                <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Created</th>
                <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {estimates.map(estimate => (
                <tr
                  key={estimate.id}
                  style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                  onClick={() => handleViewEstimate(estimate.id)}
                >
                  <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', fontFamily: 'monospace' }}>
                    {estimate.estimate_number}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#1F2937' }}>
                    {estimate.customer_name}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                    {estimate.title}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      backgroundColor: getStatusColor(estimate.status) + '20',
                      color: getStatusColor(estimate.status),
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {getStatusIcon(estimate.status)}
                      {estimate.status}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                    ${estimate.total.toFixed(2)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                    {formatDate(estimate.valid_until)}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                    {formatDate(estimate.created_at)}
                  </td>
                  <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      {estimate.status === 'draft' && (
                        <button
                          onClick={() => handleSendEstimate(estimate.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Send"
                        >
                          <Send size={14} /> Send
                        </button>
                      )}
                      {['sent', 'viewed'].includes(estimate.status) && (
                        <button
                          onClick={() => handleApproveEstimate(estimate.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Approve"
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                      )}
                      {estimate.status === 'approved' && (
                        <button
                          onClick={() => handleConvertToInvoice(estimate.id)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: '#059669',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          title="Convert to Invoice"
                        >
                          <DollarSign size={14} /> Invoice
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

      {/* Detail Modal */}
      {showDetailModal && selectedEstimate && (
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
                  {selectedEstimate.estimate_number}
                </h2>
                <p style={{ color: '#6B7280', marginTop: '0.25rem', margin: 0, fontSize: '0.875rem' }}>
                  {selectedEstimate.customer_name}
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
                    backgroundColor: getStatusColor(selectedEstimate.status) + '20',
                    color: getStatusColor(selectedEstimate.status),
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textTransform: 'capitalize'
                  }}>
                    {getStatusIcon(selectedEstimate.status)}
                    {selectedEstimate.status}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Work Order</div>
                  <div style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: '500' }}>
                    {selectedEstimate.wo_number || '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Valid Until</div>
                  <div style={{ fontSize: '0.875rem', color: '#1F2937', fontWeight: '500' }}>
                    {formatDate(selectedEstimate.valid_until)}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>
                  Title
                </div>
                <div style={{ fontSize: '1rem', color: '#374151' }}>
                  {selectedEstimate.title}
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
                    {selectedEstimate.line_items?.map((item, index) => (
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

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div style={{ width: '300px', backgroundColor: '#F9FAFB', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Subtotal:</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>${selectedEstimate.subtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Tax ({(selectedEstimate.tax_rate * 100).toFixed(2)}%):</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>${selectedEstimate.tax_amount.toFixed(2)}</span>
                  </div>
                  {selectedEstimate.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>Discount:</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#DC2626' }}>-${selectedEstimate.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.5rem', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>Total:</span>
                    <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1F2937' }}>${selectedEstimate.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedEstimate.notes && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>
                    Notes
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    {selectedEstimate.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {selectedEstimate.status === 'draft' && (
                <button
                  onClick={() => handleSendEstimate(selectedEstimate.id)}
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
                  <Send size={16} /> Send Estimate
                </button>
              )}
              {['sent', 'viewed'].includes(selectedEstimate.status) && (
                <button
                  onClick={() => handleApproveEstimate(selectedEstimate.id)}
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
                  <CheckCircle size={16} /> Approve
                </button>
              )}
              {selectedEstimate.status === 'approved' && (
                <button
                  onClick={() => handleConvertToInvoice(selectedEstimate.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.625rem 1.25rem',
                    backgroundColor: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  <DollarSign size={16} /> Convert to Invoice
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal Placeholder */}
      {showCreateModal && (
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
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>Create Estimate</h3>
            <p style={{ color: '#6B7280', marginBottom: '1.5rem' }}>
              Estimate creation form will be implemented here
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              style={{
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
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstimatesManagement;
