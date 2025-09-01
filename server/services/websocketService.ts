import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { getAvailablePort } from '../utils/portUtils';

interface WebSocketConnection {
  id: string;
  ws: WebSocket;
  userId?: string;
  isPartner?: boolean;
  connectedAt: Date;
  lastActivity: Date;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocketConnection> = new Map();
  private port: number = 24678;

  async initialize(server: HTTPServer): Promise<void> {
    try {
      // Try to get an available port
      this.port = await getAvailablePort(24678, 10);
      
      this.wss = new WebSocketServer({ 
        server
      });

      this.wss.on('connection', (ws: WebSocket, req: any) => {
        const connectionId = this.generateConnectionId();
        const connection: WebSocketConnection = {
          id: connectionId,
          ws,
          connectedAt: new Date(),
          lastActivity: new Date()
        };

        this.connections.set(connectionId, connection);

        console.log(`🔌 WebSocket connected: ${connectionId}`);

        ws.on('message', (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(connectionId, message);
            connection.lastActivity = new Date();
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        });

        ws.on('close', () => {
          this.connections.delete(connectionId);
          console.log(`🔌 WebSocket disconnected: ${connectionId}`);
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for ${connectionId}:`, error);
          this.connections.delete(connectionId);
        });

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          connectionId,
          timestamp: new Date().toISOString()
        }));
      });

      console.log(`✅ WebSocket server initialized on port ${this.port}`);
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket server:', error);
      // Continue without WebSocket functionality
    }
  }

  private generateConnectionId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private handleMessage(connectionId: string, message: any): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    switch (message.type) {
      case 'ping':
        connection.ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      
      case 'auth':
        if (message.userId) {
          connection.userId = message.userId;
          connection.ws.send(JSON.stringify({ 
            type: 'auth_success', 
            userId: message.userId 
          }));
        }
        break;
      
      case 'partner_auth':
        if (message.partnerId) {
          connection.userId = message.partnerId;
          connection.isPartner = true;
          connection.ws.send(JSON.stringify({ 
            type: 'partner_auth_success', 
            partnerId: message.partnerId 
          }));
        }
        break;
      
      case 'subscribe_order':
        if (message.orderId && message.userId) {
          connection.userId = message.userId;
          connection.isPartner = message.isPartner || false;
          connection.ws.send(JSON.stringify({ 
            type: 'subscribed', 
            orderId: message.orderId 
          }));
        }
        break;
      
      default:
        console.log(`📨 WebSocket message from ${connectionId}:`, message);
    }
  }

  // Send message to specific user
  sendToUser(userId: string, message: any): void {
    const userConnections = Array.from(this.connections.values())
      .filter(conn => conn.userId === userId);

    userConnections.forEach(connection => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify(message));
          connection.lastActivity = new Date();
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
        }
      }
    });
  }

  // Send message to all partners
  sendToPartners(message: any): void {
    this.broadcast(message, (connection) => connection.isPartner === true);
  }

  // Send message to all customers
  sendToCustomers(message: any): void {
    this.broadcast(message, (connection) => connection.isPartner !== true);
  }

  broadcast(message: any, filter?: (connection: WebSocketConnection) => boolean): void {
    const connectionsToNotify = filter 
      ? Array.from(this.connections.values()).filter(filter)
      : Array.from(this.connections.values());

    connectionsToNotify.forEach(connection => {
      if (connection.ws.readyState === WebSocket.OPEN) {
        try {
          connection.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`Failed to send message to ${connection.id}:`, error);
        }
      }
    });
  }

  cleanupExpiredConnections(): void {
    const now = new Date();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes

    for (const [id, connection] of Array.from(this.connections.entries())) {
      const idleTime = now.getTime() - connection.lastActivity.getTime();
      
      if (idleTime > maxIdleTime) {
        connection.ws.close();
        this.connections.delete(id);
        console.log(`🧹 Cleaned up idle connection: ${id}`);
      }
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }

  getPort(): number {
    return this.port;
  }
}

export const websocketService = new WebSocketService();
