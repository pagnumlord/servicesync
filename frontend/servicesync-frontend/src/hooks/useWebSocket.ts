// Custom WebSocket Hook
// File: frontend/servicesync-frontend/src/hooks/useWebSocket.ts

import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import WebSocketManager from '../services/websocketManager';

// Define Socket type to avoid TypeScript issues
type Socket = ReturnType<typeof io>;

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  events?: {
    [key: string]: (data: any) => void;
  };
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionStatus: 'Connected' | 'Disconnected' | 'Connecting' | 'Error';
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): UseWebSocketReturn => {
  const {
    url = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000',
    autoConnect = true,
    events = {}
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'Connected' | 'Disconnected' | 'Connecting' | 'Error'>('Disconnected');
  const wsManager = useRef(WebSocketManager.getInstance());
  const socketRef = useRef<Socket | null>(null);

  // Connect to WebSocket
  const connect = useCallback(() => {
    console.log('🔌 Attempting to connect to WebSocket...');
    setConnectionStatus('Connecting');
    
    const socket = wsManager.current.connect(url);
    socketRef.current = socket;

    // Setup connection status handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setConnectionStatus('Error');
    });

    // Register custom event handlers
    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return socket;
  }, [url, events]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    wsManager.current.disconnect();
    setIsConnected(false);
    setConnectionStatus('Disconnected');
    socketRef.current = null;
  }, []);

  // Emit event
  const emit = useCallback((event: string, data?: any) => {
    wsManager.current.emit(event, data);
  }, []);

  // Subscribe to event
  const on = useCallback((event: string, callback: Function) => {
    wsManager.current.on(event, callback);
  }, []);

  // Unsubscribe from event
  const off = useCallback((event: string, callback?: Function) => {
    wsManager.current.off(event, callback);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      // Only disconnect if this is the last component using the connection
      // This prevents disconnection when switching between views
      if (socketRef.current && socketRef.current.listeners('workOrderUpdate').length <= 1) {
        console.log('🔌 Last component unmounting, keeping connection alive for next view');
      }
    };
  }, [autoConnect]); // Only run on mount/unmount

  return {
    socket: socketRef.current,
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    emit,
    on,
    off
  };
};