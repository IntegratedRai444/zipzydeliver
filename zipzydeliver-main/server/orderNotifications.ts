import { WebSocketService } from './services/websocketService';
import { DispatchService } from './services/dispatchService';
import { storage } from './storage';
import { pythonAIIntegration } from './services/pythonAIIntegration';
import { type InsertOrder, type InsertOrderItem, type InsertPayment, type InsertNotification } from '@shared/schema';

export class OrderNotificationService {
  private wsService: WebSocketService;
  private dispatchService: DispatchService;

  constructor() {
    this.wsService = WebSocketService.getInstance();
    this.dispatchService = DispatchService.getInstance();
  }

  async createOrder(orderData: InsertOrder, items: InsertOrderItem[]): Promise<string> {
    try {
      // AI Fraud Detection Check
      if (await pythonAIIntegration.isServiceAvailable()) {
        try {
          const fraudCheck = await pythonAIIntegration.detectFakeOrders({
            orderData,
            items,
            customerHistory: await storage.getCustomerOrderHistory(orderData.customerId),
            location: orderData.deliveryAddress
          });

          if (fraudCheck.success && fraudCheck.data?.is_fraudulent) {
            console.warn(`Potential fraud detected for order ${orderData.id} with score: ${fraudCheck.data.fraud_score}`);
            // You can implement additional fraud prevention measures here
          }
        } catch (error) {
          console.warn('AI fraud detection failed, proceeding with order:', error);
        }
      }

      // Create the order
      const order = await storage.createOrder(orderData);
      
      // Create order items
      for (const item of items) {
        await storage.createOrderItem({ ...item, orderId: order.id });
      }

      // Create payment record
      const payment: InsertPayment = {
        orderId: order.id,
        amount: order.totalAmount,
        method: order.paymentMethod,
        status: 'pending',
        upiId: order.paymentMethod === 'upi' ? process.env.ADMIN_UPI_ID || 'zipzy@upi' : undefined,
      };
      await storage.createPayment(payment);

      // Create initial order tracking entry
      await storage.createOrderTracking({
        orderId: order.id,
        status: 'placed',
        message: 'Order placed successfully',
        location: null,
        deliveryPartnerId: null,
      });

      // Find available delivery partners instead of auto-assigning to admin
      const destination = this.extractCoordinatesFromAddress(order.deliveryAddress);
      if (destination) {
        const dispatchResult = await this.dispatchService.findAvailablePartners(
          order.id,
          destination,
          5 // Max 5 partners to notify
        );

        // Create notification for customer about order placement
        const notification: InsertNotification = {
          userId: order.customerId,
          type: 'order_placed',
          title: 'Order Placed Successfully',
          message: `Your order #${order.id.slice(0, 8)} has been placed. We're finding a delivery partner for you.`,
          data: { orderId: order.id, status: 'placed' },
        };
        await storage.createNotification(notification);

        // Send real-time update to customer
        await this.wsService.notifyOrderStatusUpdate(order.id, 'placed', order.customerId);
      } else {
        // Fallback: assign to admin if location extraction fails
        const adminUser = await storage.getUserByEmail('rishabhkapoor@atomicmail.io');
        if (adminUser) {
          await storage.updateOrderAssignment(order.id, adminUser.id);
          await storage.updateOrderStatus(order.id, 'assigned');
        }
      }

      return order.id;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async acceptOrder(orderId: string, partnerId: string): Promise<void> {
    try {
      // Update order status and assignment
      await storage.updateOrderStatus(orderId, 'accepted');
      await storage.updateOrderAcceptedAt(orderId);
      await storage.updateOrderAssignment(orderId, partnerId);

      // Create order tracking entry
      await storage.createOrderTracking({
        orderId: orderId,
        status: 'accepted',
        message: 'Order accepted by delivery partner',
        location: null,
        deliveryPartnerId: partnerId,
      });

      // Get order and partner details
      const order = await storage.getOrder(orderId);
      const partner = await storage.getDeliveryPartnerById(partnerId);

      if (order && partner) {
        // Create notification for customer
        const notification: InsertNotification = {
          userId: order.customerId,
          type: 'order_accepted',
          title: 'Order Accepted',
          message: `${partner.name} has accepted your order and will pick it up soon.`,
          data: { orderId, status: 'accepted', partnerId, partnerName: partner.name },
        };
        await storage.createNotification(notification);

        // Send real-time update to customer
        await this.wsService.notifyOrderStatusUpdate(orderId, 'accepted', order.customerId);
        
        // Notify partner about successful acceptance
        await this.wsService.notifyOrderAccepted(orderId, partnerId);
      }
    } catch (error) {
      console.error('Error accepting order:', error);
      throw error;
    }
  }

  async rejectOrder(orderId: string, adminId: string, reason?: string): Promise<void> {
    try {
      // Update order status
      await storage.updateOrderStatus(orderId, 'rejected');

      // Create notification for customer
      const order = await storage.getOrder(orderId);
      if (order) {
        const notification: InsertNotification = {
          userId: order.customerId,
          type: 'order_rejected',
          title: 'Order Rejected',
          message: `Your order #${orderId.slice(0, 8)} has been rejected. ${reason ? `Reason: ${reason}` : ''}`,
          data: { orderId, status: 'rejected', reason },
        };
        await storage.createNotification(notification);

        // Send real-time update via WebSocket
        await this.wsService.notifyOrderStatusUpdate(orderId, 'rejected', adminId);
      }
    } catch (error) {
      console.error('Error rejecting order:', error);
      throw error;
    }
  }

  async markOrderPaid(orderId: string, adminId: string): Promise<void> {
    try {
      // Update payment status
      await storage.updatePaymentStatus(orderId, 'completed');
      await storage.updateOrderPaymentStatus(orderId, 'paid');

      // Create notification for customer
      const order = await storage.getOrder(orderId);
      if (order) {
        const notification: InsertNotification = {
          userId: order.customerId,
          type: 'payment_completed',
          title: 'Payment Received',
          message: `Payment for order #${orderId.slice(0, 8)} has been received. Thank you!`,
          data: { orderId, paymentStatus: 'paid' },
        };
        await storage.createNotification(notification);

        // Send real-time update via WebSocket
        await this.wsService.notifyOrderStatusUpdate(orderId, 'paid', adminId);
      }
    } catch (error) {
      console.error('Error marking order as paid:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId: string, status: string, partnerId: string, location?: any, message?: string): Promise<void> {
    try {
      // Update order status
      await storage.updateOrderStatus(orderId, status);

      // Create order tracking entry
      await storage.createOrderTracking({
        orderId: orderId,
        status: status,
        message: message || `Order status updated to ${status}`,
        location: location,
        deliveryPartnerId: partnerId,
      });

      // Get order details
      const order = await storage.getOrder(orderId);
      if (order) {
        // Create notification for customer
        const notification: InsertNotification = {
          userId: order.customerId,
          type: `order_${status}`,
          title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: this.getStatusMessage(status, message),
          data: { orderId, status, partnerId },
        };
        await storage.createNotification(notification);

        // Send real-time update to customer
        await this.wsService.notifyOrderStatusUpdate(orderId, status, order.customerId);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  async updateDeliveryLocation(orderId: string, partnerId: string, location: any): Promise<void> {
    try {
      // Update partner's current location
      await storage.updatePartnerLocation(partnerId, location);

      // Create tracking entry with location
      await storage.createOrderTracking({
        orderId: orderId,
        status: 'location_update',
        message: 'Delivery partner location updated',
        location: location,
        deliveryPartnerId: partnerId,
      });

      // Send real-time location update to customer
      const order = await storage.getOrder(orderId);
      if (order) {
        await this.wsService.notifyLocationUpdate(orderId, order.customerId, location);
      }
    } catch (error) {
      console.error('Error updating delivery location:', error);
      throw error;
    }
  }

  async deliverOrder(orderId: string, partnerId: string): Promise<void> {
    try {
      // Update order status
      await storage.updateOrderStatus(orderId, 'delivered');
      await storage.updateOrderDeliveredAt(orderId);

      // Create order tracking entry
      await storage.createOrderTracking({
        orderId: orderId,
        status: 'delivered',
        message: 'Order delivered successfully',
        location: null,
        deliveryPartnerId: partnerId,
      });

      // Get order details
      const order = await storage.getOrder(orderId);
      if (order) {
        // Create notification for customer
        const notification: InsertNotification = {
          userId: order.customerId,
          type: 'order_delivered',
          title: 'Order Delivered',
          message: `Your order #${orderId.slice(0, 8)} has been delivered successfully!`,
          data: { orderId, status: 'delivered', partnerId },
        };
        await storage.createNotification(notification);

        // Send real-time update to customer
        await this.wsService.notifyOrderStatusUpdate(orderId, 'delivered', order.customerId);
      }
    } catch (error) {
      console.error('Error delivering order:', error);
      throw error;
    }
  }

  async getNotificationsForUser(userId: string): Promise<any[]> {
    try {
      return await storage.getNotificationsForUser(userId);
    } catch (error) {
      console.error('Error getting notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      await storage.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  private extractCoordinatesFromAddress(address: string): { lat: number; lng: number } | null {
    // This is a simplified implementation
    // In production, you'd use a geocoding service like Google Maps API
    // For now, return null to trigger fallback to admin assignment
    return null;
  }

  private getStatusMessage(status: string, customMessage?: string): string {
    if (customMessage) return customMessage;
    
    const statusMessages: Record<string, string> = {
      'accepted': 'Your order has been accepted and is being prepared.',
      'preparing': 'Your order is being prepared.',
      'out_for_delivery': 'Your order is out for delivery!',
      'delivered': 'Your order has been delivered successfully!',
      'cancelled': 'Your order has been cancelled.',
    };
    
    return statusMessages[status] || `Order status: ${status}`;
  }
}

export const orderNotificationService = new OrderNotificationService();
