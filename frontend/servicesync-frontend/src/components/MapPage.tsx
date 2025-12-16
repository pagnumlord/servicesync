import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin, Navigation, Settings, Plus, Save, X,
  Users, Truck, Eye, EyeOff, Trash2, RefreshCw,
  Circle, Square, AlertTriangle, Clock, Zap, Edit
} from 'lucide-react';

// TypeScript interfaces
interface Coordinate {
  lat: number;
  lng: number;
}

interface Zone {
  id: string;
  zone_code?: string; // API field
  name: string;
  color: string;
  coordinates: Coordinate[];
  boundary?: Coordinate[]; // API field
  visible: boolean;
  is_active?: boolean; // API field
  visible_on_map?: boolean; // API field
  customerCount?: number;
  description?: string;
}

interface Technician {
  id: number;
  name: string;
  lat: number;
  lng: number;
  crew: string;
  van: string;
  status: 'Available' | 'On Route' | 'At Job' | 'Offline';
  lastUpdate: Date;
  currentWorkOrder?: string;
}

interface WorkOrder {
  id: number;
  wo_number: string;
  customer: string;
  lat: number;
  lng: number;
  priority: 'Emergency' | 'High' | 'Normal' | 'Low';
  status: 'Open' | 'Assigned' | 'In Progress' | 'Completed';
  equipment_type?: string;
  assigned_tech?: string;
}

interface MapStats {
  activeTechs: number;
  openWorkOrders: number;
  emergencyCalls: number;
  gpsStatus: 'Connected' | 'Disconnected' | 'Error';
  lastUpdated: Date;
}

// Mock data
const mockTechnicians: Technician[] = [
  { 
    id: 1, 
    name: 'Adam Bentley', 
    lat: 40.4173, 
    lng: -86.8753, 
    crew: 'Hot Side', 
    van: 'V-01', 
    status: 'On Route',
    lastUpdate: new Date(),
    currentWorkOrder: 'WO-27182'
  },
  { 
    id: 2, 
    name: 'Bailey Brown', 
    lat: 40.4259, 
    lng: -86.9081, 
    crew: 'Refrigeration', 
    van: 'V-02', 
    status: 'At Job',
    lastUpdate: new Date(),
    currentWorkOrder: 'WO-27183'
  },
  { 
    id: 3, 
    name: 'Chris O\'Toole', 
    lat: 40.4086, 
    lng: -86.8998, 
    crew: 'PM Team', 
    van: 'V-03', 
    status: 'Available',
    lastUpdate: new Date()
  }
];

const mockWorkOrders: WorkOrder[] = [
  { 
    id: 1, 
    wo_number: 'WO-27182',
    customer: 'McDonald\'s - Creasy', 
    lat: 40.4206, 
    lng: -86.8753, 
    priority: 'High', 
    status: 'Assigned',
    equipment_type: 'Fryer',
    assigned_tech: 'Adam Bentley'
  },
  { 
    id: 2, 
    wo_number: 'WO-27183',
    customer: 'IU Health Arnett', 
    lat: 40.4173, 
    lng: -86.8953, 
    priority: 'Normal', 
    status: 'In Progress',
    equipment_type: 'Walk-in Cooler',
    assigned_tech: 'Bailey Brown'
  },
  { 
    id: 3, 
    wo_number: 'WO-27184',
    customer: 'Purdue Memorial Union', 
    lat: 40.4237, 
    lng: -86.9212, 
    priority: 'Emergency', 
    status: 'Open',
    equipment_type: 'Dishwasher'
  }
];

// API Configuration
const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

// Simple Google Maps hook
const useGoogleMaps = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    // Create new script
    const script = document.createElement('script');
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      setIsError(true);
      return;
    }

    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoaded(true);
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setIsError(true);
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      const scriptToRemove = document.querySelector('script[src*="maps.googleapis.com"]');
      if (scriptToRemove && scriptToRemove.parentNode) {
        scriptToRemove.parentNode.removeChild(scriptToRemove);
      }
    };
  }, []);

  return { isLoaded, isError };
};

// Google Maps Component
const GoogleMapComponent: React.FC<{
  center: Coordinate;
  zoom: number;
  zones: Zone[];
  technicians: Technician[];
  workOrders: WorkOrder[];
  isDrawing: boolean;
  showTechnicians: boolean;
  showWorkOrders: boolean;
  activeMode: 'zone' | 'gps';
  currentZone: Zone | null;
  onMapClick: (lat: number, lng: number) => void;
}> = ({ 
  center, 
  zoom, 
  zones, 
  technicians, 
  workOrders, 
  isDrawing, 
  showTechnicians, 
  showWorkOrders, 
  activeMode,
  currentZone,
  onMapClick 
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [currentZoneMarkers, setCurrentZoneMarkers] = useState<any[]>([]);

  // Handle current zone drawing visualization
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps || !currentZone) {
      // Clear current zone markers
      currentZoneMarkers.forEach(marker => marker.setMap(null));
      setCurrentZoneMarkers([]);
      return;
    }

    // Clear previous markers
    currentZoneMarkers.forEach(marker => marker.setMap(null));
    const newMarkers: any[] = [];

    // Add point markers for current zone
    currentZone.coordinates.forEach((coord: Coordinate, index: number) => {
      const marker = new window.google.maps.Marker({
        position: { lat: coord.lat, lng: coord.lng },
        map: mapInstanceRef.current,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: currentZone.color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        title: `Point ${index + 1}`,
        zIndex: 1000
      });

      newMarkers.push(marker);
    });

    // Draw preview polygon if we have enough points
    if (currentZone.coordinates.length >= 3) {
      const polygon = new window.google.maps.Polygon({
        paths: currentZone.coordinates,
        strokeColor: currentZone.color,
        strokeOpacity: 0.8,
        strokeWeight: 3,
        fillColor: currentZone.color,
        fillOpacity: 0.2,
        map: mapInstanceRef.current
      });
      newMarkers.push(polygon);
    }

    // Draw lines connecting points
    if (currentZone.coordinates.length >= 2) {
      const polyline = new window.google.maps.Polyline({
        path: currentZone.coordinates,
        geodesic: true,
        strokeColor: currentZone.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        map: mapInstanceRef.current
      });
      newMarkers.push(polyline);
    }

    setCurrentZoneMarkers(newMarkers);
  }, [currentZone]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps || mapInstanceRef.current) return;

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center,
      zoom,
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'simplified' }]
        }
      ]
    });

    // Enhanced map click listener for zone drawing
    mapInstance.addListener('click', (e: any) => {
      if (isDrawing && e.latLng && activeMode === 'zone') {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        console.log('Map clicked for zone drawing:', { lat, lng, isDrawing, activeMode });
        onMapClick(lat, lng);
      }
    });

    mapInstanceRef.current = mapInstance;
  }, [center, zoom, isDrawing, activeMode, onMapClick]);

  // Update markers - ONLY TECHNICIANS, NO WORK ORDER PINS
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const newMarkers: any[] = [];

    // Add ONLY technician markers (no work order pins)
    if (activeMode === 'gps' && showTechnicians) {
      technicians.forEach(tech => {
        const getCrewColor = (crew: string) => {
          const colors: Record<string, string> = {
            'Hot Side': '#ef4444',
            'Refrigeration': '#3b82f6',
            'PM Team': '#10b981',
            'Project Crew': '#f59e0b'
          };
          return colors[crew] || '#6b7280';
        };

        const getStatusColor = (status: string) => {
          const colors: Record<string, string> = {
            'Available': '#10b981',
            'On Route': '#f59e0b',
            'At Job': '#ef4444',
            'Offline': '#6b7280'
          };
          return colors[status] || '#6b7280';
        };

        // Main technician marker (van icon)
        const marker = new window.google.maps.Marker({
          position: { lat: tech.lat, lng: tech.lng },
          map: mapInstanceRef.current,
          title: `${tech.name} - ${tech.status}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 14,
            fillColor: getCrewColor(tech.crew),
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        // Status indicator (small dot)
        const statusMarker = new window.google.maps.Marker({
          position: { lat: tech.lat + 0.0008, lng: tech.lng + 0.0008 },
          map: mapInstanceRef.current,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: getStatusColor(tech.status),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });

        // Enhanced info window with work order details
        const infoContent = `
          <div style="padding: 16px; min-width: 280px; font-family: 'Inter', sans-serif;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <div style="width: 12px; height: 12px; background-color: ${getCrewColor(tech.crew)}; border-radius: 50%;"></div>
              <div style="font-weight: 600; font-size: 16px; color: #1f2937;">${tech.name}</div>
            </div>
            
            <div style="margin-bottom: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">Van</div>
                  <div style="font-weight: 500; color: #374151;">${tech.van}</div>
                </div>
                <div>
                  <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">Status</div>
                  <div style="color: ${getStatusColor(tech.status)}; font-weight: 500;">${tech.status}</div>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 8px;">
              <div style="font-size: 12px; color: #6b7280; margin-bottom: 2px;">Crew</div>
              <div style="font-weight: 500; color: #374151;">${tech.crew}</div>
            </div>

            ${tech.currentWorkOrder ? `
              <div style="margin-top: 12px; padding: 12px; background-color: #f8fafc; border-radius: 6px; border-left: 4px solid ${getCrewColor(tech.crew)};">
                <div style="font-size: 14px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">Current Work Order</div>
                <div style="margin-bottom: 4px;">
                  <span style="font-weight: 500; color: #3b82f6; cursor: pointer;" onclick="alert('Navigate to ${tech.currentWorkOrder}')">${tech.currentWorkOrder}</span>
                </div>
                <div style="font-size: 12px; color: #6b7280;">Click WO# to view details</div>
              </div>
            ` : `
              <div style="margin-top: 12px; padding: 12px; background-color: #f0f9ff; border-radius: 6px;">
                <div style="font-size: 14px; color: #0369a1; text-align: center;">No active work order</div>
              </div>
            `}

            <div style="font-size: 11px; color: #9ca3af; margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; text-align: center;">
              📍 ${tech.lat.toFixed(4)}, ${tech.lng.toFixed(4)}<br/>
              🕐 Last update: ${tech.lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        `;

        const infoWindow = new window.google.maps.InfoWindow({
          content: infoContent
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        newMarkers.push(marker, statusMarker);
      });
    }

    setMarkers(newMarkers);
  }, [activeMode, showTechnicians, technicians]); // Removed showWorkOrders and workOrders dependencies

  // Update polygons and drawing markers
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    // Clear existing polygons
    polygons.forEach(polygon => polygon.setMap(null));
    setPolygons([]);

    const newPolygons: any[] = [];

    // Show existing zones
    if (activeMode === 'zone') {
      zones
        .filter(zone => zone.visible && zone.coordinates.length >= 3)
        .forEach(zone => {
          const polygon = new window.google.maps.Polygon({
            paths: zone.coordinates,
            strokeColor: zone.color,
            strokeOpacity: 0.8,
            strokeWeight: 3,
            fillColor: zone.color,
            fillOpacity: 0.15,
            map: mapInstanceRef.current
          });
          newPolygons.push(polygon);

          // Add zone label
          if (zone.coordinates.length > 0) {
            const bounds = new window.google.maps.LatLngBounds();
            zone.coordinates.forEach(coord => {
              bounds.extend(new window.google.maps.LatLng(coord.lat, coord.lng));
            });

            const labelMarker = new window.google.maps.Marker({
              position: bounds.getCenter(),
              map: mapInstanceRef.current,
              icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 0,
                fillOpacity: 0,
                strokeOpacity: 0
              },
              label: {
                text: zone.id,
                color: zone.color,
                fontSize: '18px',
                fontWeight: 'bold'
              }
            });
            newPolygons.push(labelMarker);
          }
        });
    }

    setPolygons(newPolygons);
  }, [activeMode, zones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      markers.forEach(marker => marker.setMap(null));
      polygons.forEach(polygon => polygon.setMap(null));
      currentZoneMarkers.forEach(marker => marker.setMap(null));
    };
  }, [markers, polygons, currentZoneMarkers]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        backgroundColor: '#f3f4f6'
      }} 
    />
  );
};

// Main Map Page Component
const MapPage: React.FC = () => {
  const { isLoaded, isError } = useGoogleMaps();
  const [activeMode, setActiveMode] = useState<'zone' | 'gps'>('gps');
  const [zones, setZones] = useState<Zone[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZone, setCurrentZone] = useState<Zone | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>(mockTechnicians);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(mockWorkOrders);
  const [showTechnicians, setShowTechnicians] = useState(true);
  const [showWorkOrders, setShowWorkOrders] = useState(true);
  const [showZonePanel, setShowZonePanel] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; color: string; description: string }>({
    name: '',
    color: '',
    description: ''
  });
  const [mapStats, setMapStats] = useState<MapStats>({
    activeTechs: 3,
    openWorkOrders: 1,
    emergencyCalls: 1,
    gpsStatus: 'Connected',
    lastUpdated: new Date()
  });

  const [mapCenter] = useState<Coordinate>({ lat: 40.4173, lng: -86.8753 });
  const [mapZoom] = useState(13);
  const zoneColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Fetch zones from API
  const fetchZones = useCallback(async () => {
    setIsLoadingZones(true);
    try {
      const response = await fetch(`${API_BASE}/api/zones`);
      if (!response.ok) throw new Error('Failed to fetch zones');
      const apiZones = await response.json();

      // Convert API format to UI format
      const convertedZones: Zone[] = apiZones.map((zone: any) => ({
        id: zone.zone_code,
        zone_code: zone.zone_code,
        name: zone.name,
        color: zone.color,
        coordinates: zone.boundary, // API uses 'boundary' field
        boundary: zone.boundary,
        visible: zone.visible_on_map !== false,
        is_active: zone.is_active,
        visible_on_map: zone.visible_on_map,
        description: zone.description
      }));

      setZones(convertedZones);

      // Fetch zone statistics for customer counts
      const statsResponse = await fetch(`${API_BASE}/api/zones/statistics`);
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setZones(prev => prev.map(zone => {
          const zoneStat = stats.find((s: any) => s.zone_code === zone.zone_code);
          return zoneStat ? { ...zone, customerCount: zoneStat.customer_count } : zone;
        }));
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
      alert('Failed to load zones. Using default view.');
    } finally {
      setIsLoadingZones(false);
    }
  }, []);

  // Load zones on mount
  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleStartDrawing = useCallback(() => {
    if (zones.length >= 6) {
      alert('Maximum 6 zones allowed (A-F)');
      return;
    }
    
    const newZoneId = String.fromCharCode(65 + zones.length);
    setCurrentZone({
      id: newZoneId,
      name: `Zone ${newZoneId}`,
      color: zoneColors[zones.length % zoneColors.length],
      coordinates: [],
      visible: true
    });
    setIsDrawing(true);
  }, [zones.length, zoneColors]);

  const handleSaveZone = useCallback(async () => {
    if (!currentZone || currentZone.coordinates.length < 3) return;

    try {
      // Prepare zone data for API
      const zoneData = {
        zone_code: currentZone.id,
        name: currentZone.name,
        color: currentZone.color,
        boundary: currentZone.coordinates,
        description: currentZone.description || `Service zone ${currentZone.id}`,
        is_active: true,
        visible_on_map: true
      };

      const response = await fetch(`${API_BASE}/api/zones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zoneData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create zone');
      }

      // Reload zones from API to get updated data
      await fetchZones();
      setCurrentZone(null);
      setIsDrawing(false);
      alert(`Zone ${currentZone.id} created successfully!`);
    } catch (error: any) {
      console.error('Error saving zone:', error);
      alert(`Failed to save zone: ${error.message}`);
    }
  }, [currentZone, fetchZones]);

  const handleCancelDrawing = useCallback(() => {
    setCurrentZone(null);
    setIsDrawing(false);
  }, []);

  const toggleZoneVisibility = useCallback(async (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) return;

    try {
      const response = await fetch(`${API_BASE}/api/zones/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visible_on_map: !zone.visible
        })
      });

      if (!response.ok) throw new Error('Failed to update zone visibility');

      // Update local state optimistically
      setZones(prev => prev.map(z =>
        z.id === zoneId ? { ...z, visible: !z.visible, visible_on_map: !z.visible } : z
      ));
    } catch (error) {
      console.error('Error toggling zone visibility:', error);
      alert('Failed to update zone visibility');
    }
  }, [zones]);

  const deleteZone = useCallback(async (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (!zone || !window.confirm(`Are you sure you want to delete ${zone.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/zones/${zoneId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete zone');
      }

      // Remove from local state
      setZones(prev => prev.filter(z => z.id !== zoneId));
      alert(`Zone ${zone.name} deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting zone:', error);
      alert(`Failed to delete zone: ${error.message}`);
    }
  }, [zones]);

  const handleEditZone = useCallback((zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    if (zone) {
      setEditingZone(zoneId);
      setEditForm({
        name: zone.name,
        color: zone.color,
        description: zone.description || ''
      });
    }
  }, [zones]);

  const handleSaveEdit = useCallback(async (zoneId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/zones/${zoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update zone');
      }

      // Update local state
      setZones(prev => prev.map(z =>
        z.id === zoneId ? { ...z, ...editForm } : z
      ));
      setEditingZone(null);
      alert('Zone updated successfully');
    } catch (error: any) {
      console.error('Error updating zone:', error);
      alert(`Failed to update zone: ${error.message}`);
    }
  }, [editForm]);

  const handleCancelEdit = useCallback(() => {
    setEditingZone(null);
    setEditForm({ name: '', color: '', description: '' });
  }, []);

  // Handle map click for zone drawing
  const handleMapClick = useCallback((lat: number, lng: number) => {
    console.log('handleMapClick called:', { lat, lng, isDrawing, currentZone });
    if (isDrawing && currentZone) {
      const newCoordinate = { lat, lng };
      setCurrentZone(prev => {
        if (!prev) return null;
        console.log('Adding new coordinate:', newCoordinate);
        return {
          ...prev,
          coordinates: [...prev.coordinates, newCoordinate]
        };
      });
    }
  }, [isDrawing, currentZone]);

  // Simulate GPS updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTechnicians(prev => prev.map(tech => ({
        ...tech,
        lat: tech.lat + (Math.random() - 0.5) * 0.0005,
        lng: tech.lng + (Math.random() - 0.5) * 0.0005,
        lastUpdate: new Date()
      })));
      
      setMapStats(prev => ({
        ...prev,
        lastUpdated: new Date()
      }));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8fafc',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '1rem 2rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
            Service Map
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
            Track technicians and manage service zones
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f3f4f6',
          borderRadius: '0.5rem',
          padding: '0.25rem',
          border: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveMode('gps')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeMode === 'gps' ? '#3b82f6' : 'transparent',
              color: activeMode === 'gps' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Navigation style={{ width: '1rem', height: '1rem' }} />
            GPS TRACKING
          </button>
          <button
            onClick={() => setActiveMode('zone')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: activeMode === 'zone' ? '#3b82f6' : 'transparent',
              color: activeMode === 'zone' ? 'white' : '#6b7280',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <Square style={{ width: '1rem', height: '1rem' }} />
            ZONE MANAGEMENT
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {activeMode === 'zone' && (
            <button
              onClick={() => setShowZonePanel(!showZonePanel)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: showZonePanel ? '#6b7280' : '#f3f4f6',
                color: showZonePanel ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              <Settings style={{ width: '1rem', height: '1rem' }} />
              Zone Settings
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.75rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
          >
            <RefreshCw style={{ width: '1rem', height: '1rem' }} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Zone Management Panel */}
        {activeMode === 'zone' && showZonePanel && (
          <div style={{
            width: '350px',
            backgroundColor: 'white',
            borderRight: '1px solid #e5e7eb',
            padding: '1.5rem',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, color: '#1f2937' }}>Zone Management</h2>
              <button
                onClick={() => setShowZonePanel(false)}
                style={{
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X style={{ width: '1.25rem', height: '1.25rem' }} />
              </button>
            </div>

            {/* Drawing Controls */}
            {!isDrawing && (
              <button
                onClick={handleStartDrawing}
                disabled={zones.length >= 6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: zones.length >= 6 ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: zones.length >= 6 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginBottom: '1.5rem'
                }}
              >
                <Plus style={{ width: '1rem', height: '1rem' }} />
                Draw New Zone {zones.length >= 6 && '(Max 6)'}
              </button>
            )}

            {isDrawing && currentZone && (
              <div style={{
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                borderRadius: '0.5rem',
                border: '1px solid #0ea5e9',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem', color: '#0369a1' }}>
                  Drawing: {currentZone.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#0369a1', marginBottom: '1rem', lineHeight: '1.4' }}>
                  Click on the map to add boundary points.<br/>
                  Points: {currentZone.coordinates.length}/3+ required
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={handleSaveZone}
                    disabled={currentZone.coordinates.length < 3}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: currentZone.coordinates.length < 3 ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: currentZone.coordinates.length < 3 ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Save style={{ width: '0.875rem', height: '0.875rem' }} />
                    Save
                  </button>
                  <button
                    onClick={handleCancelDrawing}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <X style={{ width: '0.875rem', height: '0.875rem' }} />
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Existing Zones */}
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '1rem', color: '#1f2937' }}>
                Existing Zones ({zones.length}/6)
              </h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {zones.map(zone => (
                  <div key={zone.id} style={{
                    padding: '1rem',
                    backgroundColor: editingZone === zone.id ? '#f0f9ff' : '#f9fafb',
                    borderRadius: '0.5rem',
                    border: editingZone === zone.id ? '1px solid #0ea5e9' : '1px solid #e5e7eb'
                  }}>
                    {editingZone === zone.id ? (
                      // Edit Mode
                      <div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Zone Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Zone Color</label>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="color"
                              value={editForm.color}
                              onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                              style={{
                                width: '3rem',
                                height: '2.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                cursor: 'pointer'
                              }}
                            />
                            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{editForm.color}</span>
                          </div>
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Description (optional)</label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              fontSize: '0.875rem',
                              border: '1px solid #d1d5db',
                              borderRadius: '0.375rem'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleSaveEdit(zone.id)}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Save style={{ width: '0.875rem', height: '0.875rem' }} />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              flex: 1,
                              padding: '0.5rem',
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '0.375rem',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{
                              width: '1rem',
                              height: '1rem',
                              backgroundColor: zone.color,
                              borderRadius: '0.25rem'
                            }} />
                            <span style={{ fontWeight: '500', fontSize: '0.875rem', color: '#1f2937' }}>{zone.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleEditZone(zone.id)}
                              style={{
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#3b82f6'
                              }}
                              title="Edit zone"
                            >
                              <Edit style={{ width: '0.875rem', height: '0.875rem' }} />
                            </button>
                            <button
                              onClick={() => toggleZoneVisibility(zone.id)}
                              style={{
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: zone.visible ? '#059669' : '#9ca3af'
                              }}
                              title={zone.visible ? 'Hide zone' : 'Show zone'}
                            >
                              {zone.visible ? <Eye style={{ width: '0.875rem', height: '0.875rem' }} /> : <EyeOff style={{ width: '0.875rem', height: '0.875rem' }} />}
                            </button>
                            <button
                              onClick={() => deleteZone(zone.id)}
                              style={{
                                padding: '0.25rem',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#ef4444'
                              }}
                              title="Delete zone"
                            >
                              <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                            </button>
                          </div>
                        </div>
                        {zone.description && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                            {zone.description}
                          </div>
                        )}
                        {zone.customerCount !== undefined && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {zone.customerCount} customers assigned
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* GPS Tracking Legend */}
          {activeMode === 'gps' && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              zIndex: 1000,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              minWidth: '220px'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: '#1f2937' }}>Live Tracking</h3>
              
              {/* Toggle Controls */}
              <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showTechnicians}
                    onChange={(e) => setShowTechnicians(e.target.checked)}
                    style={{ marginRight: '0.25rem' }}
                  />
                  <Users style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
                  Technicians ({technicians.filter(t => t.status !== 'Offline').length})
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showWorkOrders}
                    onChange={(e) => setShowWorkOrders(e.target.checked)}
                    style={{ marginRight: '0.25rem' }}
                  />
                  <MapPin style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
                  Work Orders ({workOrders.filter(wo => wo.status !== 'Completed').length})
                </label>
              </div>

              {/* Status Legend */}
              <div style={{ fontSize: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Vehicle Status:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                    <span>Available</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#f59e0b', borderRadius: '50%' }} />
                    <span>On Route</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                    <span>At Job</span>
                  </div>
                </div>
                
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>Crew Colors:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                    <span>Hot Side</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
                    <span>Refrigeration</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%' }} />
                    <span>PM Team</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Zone Mode Instructions */}
          {activeMode === 'zone' && (
            <div style={{
              position: 'absolute',
              top: '1rem',
              left: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid #e5e7eb',
              zIndex: 1000,
              maxWidth: '320px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem', color: '#1f2937' }}>Zone Management</h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.4', margin: 0 }}>
                {isDrawing && currentZone ? 
                  `Drawing ${currentZone.name}: Click ${Math.max(0, 3 - currentZone.coordinates.length)} more points to complete the zone boundary.` :
                  'Create service zones to organize technician assignments and optimize route planning. Click "Draw New Zone" to start.'
                }
              </p>
              {isDrawing && currentZone && (
                <div style={{ 
                  marginTop: '0.75rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#f0f9ff', 
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  color: '#0369a1'
                }}>
                  <strong>Progress:</strong> {currentZone.coordinates.length}/3+ points added
                </div>
              )}
            </div>
          )}

          {/* Map Display */}
          {isError ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f3f4f6',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <AlertTriangle style={{ width: '3rem', height: '3rem', color: '#ef4444' }} />
              <div style={{ color: '#6b7280', fontSize: '1rem', textAlign: 'center' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Failed to load Google Maps</div>
                <div style={{ fontSize: '0.875rem' }}>
                  Please check your API key configuration
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Retry
              </button>
            </div>
          ) : !isLoaded ? (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f3f4f6',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <div style={{ color: '#6b7280', fontSize: '1rem', textAlign: 'center' }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Loading Google Maps...</div>
                <div style={{ fontSize: '0.875rem' }}>
                  API Key: {process.env.REACT_APP_GOOGLE_MAPS_API_KEY ? '✅ Configured' : '❌ Missing'}
                </div>
              </div>
              <style>
                {`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          ) : (
            <GoogleMapComponent
              center={mapCenter}
              zoom={mapZoom}
              zones={zones}
              technicians={technicians}
              workOrders={workOrders}
              isDrawing={isDrawing}
              showTechnicians={showTechnicians}
              showWorkOrders={showWorkOrders}
              activeMode={activeMode}
              currentZone={currentZone}
              onMapClick={handleMapClick}
            />
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        position: 'absolute',
        bottom: '1rem',
        left: '1rem',
        right: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '1rem 1.5rem',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '3rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Active Vehicles</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
                {mapStats.activeTechs}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Work Orders Today</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin style={{ width: '1.25rem', height: '1.25rem', color: '#059669' }} />
                {mapStats.openWorkOrders}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Emergency Calls</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle style={{ width: '1.25rem', height: '1.25rem', color: '#dc2626' }} />
                {mapStats.emergencyCalls}
              </div>
            </div>
            {activeMode === 'zone' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Active Zones</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Square style={{ width: '1.25rem', height: '1.25rem', color: '#8b5cf6' }} />
                  {zones.filter(z => z.visible).length}
                </div>
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Maps Status
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: isLoaded ? '#10b981' : isError ? '#ef4444' : '#f59e0b',
                  borderRadius: '50%'
                }} />
                <span style={{ color: isLoaded ? '#10b981' : isError ? '#ef4444' : '#f59e0b' }}>
                  {isLoaded ? 'Connected' : isError ? 'Error' : 'Loading'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
            <div>Last updated: {mapStats.lastUpdated.toLocaleTimeString()}</div>
            <div style={{ marginTop: '0.25rem' }}>
              {isLoaded ? 'Live tracking enabled' : 'Waiting for maps...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPage;