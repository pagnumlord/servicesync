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
    if (!window.confirm('Are you sure you want to delete this line item?')) return;

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

      {/* Quick Add - Inline Entry */}
      {showAddForm && (
        <div style={{
          backgroundColor: 'white',
          border: '2px solid #3B82F6',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px 100px 100px auto', gap: '0.75rem', alignItems: 'end' }}>
            {/* Type Dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Type
              </label>
              <select
                value={newItem.item_type}
                onChange={(e) => {
                  const type = e.target.value as any;
                  setNewItem({
                    ...newItem,
                    item_type: type,
                    // Auto-set common defaults based on type
                    description: type === 'labor' ? '' : newItem.description,
                    unit_of_measure: type === 'labor' ? 'HR' : 'EA'
                  });
                }}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="labor">Labor</option>
                <option value="part">Part</option>
                <option value="material">Material</option>
                <option value="equipment">Equipment</option>
                <option value="misc">Misc</option>
              </select>
            </div>

            {/* Description - With Common Presets */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Description *
              </label>
              {newItem.item_type === 'labor' ? (
                <select
                  value={newItem.description || ''}
                  onChange={(e) => {
                    const desc = e.target.value;
                    // Auto-populate labor details based on common descriptions
                    let hours = 1;
                    let rate = 0;
                    let price = 0;

                    if (desc.includes('Service Call')) {
                      hours = 1;
                      rate = 125;
                      price = 125;
                    } else if (desc.includes('Diagnostic')) {
                      hours = 0.5;
                      rate = 125;
                      price = 62.5;
                    } else if (desc.includes('Repair')) {
                      hours = 2;
                      rate = 125;
                      price = 250;
                    } else if (desc.includes('Installation')) {
                      hours = 3;
                      rate = 125;
                      price = 375;
                    } else if (desc.includes('Maintenance')) {
                      hours = 1.5;
                      rate = 125;
                      price = 187.5;
                    }

                    setNewItem({
                      ...newItem,
                      description: desc,
                      labor_hours: hours,
                      labor_rate: rate,
                      unit_price: price,
                      quantity: 1
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Select labor type...</option>
                  <option value="Service Call - Regular">Service Call - Regular</option>
                  <option value="Service Call - OT">Service Call - OT</option>
                  <option value="Diagnostic/Troubleshooting">Diagnostic/Troubleshooting</option>
                  <option value="Repair Labor">Repair Labor</option>
                  <option value="Installation Labor">Installation Labor</option>
                  <option value="Preventive Maintenance">Preventive Maintenance</option>
                  <option value="Custom Labor">Custom Labor (enter details below)</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={newItem.description || ''}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Part/material description..."
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              )}
            </div>

            {/* Quantity */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Qty
              </label>
              <input
                type="number"
                step="0.25"
                value={newItem.quantity || 1}
                onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  textAlign: 'right'
                }}
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Cost
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
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  textAlign: 'right'
                }}
              />
            </div>

            {/* Unit Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Price *
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
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  textAlign: 'right'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleAddItem}
                disabled={!newItem.description || !newItem.unit_price}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: newItem.description && newItem.unit_price ? '#10B981' : '#D1D5DB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: newItem.description && newItem.unit_price ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  whiteSpace: 'nowrap'
                }}
                title="Add this line item"
              >
                <Plus size={14} />
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'white',
                  color: '#6B7280',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Flags Row */}
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newItem.is_billable}
                onChange={(e) => setNewItem({ ...newItem, is_billable: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: '#374151', fontWeight: '500' }}>Billable</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newItem.is_taxable}
                onChange={(e) => setNewItem({ ...newItem, is_taxable: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: '#374151', fontWeight: '500' }}>Taxable</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newItem.is_warranty}
                onChange={(e) => setNewItem({ ...newItem, is_warranty: e.target.checked })}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ color: '#374151', fontWeight: '500' }}>Warranty</span>
            </label>

            {/* Show labor details if applicable */}
            {newItem.item_type === 'labor' && newItem.labor_hours && (
              <div style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6B7280', backgroundColor: '#EFF6FF', padding: '0.25rem 0.75rem', borderRadius: '0.25rem' }}>
                {newItem.labor_hours}h @ ${newItem.labor_rate}/hr = ${(newItem.labor_hours * (newItem.labor_rate || 0)).toFixed(2)}
              </div>
            )}
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
