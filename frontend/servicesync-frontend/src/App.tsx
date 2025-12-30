import React, { useState, useEffect, useRef } from 'react';
import {
  Home, Search, Settings, Menu, MessageCircle, MapPin, CheckSquare,
  Users, Package, BarChart3, Plus, User, Bell, LogOut, Grid3X3,
  TrendingUp, Clock, AlertTriangle, DollarSign, Calendar, Wrench
} from 'lucide-react';

import { useAuth } from './contexts/AuthContext';

// Import unified types
import {
  WorkOrder,
  Technician,
  AppUser,
  DashboardWidget,
  DashboardStats
} from './types';


// Import your existing components
import ICUDispatchBoard from './components/ICUDispatchBoard';
import NewWorkOrderModal from './components/NewWorkOrderModal';
import CustomerManagement from './components/CustomerManagement';
import MapPage from './components/MapPage';
import WorkOrderDetails from './components/WorkOrderDetails';

const ServiceSync = () => {
  const auth = useAuth();

  // State management
  const [currentView, setCurrentView] = useState('dispatch'); // Start with dispatch view
  const [currentTime, setCurrentTime] = useState(new Date());
  const [apiStatus, setApiStatus] = useState('Checking...');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);
  const [showNewWorkOrderModal, setShowNewWorkOrderModal] = useState(false);
  const [webSocketStatus, setWebSocketStatus] = useState('Disconnected');
  
  // Work Order Details Modal State
  const [workOrderDetailsModal, setWorkOrderDetailsModal] = useState<{
    isOpen: boolean;
    workOrder: WorkOrder | null;
  }>({
    isOpen: false,
    workOrder: null
  });
  
  // Data states
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [unassignedWorkOrders, setUnassignedWorkOrders] = useState<WorkOrder[]>([]);
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidget[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_work_orders: 9,
    in_progress: 1,
    high_priority: 3,
    overtime_calls: 2,
    completed_today: 5,
    revenue_today: 2485.50,
    avg_response_time: '23 min'
  });

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Navigation configuration
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, color: '#3b82f6' },
    { id: 'dispatch', label: 'Dispatch', icon: Menu, color: '#059669' },
    { id: 'map', label: 'Map', icon: MapPin, color: '#dc2626' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, color: '#7c3aed' },
    { id: 'customers', label: 'Customers', icon: Users, color: '#ea580c' },
    { id: 'find', label: 'Find', icon: Search, color: '#0891b2' },
    { id: 'inventory', label: 'Inventory', icon: Package, color: '#65a30d' },
    { id: 'reports', label: 'Reports', icon: BarChart3, color: '#be123c' }
  ];

  // Available dashboard widgets
  const availableWidgets = [
    { id: 'work-order-stats', title: 'Work Order Stats', type: 'stats' as const, source: 'api', size: 'medium' as const },
    { id: 'technician-status', title: 'Technician Status', type: 'list' as const, source: 'api', size: 'large' as const },
    { id: 'priority-calls', title: 'Priority Calls', type: 'list' as const, source: 'api', size: 'medium' as const },
    { id: 'revenue-chart', title: 'Revenue Chart', type: 'chart' as const, source: 'api', size: 'large' as const },
    { id: 'service-map', title: 'Service Map', type: 'map' as const, source: 'gps', size: 'large' as const }
  ];

  // Universal Work Order Modal Functions
  const openWorkOrderDetails = (workOrder: WorkOrder) => {
    console.log('Opening work order details for:', workOrder.wo_number);
    setWorkOrderDetailsModal({
      isOpen: true,
      workOrder: workOrder
    });
  };

  const closeWorkOrderDetails = () => {
    setWorkOrderDetailsModal({
      isOpen: false,
      workOrder: null
    });
  };

  const handleWorkOrderUpdate = (updatedWorkOrder: WorkOrder) => {
    console.log('Work order updated:', updatedWorkOrder);
    
    // Update the modal with the latest data
    setWorkOrderDetailsModal(prev => ({
      ...prev,
      workOrder: updatedWorkOrder
    }));
    
    // Trigger refresh of any components that might be showing this work order
    loadUnassignedWorkOrders();
  };

  // Time update effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // API status check
  useEffect(() => {
    const checkAPI = async () => {
      const endpoints = [
        'http://localhost:5000/api/technicians',
        'http://localhost:5000/api/work-orders',
        'http://localhost:5000/api/customers'
      ];
      
      let workingEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            workingEndpoints++;
          }
        } catch (error) {
          console.log(`API endpoint ${endpoint} not available:`, error);
        }
      }
      
      setApiStatus(workingEndpoints === endpoints.length ? 'Connected' : 
                   workingEndpoints > 0 ? 'Partial' : 'Disconnected');
    };
    
    checkAPI();
    const interval = setInterval(checkAPI, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load user's dashboard preferences
  useEffect(() => {
    if (auth.user) {
      const savedWidgets = localStorage.getItem(`dashboard_widgets_${auth.user.id}`);
      if (savedWidgets) {
        setDashboardWidgets(JSON.parse(savedWidgets));
      }
    }
  }, [auth.user]);

  // Load technicians
  const loadTechnicians = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/technicians');
      if (response.ok) {
        const data = await response.json();
        const transformedTechnicians: Technician[] = data.map((tech: any) => ({
          id: tech.id || tech.tech_id || 0,
          tech_id: tech.tech_id || tech.id || 0,
          first_name: tech.first_name,
          last_name: tech.last_name,
          phone: tech.phone,
          crew: tech.crew,
          skills: tech.skills || [],
          van_number: tech.van_number,
          current_location: tech.current_location,
          work_orders: tech.work_orders || [],
          profile_image: tech.profile_image
        }));
        setTechnicians(transformedTechnicians);
      }
    } catch (error) {
      console.error('Failed to load technicians:', error);
    }
  };

  // Load unassigned work orders
  const loadUnassignedWorkOrders = async () => {
  try {
    // Use the dispatch board endpoint to get unassigned work orders
    const response = await fetch('http://localhost:5000/api/dispatch/board');
    if (response.ok) {
      const data = await response.json();
      // The unassigned work orders are in the 'unassigned' property
      setUnassignedWorkOrders(data.unassigned || []);
    }
  } catch (error) {
    console.error('Failed to load unassigned work orders:', error);
  }
};

  // Load initial data
  useEffect(() => {
    loadTechnicians();
    loadUnassignedWorkOrders();
  }, []);

  // Handle user menu clicks
  const handleUserMenuClick = (action: string) => {
    console.log('User menu action:', action);
    setShowUserMenu(false);

    if (action === 'logout') {
      auth.logout();
    }
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      await auth.login(username, password);
    } catch (error: any) {
      setLoginError(error.message || 'Login failed');
    }
  };

  // Handle work order creation
// Handle work order creation
const handleNewWorkOrder = async (workOrderData: any) => {
  // The work order was already created by the modal
  // Just handle the UI updates
  console.log('Work order created:', workOrderData);
  setShowNewWorkOrderModal(false);
  loadUnassignedWorkOrders();
  setCurrentView('dispatch');
  
  // TRIGGER DISPATCH BOARD REFRESH - 
  window.dispatchEvent(new CustomEvent('workOrderCreated', { detail: workOrderData }));
};

  // Handle WebSocket status updates
  const handleSocketStatusChange = (status: string) => {
    setWebSocketStatus(status);
  };

  // Widget management
  const addWidget = (widgetType: any) => {
    const newWidget: DashboardWidget = {
      ...widgetType,
      id: `${widgetType.id}_${Date.now()}`,
      position: { x: dashboardWidgets.length * 200, y: 0 }
    };
    
    const updatedWidgets = [...dashboardWidgets, newWidget];
    setDashboardWidgets(updatedWidgets);

    if (auth.user) {
      localStorage.setItem(`dashboard_widgets_${auth.user.id}`, JSON.stringify(updatedWidgets));
    }
    
    setShowWidgetSelector(false);
  };

  const removeWidget = (widgetId: string) => {
    const updatedWidgets = dashboardWidgets.filter(w => w.id !== widgetId);
    setDashboardWidgets(updatedWidgets);

    if (auth.user) {
      localStorage.setItem(`dashboard_widgets_${auth.user.id}`, JSON.stringify(updatedWidgets));
    }
  };

  // Render dashboard widget
  const renderWidget = (widget: DashboardWidget) => {
    const baseStyle = {
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)', // FANCY: Updated box shadow for lift
      minHeight: '250px',
      minWidth: widget.size === 'small' ? '300px' : widget.size === 'large' ? '600px' : '450px',
      position: 'relative' as const
    };

    return (
      <div key={widget.id} style={baseStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
            {widget.title}
          </h3>
          <button
            onClick={() => removeWidget(widget.id)}
            style={{
              padding: '0.25rem',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              borderRadius: '0.25rem'
            }}
          >
            ×
          </button>
        </div>
        
        {widget.type === 'stats' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {Object.entries(dashboardStats).map(([key, value]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                 {String(typeof value === 'number' ? (key.includes('revenue') ? `$${value.toLocaleString()}` : value) : value)}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'capitalize' }}>
                  {key.replace(/_/g, ' ')}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {widget.type === 'list' && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', paddingTop: '2rem' }}>
            {widget.title} will display here
          </div>
        )}
        
        {widget.type === 'chart' && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', paddingTop: '2rem' }}>
            Chart visualization will display here
          </div>
        )}
        
        {widget.type === 'map' && (
          <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', paddingTop: '2rem' }}>
            Map integration will display here
          </div>
        )}
      </div>
    );
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!auth.isAuthenticated) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f3f4f6'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937', textAlign: 'center' }}>
            ServiceSync
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
            Work Order Management System
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem'
                }}
              />
            </div>

            {loginError && (
              <div style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#F9FAFB', // FANCY: Lighter main background
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif' // FANCY: Modern font stack
    }}>
      {/* HEADER DESIGN */}
      <header style={{
        backgroundColor: '#1F2937', // FANCY: Deep Charcoal/Navy
        color: '#e5e7eb', // FANCY: Light text color
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)' // FANCY: Deeper header shadow for depth
      }}>
        {/* Top row with logo, time, and status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
          borderBottom: '1px solid #374151' // FANCY: Darker border line
        }}>
          {/* Logo with ORANGE WRENCH ICON */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Orange wrench square icon */}
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#ffb350ff', // FANCY: Safety Orange background
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}>
              <Wrench style={{ color: '#1F2937', fontSize: '1.5rem' }} size={24} /> 
            </div>
            
            <div>
              <h1 style={{
                fontSize: '1.75rem',
                fontWeight: '700',
                color: 'white',
                margin: 0
              }}>
                ServiceSync
              </h1>
              <p style={{
                fontSize: '0.875rem',
                color: '#9CA3AF', // Muted light gray
                margin: 0
              }}>
                ICU Mechanical
              </p>
            </div>
          </div>

          {/* Status and time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            {/* Current Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} style={{ color: '#9CA3AF' }} />
              <span style={{ fontSize: '0.875rem', color: '#E5E7EB' }}>
                {currentTime.toLocaleString()}
              </span>
            </div>

            {/* API Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: apiStatus === 'Connected' ? '#10b981' : '#ef4444'
              }} />
              <span style={{ fontSize: '0.875rem', color: '#E5E7EB' }}>
                API: {apiStatus}
              </span>
            </div>

            {/* WebSocket Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: webSocketStatus === 'Connected' ? '#10b981' : '#ef4444'
              }} />
              <span style={{ fontSize: '0.875rem', color: '#E5E7EB' }}>
                WebSocket: {webSocketStatus}
              </span>
            </div>

            {/* User Menu */}
            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '9999px', // FANCY: Pill shape for button
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'white',
                  transition: 'background-color 0.2s ease' // FANCY: Add transition
                }}
              >
                <User size={16} />
                {auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : 'User'}
              </button>
              
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '200px'
                }}>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>
                      {auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : 'User'}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                      {auth.user?.role}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUserMenuClick('logout')}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#dc2626',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem' // FANCY: Increased padding
        }}>
          {/* Navigation tabs */}
          <nav style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}> {/* FANCY: Increased gap */}
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: currentView === item.id ? 'transparent' : 'transparent', // FANCY: Remove background color on active tab
                  color: 'white',
                  border: 'none', // FANCY: Remove border 
                  borderBottom: currentView === item.id ? '3px solid #3B82F6' : '3px solid transparent', // FANCY: Blue underline for active tab
                  borderRadius: '0', // FANCY: Remove border radius for underline effect
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  paddingBottom: '0.75rem' // FANCY: Add space for the bottom border
                }}
                onMouseEnter={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.color = '#BFDBFE'; // FANCY: Light hover color
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== item.id) {
                    e.currentTarget.style.color = 'white';
                  }
                }}
              >
                <item.icon size={16} style={{ color: currentView === item.id ? '#3B82F6' : 'white' }} /> {/* FANCY: Blue icon on active tab */}
                {item.label}
              </button>
            ))}
          </nav>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => setShowNewWorkOrderModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#3B82F6', // FANCY: ICU Blue
                color: 'white', // FANCY: White text
                padding: '0.6rem 1.25rem', // FANCY: Slightly larger padding
                border: 'none',
                borderRadius: '9999px', // FANCY: Pill shape
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                boxShadow: '0 4px 8px rgba(59, 130, 246, 0.3)', // FANCY: Shadow that matches the button color
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563EB'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3B82F6'; }}
            >
              <Plus size={16} />
              New Work Order
            </button>

            {currentView === 'dashboard' && (
              <button
                onClick={() => setShowWidgetSelector(true)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  color: '#bfdbfe',
                  transition: 'background-color 0.2s ease' // FANCY: Add transition
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)' }}
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main style={{ padding: '2rem' }}>
        {currentView === 'dashboard' && (
          <div>
            {/* Dashboard Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.5rem', // FANCY: Increased gap
              marginBottom: '3rem' // FANCY: Increased margin for better separation
            }}>
              {Object.entries(dashboardStats).slice(0, 4).map(([key, value]) => (
                <div key={key} style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #e5e7eb', // FANCY: Use a subtle border instead of the dark one
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)' // FANCY: Light shadow for lift
                }}>
                  <div style={{ 
                    fontSize: '2rem', 
                    fontWeight: '700', 
                    color: '#1f2937',
                    marginBottom: '0.5rem'
                  }}>
                    {typeof value === 'number' ? (key.includes('revenue') ? `$${value.toLocaleString()}` : value) : value}
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#6b7280',
                    textTransform: 'capitalize'
                  }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
            </div>

            {/* Dashboard Widgets */}
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}>
              {dashboardWidgets.map(widget => renderWidget(widget))}
            </div>

            {/* Empty State */}
            {dashboardWidgets.length === 0 && (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '3rem',
                textAlign: 'center',
                border: '1px solid #e5e7eb',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)' // FANCY: Light shadow for lift
              }}>
                <Grid3X3 size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
                  No widgets configured
                </h3>
                <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
                  Add widgets to customize your dashboard
                </p>
                <button
                  onClick={() => setShowWidgetSelector(true)}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Add Widget
                </button>
              </div>
            )}
          </div>
        )}

        {currentView === 'dispatch' && (
          <ICUDispatchBoard 
            onSocketStatusChange={handleSocketStatusChange}
            onOpenWorkOrder={openWorkOrderDetails}
          />
        )}

        {currentView === 'customers' && (
          <CustomerManagement 
            onOpenWorkOrder={openWorkOrderDetails}
          />
        )}

        {currentView === 'map' && (
          <MapPage />
        )}

        {/* Other views with coming soon messages */}
        {/* ... (The other views are unchanged, but will benefit from the new background) ... */}
        {currentView === 'find' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
          }}>
            <Search size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Search & Find
            </h3>
            <p style={{ color: '#6b7280' }}>
              Advanced search functionality coming soon
            </p>
          </div>
        )}

        {currentView === 'tasks' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
          }}>
            <CheckSquare size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Task Management
            </h3>
            <p style={{ color: '#6b7280' }}>
              Task tracking and management coming soon
            </p>
          </div>
        )}

        {currentView === 'inventory' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
          }}>
            <Package size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Inventory Management
            </h3>
            <p style={{ color: '#6b7280' }}>
              Parts and inventory tracking coming soon
            </p>
          </div>
        )}

        {currentView === 'reports' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)',
            textAlign: 'center'
          }}>
            <BarChart3 size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Reports & Analytics
            </h3>
            <p style={{ color: '#6b7280' }}>
              Advanced reporting and analytics coming soon
            </p>
          </div>
        )}
      </main>
      
      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        // ... (Modal remains largely the same, but inherits the new font)
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            padding: '2rem',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Add Widget
              </h3>
              <button
                onClick={() => setShowWidgetSelector(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.25rem'
                }}
              >
                ×
              </button>s
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {availableWidgets.map(widget => (
                <div
                  key={widget.id}
                  onClick={() => addWidget(widget)}
                  style={{
                    padding: '1.5rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <h4 style={{ fontSize: '1rem', fontWeight: '500', color: '#1f2937', marginBottom: '0.5rem' }}>
                    {widget.title}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                    {widget.type === 'stats' && 'Display key metrics and statistics'}
                    {widget.type === 'chart' && 'Show data in chart format'}
                    {widget.type === 'list' && 'Display items in list format'}
                    {widget.type === 'map' && 'Show geographical data'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Work Order Modal */}
      {showNewWorkOrderModal && (
        <NewWorkOrderModal
          isOpen={showNewWorkOrderModal}
          onClose={() => setShowNewWorkOrderModal(false)}
          onSave={handleNewWorkOrder}
          technicians={technicians}
        />
      )}

      {/* Universal Work Order Details Modal */}
      {workOrderDetailsModal.isOpen && workOrderDetailsModal.workOrder && (
        <WorkOrderDetails
          workOrder={workOrderDetailsModal.workOrder}
          isOpen={workOrderDetailsModal.isOpen}
          onClose={closeWorkOrderDetails}
          onUpdate={handleWorkOrderUpdate}
        />
      )}
    </div>
  );
};

export default ServiceSync;