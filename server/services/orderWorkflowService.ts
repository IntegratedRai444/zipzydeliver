import { EventEmitter } from 'events';

export type OrderStatus = 
  | 'placed'           // Order just created
  | 'confirmed'        // Payment confirmed, order accepted
  | 'preparing'        // Kitchen/warehouse preparing order
  | 'ready'           // Order ready for pickup
  | 'assigned'        // Delivery partner assigned
  | 'picked_up'       // Partner picked up order
  | 'out_for_delivery' // Partner on the way
  | 'delivered'       // Order delivered successfully
  | 'cancelled'       // Order cancelled
  | 'failed'          // Delivery failed
  | 'refunded';       // Order refunded

export interface OrderTransition {
  from: OrderStatus;
  to: OrderStatus;
  trigger: 'automatic' | 'manual' | 'timeout' | 'payment' | 'partner_action';
  conditions?: {
    paymentRequired?: boolean;
    partnerRequired?: boolean;
    timeLimit?: number; // minutes
    autoTransition?: boolean;
  };
  actions?: {
    notifyCustomer?: boolean;
    notifyPartner?: boolean;
    notifyAdmin?: boolean;
    updateInventory?: boolean;
    generateInvoice?: boolean;
    updateAnalytics?: boolean;
  };
}

export interface OrderWorkflowConfig {
  statusTransitions: OrderTransition[];
  timeouts: {
    [key in OrderStatus]?: number; // minutes
  };
  notifications: {
    customer: boolean;
    partner: boolean;
    admin: boolean;
  };
}

export class OrderWorkflowService extends EventEmitter {
  private config: OrderWorkflowConfig;
  private activeOrders: Map<string, NodeJS.Timeout> = new Map();
  private storage: any | null = null;

  constructor() {
    super();
    this.config = this.getDefaultConfig();
  }

  /**
   * Inject storage so the workflow can read/write real orders
   */
  setStorage(storage: any) {
    this.storage = storage;
  }

  private getDefaultConfig(): OrderWorkflowConfig {
    return {
      statusTransitions: [
        // Placed → Confirmed (after payment)
        {
          from: 'placed',
          to: 'confirmed',
          trigger: 'payment',
          conditions: {
            paymentRequired: true,
            autoTransition: true
          },
          actions: {
            notifyCustomer: true,
            notifyAdmin: true,
            updateInventory: true
          }
        },

        // Confirmed → Preparing (automatic after 2 minutes)
        {
          from: 'confirmed',
          to: 'preparing',
          trigger: 'automatic',
          conditions: {
            timeLimit: 2,
            autoTransition: true
          },
          actions: {
            notifyCustomer: true,
            notifyAdmin: true
          }
        },

        // Preparing → Ready (automatic after 15 minutes)
        {
          from: 'preparing',
          to: 'ready',
          trigger: 'automatic',
          conditions: {
            timeLimit: 15,
            autoTransition: true
          },
          actions: {
            notifyCustomer: true,
            notifyPartner: true,
            notifyAdmin: true
          }
        },

        // Ready → Assigned (when partner accepts)
        {
          from: 'ready',
          to: 'assigned',
          trigger: 'partner_action',
          conditions: {
            partnerRequired: true,
            autoTransition: false
          },
          actions: {
            notifyCustomer: true,
            notifyPartner: true,
            notifyAdmin: true
          }
        },

        // Assigned → Picked Up (when partner picks up)
        {
          from: 'assigned',
          to: 'picked_up',
          trigger: 'partner_action',
          conditions: {
            partnerRequired: true,
            autoTransition: false
          },
          actions: {
            notifyCustomer: true,
            notifyPartner: true,
            notifyAdmin: true
          }
        },

        // Picked Up → Out for Delivery (automatic after 1 minute)
        {
          from: 'picked_up',
          to: 'out_for_delivery',
          trigger: 'automatic',
          conditions: {
            timeLimit: 1,
            autoTransition: true
          },
          actions: {
            notifyCustomer: true,
            notifyPartner: true
          }
        },

        // Out for Delivery → Delivered (when partner confirms)
        {
          from: 'out_for_delivery',
          to: 'delivered',
          trigger: 'partner_action',
          conditions: {
            partnerRequired: true,
            autoTransition: false
          },
          actions: {
            notifyCustomer: true,
            notifyPartner: true,
            notifyAdmin: true,
            generateInvoice: true,
            updateAnalytics: true
          }
        }
      ],
      timeouts: {
        placed: 10,        // Cancel if no payment in 10 minutes
        confirmed: 2,      // Auto-transition to preparing
        preparing: 15,     // Auto-transition to ready
        ready: 30,         // Alert if no partner assigned
        assigned: 5,       // Alert if not picked up
        picked_up: 1,      // Auto-transition to out for delivery
        out_for_delivery: 45 // Alert if delivery taking too long
      },
      notifications: {
        customer: true,
        partner: true,
        admin: true
      }
    };
  }

  /**
   * Initialize order workflow
   */
  async initializeOrder(orderId: string, initialStatus: OrderStatus = 'placed'): Promise<void> {
    console.log(`🔄 Initializing order workflow for order ${orderId} with status: ${initialStatus}`);
    
    // Set up timeout for initial status
    this.setupTimeout(orderId, initialStatus);
    
    // Emit order initialized event
    this.emit('orderInitialized', { orderId, status: initialStatus });
  }

  /**
   * Transition order to new status
   */
  async transitionOrder(
    orderId: string, 
    newStatus: OrderStatus, 
    trigger: 'automatic' | 'manual' | 'timeout' | 'payment' | 'partner_action' = 'manual',
    metadata?: any
  ): Promise<boolean> {
    try {
      console.log(`🔄 Transitioning order ${orderId} to ${newStatus} (trigger: ${trigger})`);
      
      // Get current order status
      const currentStatus = await this.getOrderStatus(orderId);
      if (!currentStatus) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Find valid transition
      const transition = this.findValidTransition(currentStatus, newStatus, trigger);
      if (!transition) {
        console.warn(`❌ Invalid transition: ${currentStatus} → ${newStatus} (trigger: ${trigger})`);
        return false;
      }

      // Check conditions
      if (!await this.checkTransitionConditions(orderId, transition)) {
        console.warn(`❌ Transition conditions not met for order ${orderId}`);
        return false;
      }

      // Update order status
      await this.updateOrderStatus(orderId, newStatus, metadata);
      
      // Clear previous timeout
      this.clearTimeout(orderId);
      
      // Set up new timeout
      this.setupTimeout(orderId, newStatus);
      
      // Execute transition actions
      await this.executeTransitionActions(orderId, transition, metadata);
      
      // Emit transition event
      this.emit('orderTransitioned', {
        orderId,
        from: currentStatus,
        to: newStatus,
        trigger,
        metadata
      });

      console.log(`✅ Order ${orderId} successfully transitioned to ${newStatus}`);
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to transition order ${orderId}:`, error);
      return false;
    }
  }

  /**
   * Find valid transition
   */
  private findValidTransition(
    fromStatus: OrderStatus, 
    toStatus: OrderStatus, 
    trigger: string
  ): OrderTransition | null {
    return this.config.statusTransitions.find(transition => 
      transition.from === fromStatus &&
      transition.to === toStatus &&
      transition.trigger === trigger
    ) || null;
  }

  /**
   * Check if transition conditions are met
   */
  private async checkTransitionConditions(orderId: string, transition: OrderTransition): Promise<boolean> {
    const { conditions } = transition;
    if (!conditions) return true;

    // Check payment requirement
    if (conditions.paymentRequired) {
      const order = await this.getOrder(orderId);
      if (!order || order.paymentStatus !== 'completed') {
        return false;
      }
    }

    // Check partner requirement
    if (conditions.partnerRequired) {
      const order = await this.getOrder(orderId);
      if (!order || !order.assignedTo) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute transition actions
   */
  private async executeTransitionActions(
    orderId: string, 
    transition: OrderTransition, 
    metadata?: any
  ): Promise<void> {
    const { actions } = transition;
    if (!actions) return;

    const order = await this.getOrder(orderId);
    if (!order) return;

    // Send notifications
    if (actions.notifyCustomer) {
      await this.sendCustomerNotification(orderId, transition.to, order);
    }
    
    if (actions.notifyPartner && order.assignedTo) {
      await this.sendPartnerNotification(orderId, transition.to, order);
    }
    
    if (actions.notifyAdmin) {
      await this.sendAdminNotification(orderId, transition.to, order);
    }

    // Update inventory
    if (actions.updateInventory) {
      await this.updateInventory(orderId);
    }

    // Generate invoice
    if (actions.generateInvoice) {
      await this.generateInvoice(orderId);
    }

    // Update analytics
    if (actions.updateAnalytics) {
      await this.updateAnalytics(orderId, transition.to);
    }
  }

  /**
   * Set up timeout for status
   */
  private setupTimeout(orderId: string, status: OrderStatus): void {
    const timeoutMinutes = this.config.timeouts[status];
    if (!timeoutMinutes) return;

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeout = setTimeout(async () => {
      console.log(`⏰ Timeout triggered for order ${orderId} in status ${status}`);
      
      // Handle timeout based on status
      await this.handleTimeout(orderId, status);
      
      // Remove from active orders
      this.activeOrders.delete(orderId);
    }, timeoutMs);

    this.activeOrders.set(orderId, timeout);
  }

  /**
   * Clear timeout for order
   */
  private clearTimeout(orderId: string): void {
    const timeout = this.activeOrders.get(orderId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeOrders.delete(orderId);
    }
  }

  /**
   * Handle timeout for different statuses
   */
  private async handleTimeout(orderId: string, status: OrderStatus): Promise<void> {
    switch (status) {
      case 'placed':
        // Cancel order if no payment
        await this.transitionOrder(orderId, 'cancelled', 'timeout');
        break;
        
      case 'confirmed':
        // Auto-transition to preparing
        await this.transitionOrder(orderId, 'preparing', 'automatic');
        break;
        
      case 'preparing':
        // Auto-transition to ready
        await this.transitionOrder(orderId, 'ready', 'automatic');
        break;
        
      case 'picked_up':
        // Auto-transition to out for delivery
        await this.transitionOrder(orderId, 'out_for_delivery', 'automatic');
        break;
        
      case 'ready':
        // Alert admin about no partner assignment
        await this.sendAdminAlert(orderId, 'No partner assigned within timeout');
        break;
        
      case 'assigned':
        // Alert about pickup delay
        await this.sendPartnerAlert(orderId, 'Pickup delay detected');
        break;
        
      case 'out_for_delivery':
        // Alert about delivery delay
        await this.sendPartnerAlert(orderId, 'Delivery taking longer than expected');
        break;
    }
  }

  /**
   * Get order status from storage
   */
  private async getOrderStatus(orderId: string): Promise<OrderStatus | null> {
    try {
      if (!this.storage) return 'placed';
      const order = await this.storage.getOrderById(orderId);
      return (order?.status as OrderStatus) || null;
    } catch (error) {
      console.error(`Error getting order status for ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Get order details from storage
   */
  private async getOrder(orderId: string): Promise<any> {
    try {
      if (!this.storage) return null;
      return await this.storage.getOrderById(orderId);
    } catch (error) {
      console.error(`Error getting order for ${orderId}:`, error);
      return null;
    }
  }

  /**
   * Update order status in storage
   */
  private async updateOrderStatus(orderId: string, status: OrderStatus, metadata?: any): Promise<void> {
    try {
      console.log(`📝 Updating order ${orderId} status to ${status}`, metadata);
      if (!this.storage) return;
      const existing = await this.storage.getOrderById(orderId);
      const updates = {
        ...(existing || {}),
        status,
        updatedAt: new Date(),
        ...(metadata || {})
      };
      await this.storage.updateOrder(orderId, updates);
    } catch (error) {
      console.error(`Error updating order status for ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Send customer notification
   */
  private async sendCustomerNotification(orderId: string, status: OrderStatus, order: any): Promise<void> {
    try {
      // Import notification service dynamically to avoid circular dependency
      const { notificationService } = await import('./notificationService');
      
      // Map status to template IDs
      const templateMap: Record<OrderStatus, string> = {
        placed: 'order_placed',
        confirmed: 'order_confirmed',
        preparing: 'order_preparing',
        ready: 'order_ready',
        assigned: 'partner_assigned',
        picked_up: 'order_picked_up',
        out_for_delivery: 'out_for_delivery',
        delivered: 'order_delivered',
        cancelled: 'order_cancelled',
        failed: 'order_failed',
        refunded: 'order_refunded'
      };

      const templateId = templateMap[status];
      if (!templateId || !order.customerId) return;

      // Prepare template variables
      const variables: Record<string, any> = {
        orderNumber: orderId,
        totalAmount: order.totalAmount ? `₹${order.totalAmount}` : ''
      };

      // Add partner-specific variables
      if (status === 'assigned' || status === 'picked_up') {
        // Get partner info if available
        if (order.assignedTo && this.storage?.getUserById) {
          const partner = await this.storage.getUserById(order.assignedTo);
          variables.partnerName = partner ? `${partner.firstName} ${partner.lastName}` : 'Your delivery partner';
        }
        variables.estimatedTime = '25'; // Default estimated time
      }

      // Add ETA for out for delivery
      if (status === 'out_for_delivery') {
        variables.eta = '15-20 minutes';
      }

      // Add cancellation reason if available
      if (status === 'cancelled' && order.cancellationReason) {
        variables.reason = order.cancellationReason;
      }

      // Send notification
      await notificationService.sendNotification(
        order.customerId,
        templateId,
        variables
      );

      console.log(`✅ Customer notification sent for order ${orderId}, status: ${status}`);
      
      // Emit notification event for backwards compatibility
      this.emit('customerNotification', { orderId, status, templateId, variables });

    } catch (error) {
      console.error(`❌ Failed to send customer notification for order ${orderId}:`, error);
      
      // Fallback to simple notification
      const fallbackMessage = `Your order ${orderId} status has been updated to: ${status}`;
      console.log(`📱 Fallback customer notification for order ${orderId}: ${fallbackMessage}`);
      this.emit('customerNotification', { orderId, message: fallbackMessage, status });
    }
  }

  /**
   * Send partner notification
   */
  private async sendPartnerNotification(orderId: string, status: OrderStatus, order: any): Promise<void> {
    const messages: Record<string, string> = {
      ready: 'New order ready for pickup!',
      assigned: 'You have been assigned to deliver this order.',
      picked_up: 'Order picked up successfully. Please deliver within the estimated time.',
      delivered: 'Order delivered successfully! Thank you for your service.',
      preparing: 'Order is being prepared'
    };

    const message = messages[status] || `Order ${orderId} status updated to: ${status}`;
    console.log(`🚚 Partner notification for order ${orderId}: ${message}`);
    
    // Emit notification event
    this.emit('partnerNotification', { orderId, message, status, partnerId: order.assignedTo });
  }

  /**
   * Send admin notification
   */
  private async sendAdminNotification(orderId: string, status: OrderStatus, order: any): Promise<void> {
    const message = `Order ${orderId} status changed to: ${status}`;
    console.log(`👨‍💼 Admin notification: ${message}`);
    
    // Emit notification event
    this.emit('adminNotification', { orderId, message, status });
  }

  /**
   * Send admin alert
   */
  private async sendAdminAlert(orderId: string, message: string): Promise<void> {
    console.log(`🚨 Admin alert for order ${orderId}: ${message}`);
    this.emit('adminAlert', { orderId, message });
  }

  /**
   * Send partner alert
   */
  private async sendPartnerAlert(orderId: string, message: string): Promise<void> {
    console.log(`⚠️ Partner alert for order ${orderId}: ${message}`);
    this.emit('partnerAlert', { orderId, message });
  }

  /**
   * Update inventory (reserve stock when order is confirmed)
   */
  private async updateInventory(orderId: string): Promise<void> {
    try {
      console.log(`📦 Updating inventory for order ${orderId}`);
      
      const order = await this.getOrder(orderId);
      if (!order || !order.items) return;

      // Reserve stock for each item in the order
      for (const item of order.items) {
        // Import inventory service dynamically to avoid circular dependency
        const { inventoryService } = await import('./inventoryService');
        
        const success = await inventoryService.reserveStock(
          item.productId,
          item.quantity,
          orderId
        );

        if (!success) {
          console.warn(`⚠️ Failed to reserve ${item.quantity} units of product ${item.productId} for order ${orderId}`);
          // Could emit an event here for handling inventory shortage
          this.emit('inventoryShortage', {
            orderId,
            productId: item.productId,
            requestedQuantity: item.quantity
          });
        }
      }
      
    } catch (error) {
      console.error(`❌ Inventory update error for order ${orderId}:`, error);
    }
  }

  /**
   * Generate invoice (placeholder)
   */
  private async generateInvoice(orderId: string): Promise<void> {
    console.log(`🧾 Generating invoice for order ${orderId}`);
    // Implement invoice generation logic
  }

  /**
   * Update analytics (placeholder)
   */
  private async updateAnalytics(orderId: string, status: OrderStatus): Promise<void> {
    console.log(`📊 Updating analytics for order ${orderId} with status ${status}`);
    // Implement analytics update logic
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(): Promise<any> {
    return {
      activeOrders: this.activeOrders.size,
      totalTransitions: this.config.statusTransitions.length,
      timeouts: this.config.timeouts,
      notifications: this.config.notifications
    };
  }

  /**
   * Stop workflow for order
   */
  async stopWorkflow(orderId: string): Promise<void> {
    this.clearTimeout(orderId);
    console.log(`🛑 Workflow stopped for order ${orderId}`);
  }
}

export const orderWorkflowService = new OrderWorkflowService();
