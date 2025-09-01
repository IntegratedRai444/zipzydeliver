import { EventEmitter } from 'events';

export interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  type: 'order' | 'delivery' | 'payment' | 'system' | 'promotion';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'sms' | 'email' | 'in_app')[];
  variables: string[]; // Template variables like {orderNumber}, {customerName}
}

export interface NotificationPayload {
  userId: string;
  templateId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  channels: ('push' | 'sms' | 'email' | 'in_app')[];
  scheduleAt?: Date;
  expiresAt?: Date;
}

export interface PushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  body: string;
  channels: string[];
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface NotificationPreferences {
  userId: string;
  orderUpdates: boolean;
  deliveryUpdates: boolean;
  paymentAlerts: boolean;
  promotions: boolean;
  systemNotifications: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

export class NotificationService extends EventEmitter {
  private storage: any;
  private pushSubscriptions: Map<string, PushSubscription[]> = new Map();
  private notificationHistory: NotificationHistory[] = [];
  private templates: Map<string, NotificationTemplate> = new Map();
  private userPreferences: Map<string, NotificationPreferences> = new Map();
  private vapidKeys: { publicKey: string; privateKey: string } | null = null;

  constructor(storage: any) {
    super();
    this.storage = storage;
    this.initializeTemplates();
    this.startCleanupInterval();
  }

  /**
   * Set storage instance
   */
  setStorage(storage: any): void {
    this.storage = storage;
    console.log('🔔 Notification service storage updated');
  }

  /**
   * Initialize default notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      {
        id: 'order_placed',
        name: 'Order Placed',
        title: 'Order Confirmed!',
        body: 'Your order #{orderNumber} has been placed successfully. Total: ₹{totalAmount}',
        type: 'order',
        priority: 'medium',
        channels: ['push', 'in_app'],
        variables: ['orderNumber', 'totalAmount']
      },
      {
        id: 'order_confirmed',
        name: 'Order Confirmed',
        title: 'Payment Received!',
        body: 'Your order #{orderNumber} payment has been confirmed. We\'re preparing your order now.',
        type: 'order',
        priority: 'high',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber']
      },
      {
        id: 'order_preparing',
        name: 'Order Preparing',
        title: 'Order Being Prepared',
        body: 'Great news! Your order #{orderNumber} is now being prepared.',
        type: 'order',
        priority: 'medium',
        channels: ['push', 'in_app'],
        variables: ['orderNumber']
      },
      {
        id: 'order_ready',
        name: 'Order Ready',
        title: 'Order Ready for Pickup!',
        body: 'Your order #{orderNumber} is ready. A delivery partner will be assigned shortly.',
        type: 'order',
        priority: 'high',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber']
      },
      {
        id: 'partner_assigned',
        name: 'Partner Assigned',
        title: 'Delivery Partner Assigned',
        body: '{partnerName} will deliver your order #{orderNumber}. Estimated time: {estimatedTime} mins.',
        type: 'delivery',
        priority: 'high',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber', 'partnerName', 'estimatedTime']
      },
      {
        id: 'order_picked_up',
        name: 'Order Picked Up',
        title: 'Order Picked Up!',
        body: '{partnerName} has picked up your order #{orderNumber} and is on the way!',
        type: 'delivery',
        priority: 'high',
        channels: ['push', 'in_app'],
        variables: ['orderNumber', 'partnerName']
      },
      {
        id: 'out_for_delivery',
        name: 'Out for Delivery',
        title: 'Order Out for Delivery',
        body: 'Your order #{orderNumber} is out for delivery. ETA: {eta}',
        type: 'delivery',
        priority: 'high',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber', 'eta']
      },
      {
        id: 'order_delivered',
        name: 'Order Delivered',
        title: 'Order Delivered! 🎉',
        body: 'Your order #{orderNumber} has been delivered successfully. Enjoy your meal!',
        type: 'delivery',
        priority: 'high',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber']
      },
      {
        id: 'order_cancelled',
        name: 'Order Cancelled',
        title: 'Order Cancelled',
        body: 'Your order #{orderNumber} has been cancelled. {reason}',
        type: 'order',
        priority: 'high',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber', 'reason']
      },
      {
        id: 'payment_failed',
        name: 'Payment Failed',
        title: 'Payment Failed',
        body: 'Payment for order #{orderNumber} failed. Please try again or contact support.',
        type: 'payment',
        priority: 'urgent',
        channels: ['push', 'sms', 'in_app'],
        variables: ['orderNumber']
      },
      {
        id: 'low_stock_alert',
        name: 'Low Stock Alert',
        title: 'Low Stock Alert',
        body: '{productName} is running low in stock ({currentStock} remaining).',
        type: 'system',
        priority: 'medium',
        channels: ['in_app'],
        variables: ['productName', 'currentStock']
      },
      {
        id: 'promotion_alert',
        name: 'Promotion Alert',
        title: 'Special Offer!',
        body: '{promoTitle} - Get {discount}% off on your next order. Use code: {promoCode}',
        type: 'promotion',
        priority: 'low',
        channels: ['push', 'in_app'],
        variables: ['promoTitle', 'discount', 'promoCode']
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });

    console.log(`✅ Initialized ${templates.length} notification templates`);
  }

  /**
   * Send notification using template
   */
  async sendNotification(
    userId: string,
    templateId: string,
    variables: Record<string, any> = {},
    options: {
      channels?: ('push' | 'sms' | 'email' | 'in_app')[];
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduleAt?: Date;
      data?: Record<string, any>;
    } = {}
  ): Promise<boolean> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        console.error(`❌ Template not found: ${templateId}`);
        return false;
      }

      // Check user preferences
      const preferences = await this.getUserPreferences(userId);
      if (!this.shouldSendNotification(template, preferences)) {
        console.log(`🔕 Notification skipped due to user preferences: ${templateId} for user ${userId}`);
        return false;
      }

      // Process template variables
      const title = this.processTemplate(template.title, variables);
      const body = this.processTemplate(template.body, variables);

      // Determine channels to use
      const channels = options.channels || template.channels;
      const filteredChannels = this.filterChannelsByPreferences(channels, preferences);

      if (filteredChannels.length === 0) {
        console.log(`🔕 No enabled channels for notification: ${templateId} for user ${userId}`);
        return false;
      }

      // Create notification payload
      const payload: NotificationPayload = {
        userId,
        templateId,
        title,
        body,
        data: options.data,
        priority: options.priority || template.priority,
        channels: filteredChannels,
        scheduleAt: options.scheduleAt,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours default
      };

      // Check quiet hours
      if (this.isQuietHours(preferences) && payload.priority !== 'urgent') {
        payload.scheduleAt = this.getNextActiveTime(preferences);
        console.log(`🔕 Scheduled notification for after quiet hours: ${payload.scheduleAt}`);
      }

      // Send notification
      const success = await this.deliverNotification(payload);

      // Record in history
      await this.recordNotificationHistory(payload, success);

      if (success) {
        console.log(`✅ Notification sent successfully: ${templateId} to user ${userId}`);
        this.emit('notificationSent', { userId, templateId, payload });
      }

      return success;

    } catch (error) {
      console.error(`❌ Failed to send notification ${templateId} to user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Send custom notification (without template)
   */
  async sendCustomNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(payload.userId);
      
      // Filter channels by preferences
      payload.channels = this.filterChannelsByPreferences(payload.channels, preferences);

      if (payload.channels.length === 0) {
        console.log(`🔕 No enabled channels for custom notification to user ${payload.userId}`);
        return false;
      }

      // Check quiet hours
      if (this.isQuietHours(preferences) && payload.priority !== 'urgent') {
        payload.scheduleAt = this.getNextActiveTime(preferences);
      }

      const success = await this.deliverNotification(payload);
      await this.recordNotificationHistory(payload, success);

      return success;

    } catch (error) {
      console.error(`❌ Failed to send custom notification to user ${payload.userId}:`, error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush(userId: string, subscription: Omit<PushSubscription, 'userId' | 'createdAt' | 'isActive'>): Promise<boolean> {
    try {
      const pushSub: PushSubscription = {
        ...subscription,
        userId,
        createdAt: new Date(),
        isActive: true
      };

      // Get existing subscriptions for user
      const userSubs = this.pushSubscriptions.get(userId) || [];
      
      // Check if subscription already exists
      const existingIndex = userSubs.findIndex(sub => sub.endpoint === subscription.endpoint);
      
      if (existingIndex >= 0) {
        // Update existing subscription
        userSubs[existingIndex] = pushSub;
      } else {
        // Add new subscription
        userSubs.push(pushSub);
      }

      this.pushSubscriptions.set(userId, userSubs);

      // Store in database
      if (this.storage?.storePushSubscription) {
        await this.storage.storePushSubscription(pushSub);
      }

      console.log(`✅ Push subscription added for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to subscribe user ${userId} to push notifications:`, error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribeFromPush(userId: string, endpoint: string): Promise<boolean> {
    try {
      const userSubs = this.pushSubscriptions.get(userId) || [];
      const filteredSubs = userSubs.filter(sub => sub.endpoint !== endpoint);
      
      this.pushSubscriptions.set(userId, filteredSubs);

      // Update database
      if (this.storage?.removePushSubscription) {
        await this.storage.removePushSubscription(userId, endpoint);
      }

      console.log(`✅ Push subscription removed for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to unsubscribe user ${userId} from push notifications:`, error);
      return false;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    try {
      const existing = this.userPreferences.get(userId) || this.getDefaultPreferences(userId);
      const updated = { ...existing, ...preferences };
      
      this.userPreferences.set(userId, updated);

      // Store in database
      if (this.storage?.storeNotificationPreferences) {
        await this.storage.storeNotificationPreferences(updated);
      }

      console.log(`✅ Updated notification preferences for user ${userId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to update preferences for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = this.userPreferences.get(userId);
    
    if (!preferences) {
      // Try to load from database
      if (this.storage?.getNotificationPreferences) {
        preferences = await this.storage.getNotificationPreferences(userId);
      }
      
      // Use defaults if not found
      if (!preferences) {
        preferences = this.getDefaultPreferences(userId);
      }
      
      this.userPreferences.set(userId, preferences);
    }
    
    return preferences;
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      userId,
      orderUpdates: true,
      deliveryUpdates: true,
      paymentAlerts: true,
      promotions: true,
      systemNotifications: true,
      pushEnabled: true,
      smsEnabled: true,
      emailEnabled: true,
      quietHours: {
        enabled: false,
        startTime: '23:00',
        endTime: '07:00'
      }
    };
  }

  /**
   * Process template with variables
   */
  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return processed;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(template: NotificationTemplate, preferences: NotificationPreferences): boolean {
    switch (template.type) {
      case 'order':
        return preferences.orderUpdates;
      case 'delivery':
        return preferences.deliveryUpdates;
      case 'payment':
        return preferences.paymentAlerts;
      case 'promotion':
        return preferences.promotions;
      case 'system':
        return preferences.systemNotifications;
      default:
        return true;
    }
  }

  /**
   * Filter channels based on user preferences
   */
  private filterChannelsByPreferences(channels: string[], preferences: NotificationPreferences): ('push' | 'sms' | 'email' | 'in_app')[] {
    return channels.filter((channel): channel is 'push' | 'sms' | 'email' | 'in_app' => {
      switch (channel) {
        case 'push':
          return preferences.pushEnabled;
        case 'sms':
          return preferences.smsEnabled;
        case 'email':
          return preferences.emailEnabled;
        case 'in_app':
          return true; // Always allow in-app notifications
        default:
          return true;
      }
    });
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = preferences.quietHours;
    
    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }

  /**
   * Get next active time after quiet hours
   */
  private getNextActiveTime(preferences: NotificationPreferences): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const [endHour, endMinute] = preferences.quietHours.endTime.split(':').map(Number);
    
    const nextActive = new Date(now);
    nextActive.setHours(endHour, endMinute, 0, 0);
    
    // If end time is today and is in the future, use today
    // Otherwise, use tomorrow
    if (nextActive <= now) {
      nextActive.setDate(nextActive.getDate() + 1);
    }
    
    return nextActive;
  }

  /**
   * Deliver notification through various channels
   */
  private async deliverNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      let success = false;

      // Send through each enabled channel
      for (const channel of payload.channels) {
        try {
          switch (channel) {
            case 'push':
              await this.sendPushNotification(payload);
              success = true;
              break;
            case 'sms':
              await this.sendSMSNotification(payload);
              success = true;
              break;
            case 'email':
              await this.sendEmailNotification(payload);
              success = true;
              break;
            case 'in_app':
              await this.sendInAppNotification(payload);
              success = true;
              break;
          }
        } catch (channelError) {
          console.error(`❌ Failed to send via ${channel}:`, channelError);
        }
      }

      return success;

    } catch (error) {
      console.error('❌ Failed to deliver notification:', error);
      return false;
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<void> {
    const userSubs = this.pushSubscriptions.get(payload.userId) || [];
    
    for (const subscription of userSubs) {
      if (!subscription.isActive) continue;
      
      try {
        // In a real implementation, you would use web-push library here
        console.log(`📱 Push notification sent to ${payload.userId}:`, {
          title: payload.title,
          body: payload.body,
          endpoint: subscription.endpoint.substring(0, 50) + '...'
        });
        
        // Emit event for frontend to handle
        this.emit('pushNotification', {
          userId: payload.userId,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          subscription
        });
        
      } catch (error) {
        console.error(`❌ Failed to send push to subscription:`, error);
        // Mark subscription as inactive if it fails
        subscription.isActive = false;
      }
    }
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(payload: NotificationPayload): Promise<void> {
    // In a real implementation, you would integrate with SMS provider (Twilio, etc.)
    console.log(`📱 SMS notification sent to ${payload.userId}:`, {
      title: payload.title,
      body: payload.body
    });
    
    this.emit('smsNotification', {
      userId: payload.userId,
      message: `${payload.title}\n${payload.body}`
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<void> {
    // In a real implementation, you would integrate with email provider
    console.log(`📧 Email notification sent to ${payload.userId}:`, {
      title: payload.title,
      body: payload.body
    });
    
    this.emit('emailNotification', {
      userId: payload.userId,
      subject: payload.title,
      body: payload.body,
      data: payload.data
    });
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(payload: NotificationPayload): Promise<void> {
    // Store in-app notification
    if (this.storage?.createNotification) {
      await this.storage.createNotification({
        userId: payload.userId,
        type: payload.templateId || 'custom',
        title: payload.title,
        message: payload.body,
        data: payload.data,
        isRead: false
      });
    }
    
    console.log(`🔔 In-app notification created for ${payload.userId}:`, {
      title: payload.title,
      body: payload.body
    });
    
    this.emit('inAppNotification', {
      userId: payload.userId,
      title: payload.title,
      body: payload.body,
      data: payload.data
    });
  }

  /**
   * Record notification in history
   */
  private async recordNotificationHistory(payload: NotificationPayload, success: boolean): Promise<void> {
    const history: NotificationHistory = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: payload.userId,
      templateId: payload.templateId,
      title: payload.title,
      body: payload.body,
      channels: payload.channels,
      status: success ? 'sent' : 'failed',
      sentAt: success ? new Date() : undefined,
      metadata: payload.data
    };

    this.notificationHistory.push(history);

    // Keep only last 1000 notifications in memory
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory.shift();
    }

    // Store in database
    if (this.storage?.recordNotificationHistory) {
      await this.storage.recordNotificationHistory(history);
    }
  }

  /**
   * Get notification history for user
   */
  getNotificationHistory(userId: string, limit: number = 50): NotificationHistory[] {
    return this.notificationHistory
      .filter(notif => notif.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): any {
    const totalNotifications = this.notificationHistory.length;
    const sentCount = this.notificationHistory.filter(n => n.status === 'sent').length;
    const failedCount = this.notificationHistory.filter(n => n.status === 'failed').length;
    
    return {
      totalNotifications,
      sentCount,
      failedCount,
      successRate: totalNotifications > 0 ? (sentCount / totalNotifications * 100).toFixed(2) : 0,
      totalSubscriptions: Array.from(this.pushSubscriptions.values()).reduce((sum, subs) => sum + subs.length, 0),
      activeSubscriptions: Array.from(this.pushSubscriptions.values()).reduce((sum, subs) => sum + subs.filter(s => s.isActive).length, 0),
      totalTemplates: this.templates.size
    };
  }

  /**
   * Start cleanup interval for old data
   */
  private startCleanupInterval(): void {
    // Clean up old notification history every 6 hours
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      this.notificationHistory = this.notificationHistory.filter(notif => 
        notif.sentAt && notif.sentAt > cutoffTime
      );

      // Clean up inactive push subscriptions
      for (const [userId, subs] of Array.from(this.pushSubscriptions.entries())) {
        const activeSubs = subs.filter(sub => (sub as any).isActive !== false);
        this.pushSubscriptions.set(userId, activeSubs);
      }

    }, 6 * 60 * 60 * 1000); // 6 hours
  }
}

export const notificationService = new NotificationService(null);
