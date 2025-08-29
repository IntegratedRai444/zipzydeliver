import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';

export interface WebSocketMessage {
  type: 'partner_matched' | 'order_status_update' | 'location_update' | 'dispatch_expired' | 'order_accepted';
  data: any;
  timestamp: number;
}

export interface ConnectedPartner {
  partnerId: string;
  socket: WebSocket;
  isOnline: boolean;
  lastPing: number;
}

export interface ConnectedUser {
  userId: string;
  socket: WebSocket;
  lastPing: number;
}

/**
 * WebSocket Service for real-time communication
 * Handles partner matching, order updates, and location tracking
 */
export class WebSocketService {
  private static instance: WebSocketService;
  private wss: WebSocketServer | null = null;
  private connectedPartners: Map<string, ConnectedPartner> = new Map();
  private connectedUsers: Map<string, ConnectedUser> = new Map();
  private partnerSubscriptions: Map<string, Set<string>> = new Map(); // orderId -> Set<partnerId>
  private userSubscriptions: Map<string, Set<string>> = new Map(); // orderId -> Set<userId>

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: HTTPServer): void {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on('connection', (socket: WebSocket) => {
      this.handleConnection(socket);
    });

    console.log('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connections
   */
  private handleConnection(socket: WebSocket): void {
    console.log('New WebSocket connection established');

    // Handle partner authentication
    socket.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'partner_auth':
            await this.authenticatePartner(socket, data.partnerId);
            break;
          case 'user_auth':
            await this.authenticateUser(socket, data.userId);
            break;
          case 'subscribe_order':
            this.subscribeToOrder(data.orderId, data.userId || data.partnerId, data.isPartner);
            break;
          case 'ping':
            this.handlePing(socket, data.userId || data.partnerId, data.isPartner);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Handle disconnection
    socket.on('close', () => {
      this.handleDisconnection(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(socket);
    });
  }

  /**
   * Authenticate delivery partner
   */
  private async authenticatePartner(socket: WebSocket, partnerId: string): Promise<void> {
    try {
      const partner = await storage.getUser(partnerId);
      if (!partner) {
        socket.send(JSON.stringify({
          type: 'auth_error',
          message: 'Partner not found'
        }));
        return;
      }

      // Store connected partner
      this.connectedPartners.set(partnerId, {
        partnerId,
        socket,
        isOnline: true,
        lastPing: Date.now()
      });

      // Update partner online status in database
      await storage.updatePartnerOnlineStatus(partnerId, true);

      socket.send(JSON.stringify({
        type: 'partner_auth_success',
        partnerId,
        message: 'Partner authenticated successfully'
      }));

      console.log(`Partner ${partnerId} authenticated and connected`);
    } catch (error) {
      console.error('Partner authentication error:', error);
      socket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
    }
  }

  /**
   * Authenticate user
   */
  private async authenticateUser(socket: WebSocket, userId: string): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        socket.send(JSON.stringify({
          type: 'auth_error',
          message: 'User not found'
        }));
        return;
      }

      // Store connected user
      this.connectedUsers.set(userId, {
        userId,
        socket,
        lastPing: Date.now()
      });

      socket.send(JSON.stringify({
        type: 'user_auth_success',
        userId,
        message: 'User authenticated successfully'
      }));

      console.log(`User ${userId} authenticated and connected`);
    } catch (error) {
      console.error('User authentication error:', error);
      socket.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
    }
  }

  /**
   * Subscribe to order updates
   */
  private subscribeToOrder(orderId: string, id: string, isPartner: boolean): void {
    if (isPartner) {
      if (!this.partnerSubscriptions.has(orderId)) {
        this.partnerSubscriptions.set(orderId, new Set());
      }
      this.partnerSubscriptions.get(orderId)!.add(id);
    } else {
      if (!this.userSubscriptions.has(orderId)) {
        this.userSubscriptions.set(orderId, new Set());
      }
      this.userSubscriptions.get(orderId)!.add(id);
    }

    console.log(`${isPartner ? 'Partner' : 'User'} ${id} subscribed to order ${orderId}`);
  }

  /**
   * Handle ping messages
   */
  private handlePing(socket: WebSocket, id: string, isPartner: boolean): void {
    const now = Date.now();
    
    if (isPartner) {
      const partner = this.connectedPartners.get(id);
      if (partner) {
        partner.lastPing = now;
        partner.socket.send(JSON.stringify({ type: 'pong', timestamp: now }));
      }
    } else {
      const user = this.connectedUsers.get(id);
      if (user) {
        user.lastPing = now;
        user.socket.send(JSON.stringify({ type: 'pong', timestamp: now }));
      }
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: WebSocket): void {
    // Remove from connected partners
    this.connectedPartners.forEach((partner, partnerId) => {
      if (partner.socket === socket) {
        this.connectedPartners.delete(partnerId);
        storage.updatePartnerOnlineStatus(partnerId, false);
        console.log(`Partner ${partnerId} disconnected`);
      }
    });

    // Remove from connected users
    this.connectedUsers.forEach((user, userId) => {
      if (user.socket === socket) {
        this.connectedUsers.delete(userId);
        console.log(`User ${userId} disconnected`);
      }
    });
  }

  /**
   * Notify partners about new order dispatch
   */
  async notifyPartnersOfDispatch(orderId: string, matchedPartners: Array<{ partnerId: string; distance: number }>): Promise<void> {
    const message: WebSocketMessage = {
      type: 'partner_matched',
      data: {
        orderId,
        matchedPartners,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      },
      timestamp: Date.now()
    };

    // Send to all matched partners
    for (const partner of matchedPartners) {
      const connectedPartner = this.connectedPartners.get(partner.partnerId);
      if (connectedPartner && connectedPartner.isOnline) {
        try {
          connectedPartner.socket.send(JSON.stringify(message));
          console.log(`Dispatch notification sent to partner ${partner.partnerId}`);
        } catch (error) {
          console.error(`Failed to send dispatch to partner ${partner.partnerId}:`, error);
        }
      }
    }
  }

  /**
   * Notify order status updates
   */
  async notifyOrderStatusUpdate(orderId: string, status: string, partnerId?: string): Promise<void> {
    const message: WebSocketMessage = {
      type: 'order_status_update',
      data: {
        orderId,
        status,
        partnerId,
        timestamp: new Date()
      },
      timestamp: Date.now()
    };

    // Notify subscribed users
    const userSubs = this.userSubscriptions.get(orderId);
    if (userSubs) {
      userSubs.forEach(userId => {
        const connectedUser = this.connectedUsers.get(userId);
        if (connectedUser) {
          try {
            connectedUser.socket.send(JSON.stringify(message));
          } catch (error) {
            console.error(`Failed to send status update to user ${userId}:`, error);
          }
        }
      });
    }

    // Notify subscribed partners
    const partnerSubs = this.partnerSubscriptions.get(orderId);
    if (partnerSubs) {
      partnerSubs.forEach(pid => {
        const connectedPartner = this.connectedPartners.get(pid);
        if (connectedPartner) {
          try {
            connectedPartner.socket.send(JSON.stringify(message));
          } catch (error) {
            console.error(`Failed to send status update to partner ${pid}:`, error);
          }
        }
      });
    }
  }

  /**
   * Notify order accepted by partner
   */
  async notifyOrderAccepted(orderId: string, partnerId: string): Promise<void> {
    const message: WebSocketMessage = {
      type: 'order_accepted',
      data: {
        orderId,
        partnerId,
        timestamp: new Date()
      },
      timestamp: Date.now()
    };

    // Notify the partner about successful acceptance
    const connectedPartner = this.connectedPartners.get(partnerId);
    if (connectedPartner) {
      try {
        connectedPartner.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Failed to send order accepted notification to partner ${partnerId}:`, error);
      }
    }
  }

  /**
   * Notify location updates
   */
  async notifyLocationUpdate(orderId: string, location: { lat: number; lng: number }, partnerId: string): Promise<void> {
    const message: WebSocketMessage = {
      type: 'location_update',
      data: {
        orderId,
        location,
        partnerId,
        timestamp: new Date()
      },
      timestamp: Date.now()
    };

    // Notify subscribed users about location update
    const userSubs = this.userSubscriptions.get(orderId);
    if (userSubs) {
      userSubs.forEach(userId => {
        const connectedUser = this.connectedUsers.get(userId);
        if (connectedUser) {
          try {
            connectedUser.socket.send(JSON.stringify(message));
          } catch (error) {
            console.error(`Failed to send location update to user ${userId}:`, error);
          }
        }
      });
    }
  }

  /**
   * Clean up expired connections
   */
  cleanupExpiredConnections(): void {
    const now = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    // Clean up expired partners
    this.connectedPartners.forEach((partner, partnerId) => {
      if (now - partner.lastPing > TIMEOUT_MS) {
        partner.socket.close();
        this.connectedPartners.delete(partnerId);
        storage.updatePartnerOnlineStatus(partnerId, false);
        console.log(`Expired partner connection: ${partnerId}`);
      }
    });

    // Clean up expired users
    this.connectedUsers.forEach((user, userId) => {
      if (now - user.lastPing > TIMEOUT_MS) {
        user.socket.close();
        this.connectedUsers.delete(userId);
        console.log(`Expired user connection: ${userId}`);
      }
    });
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    connectedPartners: number;
    connectedUsers: number;
    totalConnections: number;
  } {
    return {
      connectedPartners: this.connectedPartners.size,
      connectedUsers: this.connectedUsers.size,
      totalConnections: this.connectedPartners.size + this.connectedUsers.size
    };
  }
}

export const websocketService = WebSocketService.getInstance();
