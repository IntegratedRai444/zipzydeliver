import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

interface OrderUpdate {
  orderId: string;
  status: string;
  adminId?: string;
  timestamp: number;
}

interface OrderAssignment {
  orderId: string;
  amount: number;
  customerAddress: string;
  items: Array<{ name: string; quantity: number }>;
}

export function useRealtimeOrders() {
  const { user } = useAuth();
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [orderUpdates, setOrderUpdates] = useState<OrderUpdate[]>([]);
  const [newOrders, setNewOrders] = useState<OrderAssignment[]>([]);

  const connectWebSocket = useCallback(() => {
    if (!user) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate and subscribe to order updates
      websocket.send(JSON.stringify({
        type: 'authenticate',
        userId: user.id,
        userType: user.isAdmin ? 'admin' : 'user'
      }));
      
      if (user.isAdmin) {
        // Subscribe to new order assignments
        websocket.send(JSON.stringify({
          type: 'subscribe',
          topic: `order:new:${user.id}`
        }));
      }
      
      // Subscribe to order updates for this user
      websocket.send(JSON.stringify({
        type: 'subscribe',
        topic: `order:update:${user.id}`
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (user) {
          connectWebSocket();
        }
      }, 3000);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    setWs(websocket);
  }, [user]);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch (data.type) {
      case 'order_assigned':
        if (data.data) {
          setNewOrders(prev => [data.data, ...prev]);
        }
        break;
        
      case 'order_status_update':
        if (data.data) {
          setOrderUpdates(prev => [data.data, ...prev]);
        }
        break;
        
      case 'order_accepted':
      case 'order_rejected':
      case 'order_delivered':
      case 'payment_completed':
        if (data.data) {
          setOrderUpdates(prev => [data.data, ...prev]);
        }
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }, []);

  const sendOrderAction = useCallback((orderId: string, action: 'accept' | 'reject', reason?: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'order_action',
        orderId,
        action,
        reason,
        adminId: user?.id
      }));
    }
  }, [ws, isConnected, user]);

  const markOrderPaid = useCallback((orderId: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'mark_paid',
        orderId,
        adminId: user?.id
      }));
    }
  }, [ws, isConnected, user]);

  const deliverOrder = useCallback((orderId: string) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify({
        type: 'deliver_order',
        orderId,
        adminId: user?.id
      }));
    }
  }, [ws, isConnected, user]);

  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [user, connectWebSocket]);

  // Clean up old updates (keep only last 50)
  useEffect(() => {
    if (orderUpdates.length > 50) {
      setOrderUpdates(prev => prev.slice(0, 50));
    }
  }, [orderUpdates]);

  // Clean up old orders (keep only last 20)
  useEffect(() => {
    if (newOrders.length > 20) {
      setNewOrders(prev => prev.slice(0, 20));
    }
  }, [newOrders]);

  const clearUpdates = useCallback(() => {
    setOrderUpdates([]);
  }, []);

  const clearNewOrders = useCallback(() => {
    setNewOrders([]);
  }, []);

  return {
    isConnected,
    orderUpdates,
    newOrders,
    sendOrderAction,
    markOrderPaid,
    deliverOrder,
    clearUpdates,
    clearNewOrders,
  };
}
