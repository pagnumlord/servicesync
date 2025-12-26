import React, { useState, useEffect } from 'react';
import {
  Plus,
  X,
  Maximize2,
  MapPin,
  Users,
  Package,
  FileText,
  TrendingUp,
  Clock,
  AlertTriangle,
  Grid3X3,
  Search
} from 'lucide-react';

// ================================
// TYPE DEFINITIONS
// ================================

interface DashboardWidget {
  id: string;
  type: 'dispatch' | 'map' | 'queue' | 'inventory' | 'customers' | 'stats';
  title: string;
  queueName?: string; // For queue widgets
  position: { x: number; y: number };
}

interface DashboardProps {
  onNavigate: (view: string) => void;
  userId: number;
}

// ================================
// MINI WIDGET COMPONENTS
// ================================

const DispatchWidget: React.FC = () => {
  const [stats, setStats] = useState({ active: 0, unassigned: 0, partsOrdered: 0 });

  useEffect(() => {
    fetch('http://localhost:5000/api/dispatch/board')
      .then(res => res.json())
      .then(data => {
        setStats({
          active: data.technicians?.length || 0,
          unassigned: data.unassigned?.length || 0,
          partsOrdered: data.partsOrdered?.length || 0
        });
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f3f0e8', borderRadius: '0.5rem', border: '1px solid #C4A96220' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7C3AED' }}>{stats.active}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Active Techs</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#fef9f0', borderRadius: '0.5rem', border: '1px solid #C4A96240' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#C4A962' }}>{stats.unassigned}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unassigned</div>
        </div>
        <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f8f6ff', borderRadius: '0.5rem', border: '1px solid #7C3AED20' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7C3AED' }}>{stats.partsOrdered}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Parts Ordered</div>
        </div>
      </div>
    </div>
  );
};

const QueueWidget: React.FC<{ queueName: string }> = ({ queueName }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/work-orders/queues')
      .then(res => res.json())
      .then(data => {
        const queue = data.find((q: any) => q.name === queueName);
        setCount(queue?.count || 0);
      })
      .catch(console.error);
  }, [queueName]);

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <Grid3X3 style={{ width: '3rem', height: '3rem', color: '#C4A962', margin: '0 auto 0.75rem' }} />
      <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
        {count}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
        Work Orders
      </div>
    </div>
  );
};

const InventoryWidget: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, lowStock: 0 });

  useEffect(() => {
    fetch('http://localhost:5000/api/inventory')
      .then(res => res.json())
      .then(data => {
        setStats({
          total: data.inventory?.length || 0,
          lowStock: data.inventory?.filter((item: any) => item.quantity_in_stock < 5).length || 0
        });
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Package style={{ width: '2rem', height: '2rem', color: '#7C3AED', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Parts</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <AlertTriangle style={{ width: '2rem', height: '2rem', color: '#C4A962', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>{stats.lowStock}</div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Low Stock</div>
        </div>
      </div>
    </div>
  );
};

const CustomersWidget: React.FC = () => {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch('http://localhost:5000/api/customers?limit=1')
      .then(res => res.json())
      .then(data => setTotal(data.total || 0))
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: '1.5rem', textAlign: 'center' }}>
      <Users style={{ width: '3rem', height: '3rem', color: '#7C3AED', margin: '0 auto 0.75rem' }} />
      <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '0.5rem' }}>
        {total.toLocaleString()}
      </div>
      <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
        Total Customers
      </div>
    </div>
  );
};

const MapWidget: React.FC = () => {
  return (
    <div style={{
      padding: '1rem',
      background: 'linear-gradient(135deg, #2D2D2D 0%, #1F2937 100%)',
      borderRadius: '0.5rem',
      color: 'white',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, #C4A962 0%, #7C3AED 100%)'
      }} />
      <MapPin style={{ width: '3rem', height: '3rem', margin: '0 auto 0.75rem', color: '#C4A962' }} />
      <div style={{ fontSize: '1rem', fontWeight: '600' }}>GPS Tracking</div>
      <div style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '0.5rem' }}>
        View technician locations
      </div>
    </div>
  );
};

const StatsWidget: React.FC = () => {
  const [stats, setStats] = useState({ completed: 0, revenue: 0 });

  useEffect(() => {
    // Mock data - replace with real API call
    setStats({ completed: 127, revenue: 45230 });
  }, []);

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', backgroundColor: '#fef9f0', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid #C4A96230' }}>
          <TrendingUp style={{ width: '1.5rem', height: '1.5rem', color: '#C4A962', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#8B7839' }}>
            ${(stats.revenue / 1000).toFixed(1)}k
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Revenue</div>
        </div>
        <div style={{ padding: '1rem', backgroundColor: '#f8f6ff', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid #7C3AED30' }}>
          <Clock style={{ width: '1.5rem', height: '1.5rem', color: '#7C3AED', margin: '0 auto 0.5rem' }} />
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#5B21B6' }}>
            {stats.completed}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Completed</div>
        </div>
      </div>
    </div>
  );
};

// ================================
// MAIN DASHBOARD COMPONENT
// ================================

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, userId }) => {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  // Load user's widget configuration
  useEffect(() => {
    const saved = localStorage.getItem(`dashboard_widgets_${userId}`);
    if (saved) {
      setWidgets(JSON.parse(saved));
    } else {
      // Default widgets
      setWidgets([
        { id: 'dispatch-1', type: 'dispatch', title: 'Dispatch Board', position: { x: 0, y: 0 } },
        { id: 'stats-1', type: 'stats', title: 'Quick Stats', position: { x: 1, y: 0 } }
      ]);
    }
  }, [userId]);

  // Save widget configuration
  const saveWidgets = (newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    localStorage.setItem(`dashboard_widgets_${userId}`, JSON.stringify(newWidgets));
  };

  // Add widget
  const addWidget = (type: DashboardWidget['type'], title: string, queueName?: string) => {
    const newWidget: DashboardWidget = {
      id: `${type}-${Date.now()}`,
      type,
      title,
      queueName,
      position: { x: widgets.length % 3, y: Math.floor(widgets.length / 3) }
    };
    saveWidgets([...widgets, newWidget]);
    setShowWidgetSelector(false);
  };

  // Remove widget
  const removeWidget = (id: string) => {
    saveWidgets(widgets.filter(w => w.id !== id));
  };

  // Navigate to full page
  const handleWidgetClick = (type: string) => {
    const viewMap: Record<string, string> = {
      dispatch: 'dispatch',
      map: 'map',
      queue: 'queues',
      inventory: 'inventory',
      customers: 'customers',
      stats: 'dispatch'
    };
    onNavigate(viewMap[type] || 'dispatch');
  };

  // Render widget content
  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'dispatch':
        return <DispatchWidget />;
      case 'queue':
        return <QueueWidget queueName={widget.queueName || 'Service Call'} />;
      case 'inventory':
        return <InventoryWidget />;
      case 'customers':
        return <CustomersWidget />;
      case 'map':
        return <MapWidget />;
      case 'stats':
        return <StatsWidget />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header - ICU Gold & Purple Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #2D2D2D 0%, #1F2937 50%, #2D2D2D 100%)',
        padding: '3rem 2rem',
        marginBottom: '2rem',
        borderRadius: '1rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Gold accent bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #C4A962 0%, #7C3AED 50%, #C4A962 100%)'
        }} />
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', margin: 0, marginBottom: '0.5rem' }}>
          Welcome to ServiceSync
        </h1>
        <p style={{ fontSize: '1.125rem', opacity: 0.9, margin: 0 }}>
          Your personalized command center
        </p>
      </div>

      {/* Add Widget Button */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
          Your Widgets
        </h2>
        <button
          onClick={() => setShowWidgetSelector(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            background: 'linear-gradient(135deg, #C4A962 0%, #7C3AED 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            boxShadow: '0 4px 6px rgba(196, 169, 98, 0.3)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 12px rgba(196, 169, 98, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(196, 169, 98, 0.3)';
          }}
        >
          <Plus style={{ width: '1rem', height: '1rem' }} />
          Add Widget
        </button>
      </div>

      {/* Widgets Grid */}
      {widgets.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '2px dashed #e5e7eb'
        }}>
          <Grid3X3 style={{ width: '4rem', height: '4rem', color: '#d1d5db', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
            No widgets yet
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Add your first widget to customize your dashboard
          </p>
          <button
            onClick={() => setShowWidgetSelector(true)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #C4A962 0%, #7C3AED 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(196, 169, 98, 0.3)'
            }}
          >
            Get Started
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
          gap: '1.5rem'
        }}>
          {widgets.map(widget => (
            <div
              key={widget.id}
              onClick={() => handleWidgetClick(widget.type)}
              style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 6px rgba(196, 169, 98, 0.1)',
                border: '2px solid transparent',
                backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #C4A962 0%, #7C3AED 100%)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 24px rgba(196, 169, 98, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(196, 169, 98, 0.1)';
              }}
            >
              {/* Widget Header */}
              <div style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#fafafa'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                    {widget.title}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWidgetClick(widget.type);
                    }}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#6366f1'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                    title="Open full view"
                  >
                    <Maximize2 style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWidget(widget.id);
                    }}
                    style={{
                      padding: '0.25rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                    title="Remove widget"
                  >
                    <X style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                </div>
              </div>

              {/* Widget Content */}
              <div onClick={(e) => e.stopPropagation()}>
                {renderWidgetContent(widget)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Widget Selector Modal */}
      {showWidgetSelector && (
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
          padding: '2rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Add Widget
              </h3>
              <button
                onClick={() => setShowWidgetSelector(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X style={{ width: '1.5rem', height: '1.5rem' }} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { type: 'dispatch' as const, title: 'Dispatch Board', icon: FileText, color: '#7C3AED' },
                { type: 'stats' as const, title: 'Quick Stats', icon: TrendingUp, color: '#C4A962' },
                { type: 'customers' as const, title: 'Customers', icon: Users, color: '#7C3AED' },
                { type: 'inventory' as const, title: 'Inventory', icon: Package, color: '#C4A962' },
                { type: 'map' as const, title: 'GPS Tracking', icon: MapPin, color: '#C4A962' },
                { type: 'queue' as const, title: 'Queue View', icon: Grid3X3, color: '#7C3AED' }
              ].map(widget => (
                <button
                  key={widget.type}
                  onClick={() => addWidget(widget.type, widget.title)}
                  style={{
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = widget.color;
                    e.currentTarget.style.backgroundColor = widget.color === '#C4A962' ? '#fef9f0' : '#f8f6ff';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <widget.icon style={{ width: '2.5rem', height: '2.5rem', color: widget.color, margin: '0 auto 0.75rem' }} />
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                    {widget.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
