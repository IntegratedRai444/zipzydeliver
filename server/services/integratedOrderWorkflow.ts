import { orderWorkflowService, OrderStatus } from './orderWorkflowService';

export class IntegratedOrderWorkflow {
  private storage: any;

  constructor(storage: any) {
    this.storage = storage;
    // Ensure the core service can access storage
    orderWorkflowService.setStorage(storage);
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for workflow events
   */
  private setupEventListeners(): void {
    // Listen for order transitions
    orderWorkflowService.on('orderTransitioned', async (data) => {
      await this.handleOrderTransition(data);
    });

    // Listen for customer notifications
    orderWorkflowService.on('customerNotification', async (data) => {
      await this.handleCustomerNotification(data);
    });

    // Listen for partner notifications
    orderWorkflowService.on('partnerNotification', async (data) => {
      await this.handlePartnerNotification(data);
    });

    // Listen for admin notifications
    orderWorkflowService.on('adminNotification', async (data) => {
      await this.handleAdminNotification(data);
    });

    // Listen for admin alerts
    orderWorkflowService.on('adminAlert', async (data) => {
      await this.handleAdminAlert(data);
    });

    // Listen for partner alerts
    orderWorkflowService.on('partnerAlert', async (data) => {
      await this.handlePartnerAlert(data);
    });
  }

  /**
   * Initialize order workflow
   */
  async initializeOrder(orderId: string, initialStatus: OrderStatus = 'placed'): Promise<void> {
    console.log(`🚀 Initializing integrated workflow for order ${orderId}`);
    
    // Initialize the workflow service
    await orderWorkflowService.initializeOrder(orderId, initialStatus);
    
    // Create order tracking entry
    await this.createOrderTrackingEntry(orderId, initialStatus);
  }

  /**
   * Transition order with storage integration
   */
  async transitionOrder(
    orderId: string,
    newStatus: OrderStatus,
    trigger: 'automatic' | 'manual' | 'timeout' | 'payment' | 'partner_action' = 'manual',
    metadata?: any
  ): Promise<boolean> {
    try {
      console.log(`🔄 Integrated transition for order ${orderId} to ${newStatus}`);
      
      // Get current order from storage
      const order = await this.storage.getOrderById(orderId);
      if (!order) {
        console.error(`Order ${orderId} not found in storage`);
        return false;
      }

      // Update order status in storage first
      await this.storage.updateOrder(orderId, {
        ...order,
        status: newStatus,
        updatedAt: new Date()
      });

      // Create order tracking entry
      await this.createOrderTrackingEntry(orderId, newStatus, metadata);

      // Trigger workflow transition
      const success = await orderWorkflowService.transitionOrder(orderId, newStatus, trigger, metadata);
      
      if (success) {
        console.log(`✅ Integrated transition successful for order ${orderId}`);
      }
      
      return success;
      
    } catch (error) {
      console.error(`❌ Integrated transition failed for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Handle payment confirmation
   */
  async handlePaymentConfirmation(orderId: string): Promise<boolean> {
    try {
      console.log(`💰 Handling payment confirmation for order ${orderId}`);
      
      // Update order payment status
      const order = await this.storage.getOrderById(orderId);
      if (order) {
        await this.storage.updateOrder(orderId, {
          ...order,
          paymentStatus: 'completed',
          paidAt: new Date()
        });
      }

      // Transition to confirmed status
      return await this.transitionOrder(orderId, 'confirmed', 'payment');
      
    } catch (error) {
      console.error(`❌ Payment confirmation failed for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Handle partner assignment
   */
  async handlePartnerAssignment(orderId: string, partnerId: string): Promise<boolean> {
    try {
      console.log(`🚚 Handling partner assignment for order ${orderId} to partner ${partnerId}`);
      
      // Update order with partner assignment
      const order = await this.storage.getOrderById(orderId);
      if (order) {
        await this.storage.updateOrder(orderId, {
          ...order,
          assignedTo: partnerId,
          assignedAt: new Date()
        });
      }

      // Transition to assigned status
      return await this.transitionOrder(orderId, 'assigned', 'partner_action', { partnerId });
      
    } catch (error) {
      console.error(`❌ Partner assignment failed for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Handle order pickup
   */
  async handleOrderPickup(orderId: string, partnerId: string): Promise<boolean> {
    try {
      console.log(`📦 Handling order pickup for order ${orderId} by partner ${partnerId}`);
      
      // Update order pickup time
      const order = await this.storage.getOrderById(orderId);
      if (order) {
        await this.storage.updateOrder(orderId, {
          ...order,
          pickedUpAt: new Date()
        });
      }

      // Transition to picked_up status
      return await this.transitionOrder(orderId, 'picked_up', 'partner_action', { partnerId });
      
    } catch (error) {
      console.error(`❌ Order pickup failed for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Handle order delivery
   */
  async handleOrderDelivery(orderId: string, partnerId: string): Promise<boolean> {
    try {
      console.log(`🎉 Handling order delivery for order ${orderId} by partner ${partnerId}`);
      
      // Update order delivery time
      const order = await this.storage.getOrderById(orderId);
      if (order) {
        await this.storage.updateOrder(orderId, {
          ...order,
          deliveredAt: new Date()
        });
      }

      // Transition to delivered status
      return await this.transitionOrder(orderId, 'delivered', 'partner_action', { partnerId });
      
    } catch (error) {
      console.error(`❌ Order delivery failed for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Handle order cancellation
   */
  async handleOrderCancellation(orderId: string, reason?: string): Promise<boolean> {
    try {
      console.log(`❌ Handling order cancellation for order ${orderId}`);
      
      // Update order cancellation
      const order = await this.storage.getOrderById(orderId);
      if (order) {
        await this.storage.updateOrder(orderId, {
          ...order,
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason
        });
      }

      // Stop workflow
      await orderWorkflowService.stopWorkflow(orderId);

      // Create tracking entry
      await this.createOrderTrackingEntry(orderId, 'cancelled', { reason });

      return true;
      
    } catch (error) {
      console.error(`❌ Order cancellation failed for order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Create order tracking entry
   */
  private async createOrderTrackingEntry(orderId: string, status: OrderStatus, metadata?: any): Promise<void> {
    try {
      const trackingEntry = {
        orderId,
        status,
        timestamp: new Date(),
        metadata: metadata || {}
      };

      // This would be stored in your order_tracking table
      console.log(`📊 Created tracking entry for order ${orderId}:`, trackingEntry);
      
    } catch (error) {
      console.error(`Error creating tracking entry for order ${orderId}:`, error);
    }
  }

  /**
   * Handle order transition events
   */
  private async handleOrderTransition(data: any): Promise<void> {
    const { orderId, from, to, trigger } = data;
    console.log(`🔄 Order transition event: ${orderId} ${from} → ${to} (${trigger})`);
    
    // You can add custom logic here for specific transitions
    switch (to) {
      case 'delivered':
        await this.handleDeliveryCompletion(orderId);
        break;
      case 'cancelled':
        await this.handleCancellationCompletion(orderId);
        break;
    }
  }

  /**
   * Handle customer notifications
   */
  private async handleCustomerNotification(data: any): Promise<void> {
    const { orderId, message, status } = data;
    console.log(`📱 Customer notification for order ${orderId}: ${message}`);
    
    // Create notification in storage
    await this.createNotification(orderId, 'customer', message, status);
  }

  /**
   * Handle partner notifications
   */
  private async handlePartnerNotification(data: any): Promise<void> {
    const { orderId, message, status, partnerId } = data;
    console.log(`🚚 Partner notification for order ${orderId}: ${message}`);
    
    // Create notification in storage
    await this.createNotification(orderId, 'partner', message, status, partnerId);
  }

  /**
   * Handle admin notifications
   */
  private async handleAdminNotification(data: any): Promise<void> {
    const { orderId, message, status } = data;
    console.log(`👨‍💼 Admin notification for order ${orderId}: ${message}`);
    
    // Create notification in storage
    await this.createNotification(orderId, 'admin', message, status);
  }

  /**
   * Handle admin alerts
   */
  private async handleAdminAlert(data: any): Promise<void> {
    const { orderId, message } = data;
    console.log(`🚨 Admin alert for order ${orderId}: ${message}`);
    
    // Create high-priority notification
    await this.createNotification(orderId, 'admin', message, 'alert', undefined, 'high');
  }

  /**
   * Handle partner alerts
   */
  private async handlePartnerAlert(data: any): Promise<void> {
    const { orderId, message } = data;
    console.log(`⚠️ Partner alert for order ${orderId}: ${message}`);
    
    // Get partner ID from order
    const order = await this.storage.getOrderById(orderId);
    if (order?.assignedTo) {
      await this.createNotification(orderId, 'partner', message, 'alert', order.assignedTo, 'high');
    }
  }

  /**
   * Create notification in storage
   */
  private async createNotification(
    orderId: string, 
    recipientType: 'customer' | 'partner' | 'admin', 
    message: string, 
    type: string,
    recipientId?: string,
    priority: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<void> {
    try {
      const notification = {
        orderId,
        recipientType,
        message,
        type,
        recipientId,
        priority,
        createdAt: new Date(),
        isRead: false
      };

      // This would be stored in your notifications table
      console.log(`📢 Created notification:`, notification);
      
    } catch (error) {
      console.error(`Error creating notification:`, error);
    }
  }

  /**
   * Handle delivery completion
   */
  private async handleDeliveryCompletion(orderId: string): Promise<void> {
    console.log(`🎉 Delivery completed for order ${orderId}`);
    
    const order = await this.storage.getOrderById(orderId);
    if (!order) return;

    // Update partner earnings
    if (order.assignedTo) {
      await this.updatePartnerEarnings(order.assignedTo, order.deliveryFee || 20);
    }

    // Confirm inventory sale (move from reserved to sold)
    if (order.items) {
      try {
        const { inventoryService } = await import('./inventoryService');
        
        for (const item of order.items) {
          await inventoryService.confirmSale(
            item.productId,
            item.quantity,
            orderId
          );
        }
        
        console.log(`✅ Confirmed inventory sale for order ${orderId}`);
      } catch (error) {
        console.error(`❌ Failed to confirm inventory sale for order ${orderId}:`, error);
      }
    }
  }

  /**
   * Handle cancellation completion
   */
  private async handleCancellationCompletion(orderId: string): Promise<void> {
    console.log(`❌ Cancellation completed for order ${orderId}`);
    
    const order = await this.storage.getOrderById(orderId);
    if (!order) return;

    // Handle refund if payment was made
    if (order.paymentStatus === 'completed') {
      await this.handleRefund(orderId, order.totalAmount);
    }

    // Release reserved inventory
    if (order.items) {
      try {
        const { inventoryService } = await import('./inventoryService');
        
        for (const item of order.items) {
          await inventoryService.releaseReservation(
            item.productId,
            item.quantity,
            orderId
          );
        }
        
        console.log(`✅ Released inventory reservations for cancelled order ${orderId}`);
      } catch (error) {
        console.error(`❌ Failed to release inventory for cancelled order ${orderId}:`, error);
      }
    }
  }

  /**
   * Update partner earnings
   */
  private async updatePartnerEarnings(partnerId: string, amount: number): Promise<void> {
    try {
      console.log(`💰 Updating earnings for partner ${partnerId}: +${amount}`);
      // This would update the partner's earnings in storage
    } catch (error) {
      console.error(`Error updating partner earnings:`, error);
    }
  }

  /**
   * Handle refund
   */
  private async handleRefund(orderId: string, amount: number): Promise<void> {
    try {
      console.log(`💸 Processing refund for order ${orderId}: ${amount}`);
      // This would handle the refund process
    } catch (error) {
      console.error(`Error processing refund:`, error);
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(): Promise<any> {
    return await orderWorkflowService.getWorkflowStats();
  }

  /**
   * Get order workflow status
   */
  async getOrderWorkflowStatus(orderId: string): Promise<any> {
    try {
      const order = await this.storage.getOrderById(orderId);
      if (!order) {
        return null;
      }

      return {
        orderId,
        currentStatus: order.status,
        paymentStatus: order.paymentStatus,
        assignedTo: order.assignedTo,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(order.status)
      };
    } catch (error) {
      console.error(`Error getting workflow status for order ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Calculate estimated delivery time based on current status
   */
  private calculateEstimatedDeliveryTime(status: OrderStatus): number {
    const timeEstimates: Record<OrderStatus, number> = {
      placed: 45,
      confirmed: 40,
      preparing: 25,
      ready: 30,
      assigned: 25,
      picked_up: 20,
      out_for_delivery: 15,
      delivered: 0,
      cancelled: 0,
      failed: 0,
      refunded: 0
    };

    return timeEstimates[status] || 30;
  }
}
