import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, DollarSign, Package, Wrench, Settings } from 'lucide-react';
import { PricebookCategory, PricebookItem } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001';

const PricebookManagement: React.FC = () => {
  const [categories, setCategories] = useState<PricebookCategory[]>([]);
  const [items, setItems] = useState<PricebookItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PricebookItem | null>(null);

  // Form state for new/edit item
  const [formData, setFormData] = useState({
    category_id: 1,
    item_code: '',
    item_name: '',
    description: '',
    item_type: 'material' as 'labor' | 'material' | 'equipment' | 'service' | 'fee' | 'other',
    unit_of_measure: 'EA',
    unit_cost: 0,
    unit_price: 0,
    markup_percent: 0,
    is_taxable: true,
    is_active: true,
    notes: ''
  });

  useEffect(() => {
    loadCategories();
    loadItems();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/pricebook/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedCategoryId) params.category_id = selectedCategoryId;
      if (itemTypeFilter !== 'all') params.item_type = itemTypeFilter;
      if (searchTerm) params.keyword = searchTerm;

      const response = await axios.get(`${API_BASE_URL}/api/pricebook/items`, { params });
      setItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [selectedCategoryId, itemTypeFilter, searchTerm]);

  const handleOpenModal = (item?: PricebookItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        category_id: item.category_id,
        item_code: item.item_code,
        item_name: item.item_name,
        description: item.description || '',
        item_type: item.item_type,
        unit_of_measure: item.unit_of_measure,
        unit_cost: item.unit_cost,
        unit_price: item.unit_price,
        markup_percent: item.markup_percent,
        is_taxable: item.is_taxable,
        is_active: item.is_active,
        notes: item.notes || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        category_id: selectedCategoryId || 1,
        item_code: '',
        item_name: '',
        description: '',
        item_type: 'material',
        unit_of_measure: 'EA',
        unit_cost: 0,
        unit_price: 0,
        markup_percent: 0,
        is_taxable: true,
        is_active: true,
        notes: ''
      });
    }
    setShowItemModal(true);
  };

  const handleSaveItem = async () => {
    try {
      if (editingItem) {
        await axios.put(`${API_BASE_URL}/api/pricebook/items/${editingItem.id}`, formData);
      } else {
        await axios.post(`${API_BASE_URL}/api/pricebook/items`, formData);
      }
      setShowItemModal(false);
      loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('Error saving item. Please try again.');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/pricebook/items/${itemId}`);
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    }
  };

  const calculateMarkup = (cost: number, price: number): number => {
    if (cost === 0) return 0;
    return parseFloat(((price - cost) / cost * 100).toFixed(2));
  };

  const calculatePrice = (cost: number, markupPercent: number): number => {
    return parseFloat((cost * (1 + markupPercent / 100)).toFixed(2));
  };

  const handleCostChange = (cost: number) => {
    setFormData(prev => ({
      ...prev,
      unit_cost: cost,
      unit_price: calculatePrice(cost, prev.markup_percent)
    }));
  };

  const handlePriceChange = (price: number) => {
    setFormData(prev => ({
      ...prev,
      unit_price: price,
      markup_percent: calculateMarkup(prev.unit_cost, price)
    }));
  };

  const handleMarkupChange = (markup: number) => {
    setFormData(prev => ({
      ...prev,
      markup_percent: markup,
      unit_price: calculatePrice(prev.unit_cost, markup)
    }));
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'labor': return <Wrench size={16} />;
      case 'material': return <Package size={16} />;
      case 'equipment': return <Settings size={16} />;
      case 'service': return <DollarSign size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'labor': return '#3B82F6';
      case 'material': return '#10B981';
      case 'equipment': return '#F59E0B';
      case 'service': return '#8B5CF6';
      case 'fee': return '#EC4899';
      default: return '#6B7280';
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#F9FAFB', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>
            Pricebook
          </h1>
          <p style={{ color: '#6B7280', marginTop: '0.5rem', margin: 0 }}>
            Manage service items, pricing, and categories
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
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
          <Plus size={20} /> Add Item
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem' }}>
        {/* Sidebar - Categories */}
        <div style={{ width: '280px', flexShrink: 0 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937', marginTop: 0, marginBottom: '1rem' }}>
              Categories
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => setSelectedCategoryId(null)}
                style={{
                  textAlign: 'left',
                  padding: '0.75rem 1rem',
                  backgroundColor: selectedCategoryId === null ? '#EFF6FF' : 'transparent',
                  border: selectedCategoryId === null ? '1px solid #3B82F6' : '1px solid transparent',
                  borderRadius: '0.5rem',
                  color: selectedCategoryId === null ? '#3B82F6' : '#6B7280',
                  fontWeight: selectedCategoryId === null ? '600' : '400',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                All Items
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  style={{
                    textAlign: 'left',
                    padding: '0.75rem 1rem',
                    backgroundColor: selectedCategoryId === category.id ? '#EFF6FF' : 'transparent',
                    border: selectedCategoryId === category.id ? '1px solid #3B82F6' : '1px solid transparent',
                    borderRadius: '0.5rem',
                    color: selectedCategoryId === category.id ? '#3B82F6' : '#6B7280',
                    fontWeight: selectedCategoryId === category.id ? '600' : '400',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {category.category_name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Items */}
        <div style={{ flex: 1 }}>
          {/* Filters */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
                <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                <input
                  type="text"
                  placeholder="Search items..."
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

              {/* Item Type Filter */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['all', 'labor', 'material', 'equipment', 'service', 'fee'].map(type => (
                  <button
                    key={type}
                    onClick={() => setItemTypeFilter(type)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: itemTypeFilter === type ? '#3B82F6' : 'white',
                      color: itemTypeFilter === type ? 'white' : '#6B7280',
                      border: `1px solid ${itemTypeFilter === type ? '#3B82F6' : '#D1D5DB'}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                Loading items...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                No items found
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Item Name</th>
                    <th style={{ textAlign: 'left', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>UoM</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Cost</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Price</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Markup</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Taxable</th>
                    <th style={{ textAlign: 'center', padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid #F3F4F6' }}
                    >
                      <td style={{ padding: '1rem' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          backgroundColor: getItemTypeColor(item.item_type) + '20',
                          color: getItemTypeColor(item.item_type),
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          {getItemTypeIcon(item.item_type)}
                          {item.item_type}
                        </div>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'monospace' }}>
                        {item.item_code}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1F2937' }}>
                          {item.item_name}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>
                        {item.unit_of_measure}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#6B7280' }}>
                        ${item.unit_cost.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                        ${item.unit_price.toFixed(2)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', color: '#059669' }}>
                        {item.markup_percent.toFixed(1)}%
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        {item.is_taxable ? (
                          <span style={{ color: '#10B981', fontSize: '0.875rem' }}>Yes</span>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>No</span>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleOpenModal(item)}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: 'transparent',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              color: '#6B7280',
                              cursor: 'pointer'
                            }}
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            style={{
                              padding: '0.375rem',
                              backgroundColor: 'transparent',
                              border: '1px solid #D1D5DB',
                              borderRadius: '0.375rem',
                              color: '#DC2626',
                              cursor: 'pointer'
                            }}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Item Modal */}
      {showItemModal && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Item Code */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Item Code *
                </label>
                <input
                  type="text"
                  value={formData.item_code}
                  onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="e.g., LAB-001"
                />
              </div>

              {/* Item Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Item Name *
                </label>
                <input
                  type="text"
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="e.g., Standard Labor Rate"
                />
              </div>

              {/* Category and Type Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Category *
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: parseInt(e.target.value) })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Item Type *
                  </label>
                  <select
                    value={formData.item_type}
                    onChange={(e) => setFormData({ ...formData, item_type: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="labor">Labor</option>
                    <option value="material">Material</option>
                    <option value="equipment">Equipment</option>
                    <option value="service">Service</option>
                    <option value="fee">Fee</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                  placeholder="Optional description"
                />
              </div>

              {/* Unit of Measure */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Unit of Measure *
                </label>
                <input
                  type="text"
                  value={formData.unit_of_measure}
                  onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem'
                  }}
                  placeholder="e.g., EA, HR, LB"
                />
              </div>

              {/* Pricing Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Unit Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Markup (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.markup_percent}
                    onChange={(e) => handleMarkupChange(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '0.625rem 0.75rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div style={{ display: 'flex', gap: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_taxable}
                    onChange={(e) => setFormData({ ...formData, is_taxable: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Taxable
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  Active
                </label>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.75rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                  placeholder="Internal notes"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowItemModal(false)}
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
                onClick={handleSaveItem}
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
                {editingItem ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricebookManagement;
