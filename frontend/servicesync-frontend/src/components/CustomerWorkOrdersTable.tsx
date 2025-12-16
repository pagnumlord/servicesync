// ============================================================
// CustomerWorkOrdersTable.tsx - Vision-style work order table
// File: frontend/servicesync-frontend/src/components/CustomerWorkOrdersTable.tsx
// 
// Table view matching Vision's layout:
// WO# | Entered | Status | PM? | Problem | Equipment | CSR Comments | Schedule | Technician
// ============================================================

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Filter, 
  SortAsc, 
  SortDesc,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  Wrench
} from 'lucide-react';
import { WorkOrder, Customer } from '../types';

interface CustomerWorkOrdersTableProps {
  customer: Customer;
  workOrders: WorkOrder[];
  loading?: boolean;
  onWorkOrderClick?: (workOrder: WorkOrder) => void;
  onCreateWorkOrder?: () => void;
  onRefresh?: () => void;
}

type SortField = 'wo_number' | 'created_at' | 'status' | 'scheduled_date' | 'priority';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'Open' | 'Assigned' | 'In Progress' | 'Suspended' | 'Complete' | 'Closed' | 'Cancelled';

// Status color mapping
const getStatusStyle = (status: string): { bg: string; text: string; border: string } => {
  switch (status?.toLowerCase()) {
    case 'open':
      return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    case 'assigned':
      return { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' };
    case 'in progress':
      return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };
    case 'suspended':
      return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
    case 'complete':
    case 'completed':
      return { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' };
    case 'closed':
      return { bg: '#e5e7eb', text: '#374151', border: '#9ca3af' };
    case 'cancelled':
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
    default:
      return { bg: '#f9fafb', text: '#6b7280', border: '#e5e7eb' };
  }
};

// Status icon mapping
const getStatusIcon = (status: string) => {
  const size = 14;
  switch (status?.toLowerCase()) {
    case 'open':
      return <AlertCircle size={size} />;
    case 'assigned':
      return <Clock size={size} />;
    case 'in progress':
      return <Wrench size={size} />;
    case 'suspended':
      return <PauseCircle size={size} />;
    case 'complete':
    case 'completed':
    case 'closed':
      return <CheckCircle size={size} />;
    case 'cancelled':
      return <XCircle size={size} />;
    default:
      return <FileText size={size} />;
  }
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

// Truncate text with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

const CustomerWorkOrdersTable: React.FC<CustomerWorkOrdersTableProps> = ({
  customer,
  workOrders,
  loading = false,
  onWorkOrderClick,
  onCreateWorkOrder,
  onRefresh
}) => {
  // State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  
  const itemsPerPage = 15;

  // Filter and sort work orders
  const filteredAndSortedWorkOrders = useMemo(() => {
    // Ensure workOrders is always an array
    const safeWorkOrders = Array.isArray(workOrders) ? workOrders : [];
    let filtered = [...safeWorkOrders];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wo => 
        wo.status?.toLowerCase() === statusFilter.toLowerCase()
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'wo_number':
          aVal = parseInt(a.wo_number?.replace('WO-', '') || '0');
          bVal = parseInt(b.wo_number?.replace('WO-', '') || '0');
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        case 'scheduled_date':
          aVal = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
          bVal = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'priority':
          const priorityOrder = { 'Emergency': 4, 'High': 3, 'Normal': 2, 'Low': 1 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        default:
          aVal = a.created_at || '';
          bVal = b.created_at || '';
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
    
    return filtered;
  }, [workOrders, statusFilter, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedWorkOrders.length / itemsPerPage);
  const paginatedWorkOrders = filteredAndSortedWorkOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Column header style
  const headerCellStyle: React.CSSProperties = {
    padding: '0.75rem 0.5rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#374151',
    borderBottom: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap'
  };

  // Data cell style
  const cellStyle: React.CSSProperties = {
    padding: '0.625rem 0.5rem',
    fontSize: '0.8125rem',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    verticalAlign: 'top'
  };

  // Sort indicator
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <SortAsc size={12} style={{ marginLeft: '0.25rem', display: 'inline' }} />
      : <SortDesc size={12} style={{ marginLeft: '0.25rem', display: 'inline' }} />;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} />
        Loading work orders...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header with filters and actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Work Orders ({filteredAndSortedWorkOrders.length})
          </h3>
          
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Filter size={14} color="#6b7280" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                padding: '0.375rem 0.5rem',
                fontSize: '0.8125rem',
                backgroundColor: 'white',
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Suspended">Suspended</option>
              <option value="Complete">Complete</option>
              <option value="Closed">Closed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.375rem 0.5rem',
                backgroundColor: 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>

        {/* Create Work Order button */}
        {onCreateWorkOrder && (
          <button
            onClick={onCreateWorkOrder}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: '500'
            }}
          >
            <Plus size={14} />
            New Work Order
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        overflow: 'hidden'
      }}>
        {paginatedWorkOrders.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9375rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              {statusFilter !== 'all' 
                ? `No ${statusFilter.toLowerCase()} work orders found`
                : 'No work orders found'
              }
            </p>
            <p style={{ fontSize: '0.8125rem' }}>
              {statusFilter !== 'all'
                ? 'Try changing the filter or create a new work order'
                : `${customer.name} doesn't have any work orders yet`
              }
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '900px'
            }}>
              <thead>
                <tr>
                  <th 
                    style={{ ...headerCellStyle, width: '80px' }}
                    onClick={() => handleSort('wo_number')}
                  >
                    Work Order# <SortIndicator field="wo_number" />
                  </th>
                  <th 
                    style={{ ...headerCellStyle, width: '90px' }}
                    onClick={() => handleSort('created_at')}
                  >
                    Entered <SortIndicator field="created_at" />
                  </th>
                  <th 
                    style={{ ...headerCellStyle, width: '100px' }}
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIndicator field="status" />
                  </th>
                  <th style={{ ...headerCellStyle, width: '40px', cursor: 'default' }}>
                    PM?
                  </th>
                  <th style={{ ...headerCellStyle, width: '150px', cursor: 'default' }}>
                    Problem
                  </th>
                  <th style={{ ...headerCellStyle, width: '150px', cursor: 'default' }}>
                    Equipment
                  </th>
                  <th style={{ ...headerCellStyle, minWidth: '200px', cursor: 'default' }}>
                    Customer/CSR Comments
                  </th>
                  <th 
                    style={{ ...headerCellStyle, width: '90px' }}
                    onClick={() => handleSort('scheduled_date')}
                  >
                    Schedule <SortIndicator field="scheduled_date" />
                  </th>
                  <th style={{ ...headerCellStyle, width: '110px', cursor: 'default' }}>
                    Technician
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedWorkOrders.map((wo, index) => {
                  const statusStyle = getStatusStyle(wo.status);
                  const isHovered = hoveredRow === wo.id;
                  const isPM = wo.call_type?.toLowerCase().includes('pm') || 
                               wo.problem_description?.toLowerCase().includes('preventive maintenance');
                  
                  return (
                    <tr
                      key={wo.id}
                      onClick={() => onWorkOrderClick?.(wo)}
                      onMouseEnter={() => setHoveredRow(wo.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{
                        cursor: onWorkOrderClick ? 'pointer' : 'default',
                        backgroundColor: isHovered ? '#f8fafc' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* WO Number */}
                      <td style={{ ...cellStyle, fontWeight: '500', color: '#2563eb' }}>
                        {wo.wo_number?.replace('WO-', '') || wo.id}
                      </td>
                      
                      {/* Entered Date */}
                      <td style={cellStyle}>
                        {formatDate(wo.created_at)}
                      </td>
                      
                      {/* Status */}
                      <td style={cellStyle}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: statusStyle.bg,
                          color: statusStyle.text,
                          border: `1px solid ${statusStyle.border}`,
                          borderRadius: '0.25rem',
                          padding: '0.125rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>
                          {getStatusIcon(wo.status)}
                          {wo.status}
                        </span>
                      </td>
                      
                      {/* PM? */}
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        {isPM && (
                          <span style={{
                            color: '#7c3aed',
                            fontWeight: '600',
                            fontSize: '0.75rem'
                          }}>
                            Y
                          </span>
                        )}
                      </td>
                      
                      {/* Problem */}
                      <td style={cellStyle}>
                        <div style={{ 
                          fontSize: '0.8125rem',
                          color: '#374151'
                        }}>
                          {wo.call_type && (
                            <span style={{ color: '#6b7280' }}>
                              .{wo.call_type} - 
                            </span>
                          )}
                          {truncateText(wo.problem_description || '', 25)}
                        </div>
                      </td>
                      
                      {/* Equipment */}
                      <td style={cellStyle}>
                        <div style={{ fontSize: '0.8125rem', color: '#374151' }}>
                          {wo.equipment_number || wo.equipment_type ? (
                            <>
                              {wo.equipment_number && <span>{wo.equipment_number} </span>}
                              {wo.equipment_type && <span>{wo.equipment_type}</span>}
                            </>
                          ) : (
                            <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>-</span>
                          )}
                        </div>
                      </td>
                      
                      {/* CSR Comments - This is the big one! */}
                      <td style={{ ...cellStyle, maxWidth: '300px' }}>
                        <div style={{
                          fontSize: '0.8125rem',
                          color: '#374151',
                          lineHeight: '1.4',
                          maxHeight: '3.5em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {truncateText(wo.problem_description || '', 150)}
                        </div>
                      </td>
                      
                      {/* Schedule */}
                      <td style={cellStyle}>
                        {formatDate(wo.scheduled_date)}
                      </td>
                      
                      {/* Technician */}
                      <td style={cellStyle}>
                        {wo.tech_first_name || wo.tech_last_name ? (
                          <span style={{ fontSize: '0.8125rem' }}>
                            {wo.tech_first_name} {wo.tech_last_name}
                          </span>
                        ) : wo.assigned_tech_id ? (
                          <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            Tech #{wo.assigned_tech_id}
                          </span>
                        ) : (
                          <span style={{ 
                            color: '#ef4444', 
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            UNASSIGNED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 0'
        }}>
          <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedWorkOrders.length)} of {filteredAndSortedWorkOrders.length} items
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                color: currentPage === 1 ? '#9ca3af' : '#374151'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: currentPage === pageNum ? '#2563eb' : 'white',
                    color: currentPage === pageNum ? 'white' : '#374151',
                    border: '1px solid',
                    borderColor: currentPage === pageNum ? '#2563eb' : '#d1d5db',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontWeight: currentPage === pageNum ? '600' : '400'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.375rem 0.5rem',
                backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                color: currentPage === totalPages ? '#9ca3af' : '#374151'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerWorkOrdersTable;
