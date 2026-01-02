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

// Product options based on Type (matching Vision)
const PRODUCT_OPTIONS: Record<string, string[]> = {
  labor: [
    'RT Labor',
    'Helper',
    'Helper OT',
    'Overtime',
    'On-the-job training',
    'SunHol'
  ],
  flat_rate: [
    'Flat Rate Service',
    'Diagnostic Fee',
    'Trip Charge'
  ],
  miscellaneous: [
    'Finance/Bad Ck/Interest',
    'Job Summary Billing',
    'Jobs in Process',
    'Lease',
    'Misc. Use Fees',
    'Office Supplies'
  ],
  parts: [], // Parts come from inventory lookup
  equipment: ['Equipment Rental', 'Equipment Sale'],
  freight: ['Freight Charges'],
  sub_contractor: ['Sub-Contractor Services']
};

// Rate modifiers (matching Vision)
const RATE_MODIFIERS = [
  'Regular Time',
  'Overtime',
  'Double Time',
  'After Hours'
];

interface LineItem {
  id?: number;
  line_number: number;
  item_type: 'labor' | 'parts' | 'miscellaneous' | 'flat_rate' | 'sub_contractor' | 'equipment' | 'freight';
  product?: string; // Cascading field based on item_type
  description: string;
  part_number?: string;
  manufacturer?: string;
  quantity: number;
  unit_of_measure: string;
  unit_cost: number;
  unit_price: number;
  labor_hours?: number;
  labor_rate?: number;
  modifier?: string; // Rate modifier (Regular Time, OT, etc.)
  markup_percentage?: number;
  line_total: number;
  cost_total: number;
  profit_margin: number;
  is_billable: boolean;
  is_taxable: boolean;
  is_warranty: boolean;
  is_inventory: boolean; // Distinguishes Inventory vs Miscellaneous parts
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
  const [showFormPopup, setShowFormPopup] = useState(false);
  const [formEditItem, setFormEditItem] = useState<Partial<LineItem> | null>(null);
  const [newItem, setNewItem] = useState<Partial<LineItem>>({
    item_type: 'labor',
    product: '',
    modifier: 'Regular Time',
    quantity: 1,
    unit_of_measure: 'EA',
    unit_cost: 0,
    unit_price: 0,
    markup_percentage: 0,
    is_billable: true,
    is_taxable: true,
    is_warranty: false,
    is_inventory: false
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
      // Build description from product and modifier
      const description = newItem.modifier
        ? `${newItem.product} - ${newItem.modifier}`
        : newItem.product || 'Line Item';

      // Prepare payload for backend
      const payload = {
        item_type: newItem.item_type,
        description: description,
        part_number: newItem.part_number,
        manufacturer: newItem.manufacturer,
        quantity: newItem.quantity,
        unit_of_measure: newItem.unit_of_measure,
        unit_cost: newItem.unit_cost || 0,
        unit_price: newItem.unit_price || 0,
        // For labor items, labor_hours = quantity
        labor_hours: newItem.item_type === 'labor' ? newItem.quantity : newItem.labor_hours,
        labor_rate: newItem.item_type === 'labor' ? (newItem.labor_rate || newItem.unit_price) : newItem.labor_rate,
        is_billable: newItem.is_billable !== false,
        is_taxable: newItem.is_taxable !== false,
        is_warranty: newItem.is_warranty || false,
        notes: newItem.notes
      };

      const response = await fetch(`${API_BASE}/work-orders/${workOrderId}/line-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add line item');
      }

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
    <div style={{ padding: '1.25rem 1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.25rem'
      }}>
        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#1F2937' }}>
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
              borderRadius: '0.375rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
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
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '0.5rem',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 150px 100px 85px 85px auto', gap: '0.75rem', alignItems: 'end' }}>
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
                    product: '', // Reset product when type changes
                    description: '',
                    unit_of_measure: type === 'labor' ? 'HR' : 'EA',
                    is_inventory: type === 'parts'
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
                <option value="parts">Parts</option>
                <option value="miscellaneous">Miscellaneous</option>
                <option value="flat_rate">Flat Rate</option>
                <option value="sub_contractor">Sub-Contractor</option>
                <option value="equipment">Equipment</option>
                <option value="freight">Freight</option>
              </select>
            </div>

            {/* Product Dropdown (cascades from Type) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Product/Repair
              </label>
              <select
                value={newItem.product || ''}
                onChange={(e) => {
                  const product = e.target.value;
                  // Auto-populate based on product selection
                  let updates: Partial<LineItem> = { product };

                  // Auto-set pricing for common products
                  if (product === 'RT Labor') {
                    updates = { ...updates, labor_rate: 120, unit_price: 120 };
                  } else if (product === 'Helper') {
                    updates = { ...updates, labor_rate: 100, unit_price: 100 };
                  } else if (product === 'Overtime') {
                    updates = { ...updates, labor_rate: 180, unit_price: 180 };
                  }

                  setNewItem({ ...newItem, ...updates });
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
                <option value="">Select...</option>
                {PRODUCT_OPTIONS[newItem.item_type || 'labor']?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Modifier (Rate Type) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Modifier
              </label>
              <select
                value={newItem.modifier || 'Regular Time'}
                onChange={(e) => setNewItem({ ...newItem, modifier: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                {RATE_MODIFIERS.map(mod => (
                  <option key={mod} value={mod}>{mod}</option>
                ))}
              </select>
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

            {/* Unit Price */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.25rem', color: '#6B7280' }}>
                Rate
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
                placeholder="0.00"
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <button
                onClick={handleAddItem}
                disabled={!newItem.product || !newItem.unit_price}
                style={{
                  padding: '0.5rem 0.875rem',
                  backgroundColor: newItem.product && newItem.unit_price ? '#10B981' : '#D1D5DB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: newItem.product && newItem.unit_price ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  whiteSpace: 'nowrap'
                }}
                title="Add this line item"
              >
                <Plus size={16} />
                Add
              </button>
              <button
                onClick={() => {
                  setFormEditItem(newItem);
                  setShowFormPopup(true);
                }}
                style={{
                  padding: '0.5rem 0.875rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  whiteSpace: 'nowrap'
                }}
                title="Open detailed form for markup and advanced settings"
              >
                Form
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
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Flags Row */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newItem.is_billable !== false}
                onChange={(e) => setNewItem({ ...newItem, is_billable: e.target.checked })}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ color: '#374151', fontWeight: '500' }}>Billable</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newItem.is_taxable !== false}
                onChange={(e) => setNewItem({ ...newItem, is_taxable: e.target.checked })}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ color: '#374151', fontWeight: '500' }}>Taxable</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newItem.is_warranty === true}
                onChange={(e) => setNewItem({ ...newItem, is_warranty: e.target.checked })}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
              <span style={{ color: '#374151', fontWeight: '500' }}>Warranty</span>
            </label>

            {/* Show total if quantity and price set */}
            {newItem.quantity && newItem.unit_price && (
              <div style={{ marginLeft: 'auto', fontSize: '0.9375rem', color: '#111827', fontWeight: '600', backgroundColor: '#F3F4F6', padding: '0.375rem 0.75rem', borderRadius: '0.375rem' }}>
                Total: ${((newItem.quantity || 0) * (newItem.unit_price || 0)).toFixed(2)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Line Items Table */}
      {lineItems.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          backgroundColor: '#F9FAFB',
          borderRadius: '0.5rem',
          border: '1px dashed #D1D5DB'
        }}>
          <AlertCircle size={48} color="#D1D5DB" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: '#6B7280', fontSize: '0.9375rem', margin: 0, fontWeight: '500' }}>
            No line items added yet
          </p>
          <p style={{ color: '#9CA3AF', fontSize: '0.875rem', marginTop: '0.375rem' }}>
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
                          {Number(item.labor_hours).toFixed(2)}h @ ${Number(item.labor_rate || 0).toFixed(2)}/hr
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
                      ${Number(item.unit_cost || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
                      ${Number(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', color: '#111827', fontWeight: '600' }}>
                      ${Number(item.line_total || 0).toFixed(2)}
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

      {/* Form Popup - Detailed Line Item Editor */}
      {showFormPopup && formEditItem && (
        <div
          onClick={() => setShowFormPopup(false)}
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
            zIndex: 2000,
            padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 10
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#1F2937' }}>
                Line Item Details
              </h3>
              <button
                onClick={() => setShowFormPopup(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6B7280',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Form Content */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Type and Product */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    Type
                  </label>
                  <select
                    value={formEditItem.item_type}
                    onChange={(e) => setFormEditItem({ ...formEditItem, item_type: e.target.value as any, product: '' })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="labor">Labor</option>
                    <option value="parts">Parts</option>
                    <option value="miscellaneous">Miscellaneous</option>
                    <option value="flat_rate">Flat Rate</option>
                    <option value="sub_contractor">Sub-Contractor</option>
                    <option value="equipment">Equipment</option>
                    <option value="freight">Freight</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    Product
                  </label>
                  <select
                    value={formEditItem.product || ''}
                    onChange={(e) => setFormEditItem({ ...formEditItem, product: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select...</option>
                    {PRODUCT_OPTIONS[formEditItem.item_type || 'labor']?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Part Details (if Parts/Misc) */}
              {(formEditItem.item_type === 'parts' || formEditItem.item_type === 'miscellaneous') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Part Number
                    </label>
                    <input
                      type="text"
                      value={formEditItem.part_number || ''}
                      onChange={(e) => setFormEditItem({ ...formEditItem, part_number: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Enter part number..."
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formEditItem.manufacturer || ''}
                      onChange={(e) => setFormEditItem({ ...formEditItem, manufacturer: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem'
                      }}
                      placeholder="Enter manufacturer..."
                    />
                  </div>
                </div>
              )}

              {/* Pricing */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    Unit Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formEditItem.unit_cost || 0}
                    onChange={(e) => setFormEditItem({ ...formEditItem, unit_cost: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'right'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    Markup %
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={formEditItem.markup_percentage || 0}
                    onChange={(e) => {
                      const markup = parseFloat(e.target.value) || 0;
                      const cost = formEditItem.unit_cost || 0;
                      const price = cost * (1 + markup / 100);
                      setFormEditItem({
                        ...formEditItem,
                        markup_percentage: markup,
                        unit_price: price
                      });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'right'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                    Unit Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formEditItem.unit_price || 0}
                    onChange={(e) => setFormEditItem({ ...formEditItem, unit_price: parseFloat(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      textAlign: 'right'
                    }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                  Notes
                </label>
                <textarea
                  value={formEditItem.notes || ''}
                  onChange={(e) => setFormEditItem({ ...formEditItem, notes: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                  placeholder="Additional notes..."
                />
              </div>

              {/* Flags */}
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formEditItem.is_billable !== false}
                    onChange={(e) => setFormEditItem({ ...formEditItem, is_billable: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500' }}>Billable</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formEditItem.is_taxable !== false}
                    onChange={(e) => setFormEditItem({ ...formEditItem, is_taxable: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500' }}>Taxable</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formEditItem.is_warranty === true}
                    onChange={(e) => setFormEditItem({ ...formEditItem, is_warranty: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '500' }}>Warranty Work</span>
                </label>
                {formEditItem.item_type === 'parts' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formEditItem.is_inventory === true}
                      onChange={(e) => setFormEditItem({ ...formEditItem, is_inventory: e.target.checked })}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '500' }}>Inventory Part</span>
                  </label>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              position: 'sticky',
              bottom: 0,
              backgroundColor: 'white'
            }}>
              <button
                onClick={() => setShowFormPopup(false)}
                style={{
                  padding: '0.75rem 1.5rem',
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
                onClick={() => {
                  setNewItem(formEditItem);
                  setShowFormPopup(false);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterTab;
