// Inventory Management Component
// Clean, efficient UI for managing parts and miscellaneous items

import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Filter,
  X,
  Save,
  Clock
} from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000/api';

interface InventoryItem {
  id: number;
  item_type: 'inventory' | 'miscellaneous';
  product_category?: string;
  part_number?: string;
  description: string;
  manufacturer?: string;
  mfg_part_number?: string;
  unit_cost: number;
  unit_sale: number;
  markup_percentage?: number;
  quantity_on_hand: number;
  reorder_level: number;
  primary_vendor_id?: number;
  vendor_name?: string;
  is_taxable: boolean;
  is_equipment: boolean;
  is_consignment: boolean;
  is_active: boolean;
  needs_reorder?: boolean;
  last_price_change_date?: string;
  price_change_count?: number;
}

interface InventoryStats {
  total_items: number;
  inventory_count: number;
  miscellaneous_count: number;
  low_stock_count: number;
  total_inventory_value: number;
}

const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedItem, setEditedItem] = useState<Partial<InventoryItem>>({});

  // Filters
  const [filterItemType, setFilterItemType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, [filterItemType, searchQuery, showLowStockOnly]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (filterItemType !== 'all') params.append('item_type', filterItemType);
      if (searchQuery) params.append('search', searchQuery);
      if (showLowStockOnly) params.append('low_stock', 'true');

      const response = await fetch(`${API_BASE_URL}/inventory?${params}`);
      const data = await response.json();

      setItems(data.items || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setEditedItem(item);
  };

  const handleSave = async () => {
    if (!editingId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/inventory/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedItem)
      });

      if (response.ok) {
        await fetchInventory();
        setEditingId(null);
        setEditedItem({});
      }
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedItem({});
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '$0.00';
    return `$${value.toFixed(2)}`;
  };

  const getItemTypeColor = (type: string) => {
    return type === 'inventory' ? '#3B82F6' : '#8B5CF6';
  };

  const getItemTypeBadge = (type: string) => {
    const color = getItemTypeColor(type);
    return (
      <span style={{
        backgroundColor: `${color}15`,
        color: color,
        padding: '0.25rem 0.5rem',
        borderRadius: '0.375rem',
        fontSize: '0.75rem',
        fontWeight: '600'
      }}>
        {type === 'inventory' ? 'Part' : 'Misc'}
      </span>
    );
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '1.875rem',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0
          }}>
            Inventory Management
          </h1>
          <p style={{ color: '#6B7280', marginTop: '0.25rem' }}>
            Parts, materials, and miscellaneous items
          </p>
        </div>
        <button style={{
          backgroundColor: '#3B82F6',
          color: 'white',
          padding: '0.625rem 1rem',
          borderRadius: '0.5rem',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500'
        }}>
          <Plus size={18} />
          Add Item
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Total Items</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.25rem 0 0 0' }}>
                  {stats.total_items}
                </p>
              </div>
              <Package size={20} style={{ color: '#3B82F6' }} />
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Inventory Parts</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.25rem 0 0 0' }}>
                  {stats.inventory_count}
                </p>
              </div>
              <Package size={20} style={{ color: '#3B82F6' }} />
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Misc Items</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#111827', margin: '0.25rem 0 0 0' }}>
                  {stats.miscellaneous_count}
                </p>
              </div>
              <Package size={20} style={{ color: '#8B5CF6' }} />
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Low Stock</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#DC2626', margin: '0.25rem 0 0 0' }}>
                  {stats.low_stock_count}
                </p>
              </div>
              <AlertTriangle size={20} style={{ color: '#DC2626' }} />
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '0.75rem',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>Inventory Value</p>
                <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#059669', margin: '0.25rem 0 0 0' }}>
                  {formatCurrency(stats.total_inventory_value)}
                </p>
              </div>
              <DollarSign size={20} style={{ color: '#059669' }} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '0.75rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          alignItems: 'center'
        }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9CA3AF'
            }} />
            <input
              type="text"
              placeholder="Search parts or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Item Type Filter */}
          <select
            value={filterItemType}
            onChange={(e) => setFilterItemType(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Types</option>
            <option value="inventory">Inventory Parts</option>
            <option value="miscellaneous">Miscellaneous</option>
          </select>

          {/* Low Stock Toggle */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}>
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <AlertTriangle size={16} style={{ color: '#DC2626' }} />
            <span>Low Stock Only</span>
          </label>
        </div>
      </div>

      {/* Items Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #E5E7EB',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
            Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
            No items found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Type</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Part #</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Manufacturer</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Our Cost</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Sale Price</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Markup</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Vendor</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid #E5E7EB',
                      backgroundColor: item.needs_reorder ? '#FEF2F2' : 'white'
                    }}
                  >
                    {/* Type */}
                    <td style={{ padding: '0.75rem' }}>
                      {getItemTypeBadge(item.item_type)}
                    </td>

                    {/* Part Number */}
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: '500' }}>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editedItem.part_number || ''}
                          onChange={(e) => setEditedItem({ ...editedItem, part_number: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.25rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        item.part_number || '—'
                      )}
                    </td>

                    {/* Description */}
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', maxWidth: '300px' }}>
                      {editingId === item.id ? (
                        <input
                          type="text"
                          value={editedItem.description || ''}
                          onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.25rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem'
                          }}
                        />
                      ) : (
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.description}
                        </div>
                      )}
                    </td>

                    {/* Manufacturer */}
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                      {item.manufacturer || '—'}
                    </td>

                    {/* Unit Cost */}
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editedItem.unit_cost || 0}
                          onChange={(e) => setEditedItem({ ...editedItem, unit_cost: parseFloat(e.target.value) })}
                          style={{
                            width: '80px',
                            padding: '0.25rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        formatCurrency(item.unit_cost)
                      )}
                    </td>

                    {/* Unit Sale */}
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontFamily: 'monospace', fontWeight: '600' }}>
                      {editingId === item.id ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editedItem.unit_sale || 0}
                          onChange={(e) => setEditedItem({ ...editedItem, unit_sale: parseFloat(e.target.value) })}
                          style={{
                            width: '80px',
                            padding: '0.25rem',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.25rem',
                            fontSize: '0.875rem',
                            textAlign: 'right',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        formatCurrency(item.unit_sale)
                      )}
                    </td>

                    {/* Markup */}
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem' }}>
                      <span style={{
                        color: (item.markup_percentage || 0) >= 50 ? '#059669' : '#6B7280',
                        fontWeight: '500'
                      }}>
                        {item.markup_percentage?.toFixed(0) || 0}%
                      </span>
                    </td>

                    {/* Quantity */}
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem' }}>
                      {item.item_type === 'inventory' ? (
                        <div>
                          <div style={{
                            fontWeight: '600',
                            color: item.needs_reorder ? '#DC2626' : '#111827'
                          }}>
                            {item.quantity_on_hand}
                          </div>
                          {item.needs_reorder && (
                            <div style={{ fontSize: '0.75rem', color: '#DC2626' }}>
                              Low
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Vendor */}
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                      {item.vendor_name || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      {editingId === item.id ? (
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={handleSave}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#059669',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#DC2626',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            margin: '0 auto'
                          }}
                        >
                          <Edit2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
