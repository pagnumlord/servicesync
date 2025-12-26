// useCollaboration - React hook for real-time collaborative editing
// Provides presence tracking, typing indicators, and live field updates

import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

interface Viewer {
  userId: number;
  name: string;
  joinedAt: Date;
}

interface TypingIndicator {
  [fieldName: string]: {
    userId: number;
    userName: string;
  };
}

interface FieldUpdate {
  workOrderId: number;
  fieldName: string;
  value: any;
  userId: number;
  userName: string;
  timestamp: Date;
}

export function useCollaboration(workOrderId: number | null) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator>({});
  const [fieldUpdates, setFieldUpdates] = useState<FieldUpdate[]>([]);
  const typingTimeoutRef = useRef<{ [fieldName: string]: NodeJS.Timeout }>({});

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🔌 Collaboration socket connected');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Collaboration socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Join/leave work order room
  useEffect(() => {
    if (!socket || !workOrderId || !user) return;

    // Join the work order
    socket.emit('joinWorkOrder', {
      workOrderId,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`
    });

    console.log(`👀 Joined work order ${workOrderId} collaboration`);

    // Leave on cleanup
    return () => {
      socket.emit('leaveWorkOrder', { workOrderId });
      console.log(`👋 Left work order ${workOrderId} collaboration`);
    };
  }, [socket, workOrderId, user]);

  // Listen for viewers updates
  useEffect(() => {
    if (!socket) return;

    const handleViewersUpdate = (data: { workOrderId: number; viewers: Viewer[] }) => {
      if (data.workOrderId === workOrderId) {
        setViewers(data.viewers);
      }
    };

    socket.on('viewersUpdate', handleViewersUpdate);

    return () => {
      socket.off('viewersUpdate', handleViewersUpdate);
    };
  }, [socket, workOrderId]);

  // Listen for typing indicators
  useEffect(() => {
    if (!socket) return;

    const handleUserStartedTyping = (data: {
      workOrderId: number;
      fieldName: string;
      userId: number;
      userName: string;
    }) => {
      if (data.workOrderId === workOrderId) {
        setTypingIndicators(prev => ({
          ...prev,
          [data.fieldName]: {
            userId: data.userId,
            userName: data.userName
          }
        }));
      }
    };

    const handleUserStoppedTyping = (data: {
      workOrderId: number;
      fieldName: string;
    }) => {
      if (data.workOrderId === workOrderId) {
        setTypingIndicators(prev => {
          const updated = { ...prev };
          delete updated[data.fieldName];
          return updated;
        });
      }
    };

    const handleTypingIndicators = (data: {
      workOrderId: number;
      indicators: TypingIndicator;
    }) => {
      if (data.workOrderId === workOrderId) {
        setTypingIndicators(data.indicators);
      }
    };

    socket.on('userStartedTyping', handleUserStartedTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('typingIndicators', handleTypingIndicators);

    return () => {
      socket.off('userStartedTyping', handleUserStartedTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('typingIndicators', handleTypingIndicators);
    };
  }, [socket, workOrderId]);

  // Listen for field updates
  useEffect(() => {
    if (!socket) return;

    const handleFieldUpdated = (data: FieldUpdate) => {
      if (data.workOrderId === workOrderId) {
        setFieldUpdates(prev => [...prev, data]);

        // Auto-clear after 5 seconds
        setTimeout(() => {
          setFieldUpdates(prev => prev.filter(u => u !== data));
        }, 5000);
      }
    };

    socket.on('fieldUpdated', handleFieldUpdated);

    return () => {
      socket.off('fieldUpdated', handleFieldUpdated);
    };
  }, [socket, workOrderId]);

  // Start typing indicator
  const startTyping = useCallback((fieldName: string) => {
    if (!socket || !workOrderId) return;

    socket.emit('startTyping', { workOrderId, fieldName });

    // Auto-stop typing after 3 seconds of inactivity
    if (typingTimeoutRef.current[fieldName]) {
      clearTimeout(typingTimeoutRef.current[fieldName]);
    }

    typingTimeoutRef.current[fieldName] = setTimeout(() => {
      stopTyping(fieldName);
    }, 3000);
  }, [socket, workOrderId]);

  // Stop typing indicator
  const stopTyping = useCallback((fieldName: string) => {
    if (!socket || !workOrderId) return;

    socket.emit('stopTyping', { workOrderId, fieldName });

    if (typingTimeoutRef.current[fieldName]) {
      clearTimeout(typingTimeoutRef.current[fieldName]);
      delete typingTimeoutRef.current[fieldName];
    }
  }, [socket, workOrderId]);

  // Broadcast field change
  const broadcastFieldChange = useCallback((fieldName: string, value: any) => {
    if (!socket || !workOrderId || !user) return;

    socket.emit('fieldChanged', {
      workOrderId,
      fieldName,
      value,
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`
    });
  }, [socket, workOrderId, user]);

  // Get other viewers (exclude current user)
  const otherViewers = viewers.filter(v => v.userId !== user?.id);

  return {
    viewers: otherViewers,
    typingIndicators,
    fieldUpdates,
    startTyping,
    stopTyping,
    broadcastFieldChange,
    isConnected: socket?.connected || false
  };
}
