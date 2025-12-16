// WebSocket Connection Manager with Singleton Pattern
// File: frontend/servicesync-frontend/src/services/websocketManager.ts

import io from 'socket.io-client';

// Define Socket type to avoid TypeScript issues
type Socket = ReturnType<typeof io>;

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isIntentionalDisconnect = false;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(url: string = 'http://localhost:5000'): Socket {
    // If already connected, return existing socket
    if (this.socket && this.socket.connected) {
      console.log('✅ Using existing WebSocket connection');
      return this.socket;
    }

    // Clean up any existing socket before creating new one
    if (this.socket) {
      this.disconnect();
    }

    console.log('🔌 Creating new WebSocket connection...');
    
    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true,
      // Add these to prevent connection issues
      forceNew: false,
      multiplex: true
    });

    this.setupEventHandlers();
    return this.socket;
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.isIntentionalDisconnect = false;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket disconnected:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('🔴 WebSocket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('🛑 Max reconnection attempts reached');
        this.socket?.disconnect();
      }
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 WebSocket reconnection attempt', attemptNumber);
    });

    this.socket.on('error', (error: Error) => {
      console.error('🔴 WebSocket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.isIntentionalDisconnect = true;
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 WebSocket disconnected intentionally');
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Subscribe to events
  on(event: string, callback: Function): void {
    this.socket?.on(event, callback);
  }

  // Unsubscribe from events
  off(event: string, callback?: Function): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
      this.socket?.off(event);
    }
  }

  // Emit events
  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }
}

export default WebSocketManager;