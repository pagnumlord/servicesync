// RegisterTab.tsx - Work Order Line Items Management (Vision Register Tab)
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  DollarSign,
  Package,
  Wrench,
  AlertCircle
} from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface LineItem {
  id?: number;
  line_number: number;
  item_type: 'labor' | 'part' | 'material' | 'equipment' | 'misc';
  description: string;
  part_number?: string;
  manufacturer?: string;
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  unit_price: number;
  labor_hours?: number;
  labor_rate?: number;
  line_total: number;
  cost_total: number;
  profit_margin: number;
  is_billable: boolean;
  is_taxable: boolean;
  is_warranty: boolean;
  notes?: string;
}

interface RegisterTabProps {
  workOrderId: number;
  isReadOnly?: boolean;
}

const RegisterTab: React.FC<RegisterTabProps> = ({ workOrderId, isReadOnly = false }) => {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<LineItem>>({
    item_type: 'labor',
    quantity: 1,
    unit_of_measure: 'EA',
    unit_cost: 0,
    unit_price: 0,
    is_billable: true,
    is_taxable: true,
    is_warranty: false
  });

  useEffect(() => {
    loadLineItems();
  }, [workOrderId]);

  const loadLineItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/work-orders/${workOrderId}/line-items`);
      if (!response.ok) throw new Error('Failed to load line items');
      const data = await response.json();
      setLineItems(data);
    } catch (error) {
      console.error('Error loading line items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = async () => {
    try {
      const response = await fetch(`${API_BASE}/work-orders/${workOrderId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      if (!response.ok) throw new Error('Failed to add line item');

      await loadLineItems();
      setShowAddForm(false);
      setNewItem({
        item_type: 'labor',
        quantity: 1,
        unit_of_measure: 'EA',
        unit_cost: 0,
        unit_price: 0,
        is_billable: true,
        is_taxable: true,
        is_warranty: false
      });
    } catch (error) {
      console.error('Error adding line item:', error);
      alert('Failed to add line item');
    }
  };

  const handleDeleteItem = async (lineItemId: number) => {
    if (!confirm('Are you sure you want to delete this line item?')) return;

    try {
      const response = await fetch(
        `${API_BASE}/work-orders/${workOrderId}/line-items/${lineItemId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete line item');
      await loadLineItems();
    } catch (error) {
      console.error('Error deleting line item:', error);
      alert('Failed to delete line item');
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems
      .filter(item => item.is_billable)
      .reduce((sum, item) => sum + item.line_total, 0);

    const totalCost = lineItems
      .reduce((sum, item) => sum + item.cost_total, 0);

    const totalProfit = subtotal - totalCost;
    const profitMargin = subtotal > 0 ? (totalProfit / subtotal) * 100 : 0;

    const laborTotal = lineItems
      .filter(item => item.item_type === 'labor')
      .reduce((sum, item) => sum + item.line_total, 0);

    const partsTotal = lineItems
      .filter(item => ['part', 'material', 'equipment'].includes(item.item_type))
      .reduce((sum, item) => sum + item.line_total, 0);

    return { subtotal, totalCost, totalProfit, profitMargin, laborTotal, partsTotal };
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'labor':
        return <Wrench size={16} color="#3B82F6" />;
      case 'part':
      case 'material':
      case 'equipment':
        return <Package size={16} color="#10B981" />;
      default:
        return <DollarSign size={16} color="#6B7280" />;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'labor':
        return '#EFF6FF';
      case 'part':
      case 'material':
      case 'equipment':
        return '#ECFDF5';
      default:
        return '#F3F4F6';
    }
  };

  const totals = calculateTotals();

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6B7280' }}>
        Loading line items...
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
          Register - Labor & Parts
        </h3>
        {!isReadOnly && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            <Plus size={16} />
            Add Line Item
          </button>
        )}
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: '#F9FAFB',
          border: '2px solid #3B82F6',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>
              Add New Line Item
            </h4>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '0.25rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {/* Item Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Type *
              </label>
              <select
                value={newItem.item_type}
                onChange={(e) => setNewItem({ ...newItem, item_type: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="labor">Labor</option>
                <option value="part">Part</option>
                <option value="material">Material</option>
                <option value="equipment">Equipment</option>
                <option value="misc">Miscellaneous</option>
              </select>
            </div>

            {/* Description */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Description *
              </label>
              <input
                type="text"
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Enter description"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Part Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Part Number
              </label>
              <input
                type="text"
                value={newItem.part_number || ''}
                onChange={(e) => setNewItem({ ...newItem, part_number: e.target.value })}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Manufacturer */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Manufacturer
              </label>
              <input
                type="text"
                value={newItem.manufacturer || ''}
                onChange={(e) => setNewItem({ ...newItem, manufacturer: e.target.value })}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Quantity */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Quantity *
              </label>
              <input
                type="number"
                step="0.01"
                value={newItem.quantity || 1}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={newItem.unit_cost || 0}
                onChange={(e) => setNewItem({ ...newItem, unit_cost: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Unit Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Unit Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={newItem.unit_price || 0}
                onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Labor Hours (if labor) */}
            {newItem.item_type === 'labor' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Labor Hours
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    value={newItem.labor_hours || ''}
                    onChange={(e) => setNewItem({ ...newItem, labor_hours: parseFloat(e.target.value) || undefined })}
                    placeholder="Optional"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                    Labor Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.labor_rate || ''}
                    onChange={(e) => setNewItem({ ...newItem, labor_rate: parseFloat(e.target.value) || undefined })}
                    placeholder="Optional"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </>
            )}

            {/* Checkboxes */}
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newItem.is_billable}
                  onChange={(e) => setNewItem({ ...newItem, is_billable: e.target.checked })}
                />
                Billable
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newItem.is_taxable}
                  onChange={(e) => setNewItem({ ...newItem, is_taxable: e.target.checked })}
                />
                Taxable
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newItem.is_warranty}
                  onChange={(e) => setNewItem({ ...newItem, is_warranty: e.target.checked })}
                />
                Warranty Work
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              disabled={!newItem.description || !newItem.unit_price}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: newItem.description && newItem.unit_price ? '#3B82F6' : '#D1D5DB',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: newItem.description && newItem.unit_price ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Save size={16} />
              Add Item
            </button>
          </div>
        </div>
      )}

      {/* Line Items Table */}
      {lineItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          backgroundColor: '#F9FAFB',
          borderRadius: '0.75rem',
          border: '2px dashed #D1D5DB'
        }}>
          <AlertCircle size={48} color="#9CA3AF" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#6B7280', fontSize: '1rem', margin: 0 }}>
            No line items added yet
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Click "Add Line Item" to start building the register
          </p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <thead style={{ backgroundColor: '#F3F4F6' }}>
                <tr>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Part #</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Price</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Total</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Flags</th>
                  {!isReadOnly && (
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: '1px solid #E5E7EB',
                      backgroundColor: getItemTypeColor(item.item_type)
                    }}
                  >
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                      {item.line_number}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getItemTypeIcon(item.item_type)}
                        <span style={{ textTransform: 'capitalize', fontWeight: '500', color: '#374151' }}>
                          {item.item_type}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#374151' }}>
                      {item.description}
                      {item.labor_hours && (
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                          {item.labor_hours}h @ ${item.labor_rate}/hr
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                      {item.part_number || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#374151' }}>
                      {item.quantity} {item.unit_of_measure}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#6B7280' }}>
                      ${item.unit_cost.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                      ${item.line_total.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {item.is_billable && (
                          <span style={{
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#DBEAFE',
                            color: '#1E40AF',
                            borderRadius: '0.25rem',
                            fontSize: '0.625rem',
                            fontWeight: '600'
                          }}>
                            BILL
                          </span>
                        )}
                        {item.is_taxable && (
                          <span style={{
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                            borderRadius: '0.25rem',
                            fontSize: '0.625rem',
                            fontWeight: '600'
                          }}>
                            TAX
                          </span>
                        )}
                        {item.is_warranty && (
                          <span style={{
                            padding: '0.125rem 0.375rem',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B',
                            borderRadius: '0.25rem',
                            fontSize: '0.625rem',
                            fontWeight: '600'
                          }}>
                            WARR
                          </span>
                        )}
                      </div>
                    </td>
                    {!isReadOnly && (
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteItem(item.id!)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.875rem'
                          }}
                          title="Delete line item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div style={{
            marginTop: '1.5rem',
            backgroundColor: '#F9FAFB',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            border: '1px solid #E5E7EB'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>
              Cost Summary
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Labor Total
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3B82F6' }}>
                  ${totals.laborTotal.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Parts/Materials Total
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10B981' }}>
                  ${totals.partsTotal.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Total Cost
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#EF4444' }}>
                  ${totals.totalCost.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Billable Subtotal
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  ${totals.subtotal.toFixed(2)}
                </div>
              </div>

              <div style={{
                backgroundColor: totals.totalProfit >= 0 ? '#ECFDF5' : '#FEE2E2',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: `2px solid ${totals.totalProfit >= 0 ? '#10B981' : '#EF4444'}`
              }}>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: '600' }}>
                  Profit
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: totals.totalProfit >= 0 ? '#10B981' : '#EF4444' }}>
                  ${totals.totalProfit.toFixed(2)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  {totals.profitMargin.toFixed(1)}% margin
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RegisterTab;
