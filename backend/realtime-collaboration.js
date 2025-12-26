// Real-time collaboration manager for Socket.IO
// Handles presence tracking, live editing, and field-level collaboration

class CollaborationManager {
  constructor() {
    // Track which users are viewing which work orders
    // Format: { workOrderId: { userId: { name, socketId, joinedAt } } }
    this.workOrderViewers = new Map();

    // Track which users are typing in which fields
    // Format: { workOrderId: { fieldName: { userId, name, timestamp } } }
    this.activeTyping = new Map();

    // Track socket to user mapping
    // Format: { socketId: { userId, name, currentWorkOrder } }
    this.socketUsers = new Map();
  }

  // User joins a work order view
  joinWorkOrder(socketId, workOrderId, userId, userName) {
    // Initialize work order viewers if not exists
    if (!this.workOrderViewers.has(workOrderId)) {
      this.workOrderViewers.set(workOrderId, new Map());
    }

    // Add user to viewers
    const viewers = this.workOrderViewers.get(workOrderId);
    viewers.set(userId, {
      name: userName,
      socketId: socketId,
      joinedAt: new Date()
    });

    // Track socket to user
    this.socketUsers.set(socketId, {
      userId,
      name: userName,
      currentWorkOrder: workOrderId
    });

    console.log(`👀 ${userName} joined work order ${workOrderId}`);

    return this.getWorkOrderViewers(workOrderId);
  }

  // User leaves a work order view
  leaveWorkOrder(socketId) {
    const user = this.socketUsers.get(socketId);
    if (!user) return null;

    const { userId, currentWorkOrder, name } = user;

    if (currentWorkOrder) {
      const viewers = this.workOrderViewers.get(currentWorkOrder);
      if (viewers) {
        viewers.delete(userId);

        // Clean up empty work order entries
        if (viewers.size === 0) {
          this.workOrderViewers.delete(currentWorkOrder);
        }
      }

      // Clean up typing indicators for this user
      this.stopTyping(socketId, currentWorkOrder, null);

      console.log(`👋 ${name} left work order ${currentWorkOrder}`);
    }

    this.socketUsers.delete(socketId);

    return {
      workOrderId: currentWorkOrder,
      viewers: currentWorkOrder ? this.getWorkOrderViewers(currentWorkOrder) : []
    };
  }

  // User starts typing in a field
  startTyping(socketId, workOrderId, fieldName) {
    const user = this.socketUsers.get(socketId);
    if (!user) return;

    // Initialize typing map for work order if needed
    if (!this.activeTyping.has(workOrderId)) {
      this.activeTyping.set(workOrderId, new Map());
    }

    const typingFields = this.activeTyping.get(workOrderId);
    typingFields.set(fieldName, {
      userId: user.userId,
      name: user.name,
      timestamp: new Date()
    });

    return {
      fieldName,
      userId: user.userId,
      userName: user.name
    };
  }

  // User stops typing in a field
  stopTyping(socketId, workOrderId, fieldName) {
    const user = this.socketUsers.get(socketId);
    if (!user) return;

    const typingFields = this.activeTyping.get(workOrderId);
    if (!typingFields) return;

    if (fieldName) {
      typingFields.delete(fieldName);
    } else {
      // Clear all typing indicators for this user
      for (const [field, typingUser] of typingFields.entries()) {
        if (typingUser.userId === user.userId) {
          typingFields.delete(field);
        }
      }
    }

    // Clean up empty work order entries
    if (typingFields.size === 0) {
      this.activeTyping.delete(workOrderId);
    }
  }

  // Get all viewers for a work order
  getWorkOrderViewers(workOrderId) {
    const viewers = this.workOrderViewers.get(workOrderId);
    if (!viewers) return [];

    return Array.from(viewers.values()).map(v => ({
      userId: Array.from(viewers.entries()).find(([, val]) => val === v)?.[0],
      name: v.name,
      joinedAt: v.joinedAt
    }));
  }

  // Get typing indicators for a work order
  getTypingIndicators(workOrderId) {
    const typingFields = this.activeTyping.get(workOrderId);
    if (!typingFields) return {};

    const result = {};
    for (const [fieldName, user] of typingFields.entries()) {
      result[fieldName] = {
        userId: user.userId,
        userName: user.name
      };
    }
    return result;
  }

  // Clean up stale typing indicators (older than 5 seconds)
  cleanupStaleTyping() {
    const now = new Date();
    const staleThreshold = 5000; // 5 seconds

    for (const [workOrderId, typingFields] of this.activeTyping.entries()) {
      for (const [fieldName, user] of typingFields.entries()) {
        if (now - user.timestamp > staleThreshold) {
          typingFields.delete(fieldName);
        }
      }

      if (typingFields.size === 0) {
        this.activeTyping.delete(workOrderId);
      }
    }
  }

  // Get stats for monitoring
  getStats() {
    return {
      activeWorkOrders: this.workOrderViewers.size,
      totalViewers: this.socketUsers.size,
      activeTypingFields: Array.from(this.activeTyping.values())
        .reduce((sum, fields) => sum + fields.size, 0)
    };
  }
}

module.exports = CollaborationManager;
