import { db } from './db';

export interface VoiceCommand {
  type: 'delivery_update' | 'status_change' | 'location_update' | 'help_request';
  content: string;
  confidence: number;
  timestamp: Date;
  userId: string;
}

export interface VoiceResponse {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
}

export interface DeliveryUpdate {
  orderId: string;
  status: 'picked_up' | 'in_transit' | 'delivered' | 'failed' | 'returned';
  location?: string;
  notes?: string;
  timestamp: Date;
}

export class VoiceAIService {
  private readonly COMMAND_PATTERNS = {
    delivery_update: [
      /delivered (?:order|package) (\w+)/i,
      /picked up (?:order|package) (\w+)/i,
      /order (\w+) (delivered|picked up|in transit)/i,
      /status (delivered|picked up|in transit) for (\w+)/i
    ],
    status_change: [
      /change status to (\w+)/i,
      /update status (\w+)/i,
      /set status (\w+)/i
    ],
    location_update: [
      /at (\w+)/i,
      /location (\w+)/i,
      /currently at (\w+)/i
    ],
    help_request: [
      /help/i,
      /what can i say/i,
      /commands/i,
      /assistance/i
    ]
  };

  private readonly STATUS_MAPPINGS = {
    'delivered': 'delivered',
    'delivery': 'delivered',
    'dropped': 'delivered',
    'completed': 'delivered',
    'picked up': 'picked_up',
    'picked': 'picked_up',
    'collected': 'picked_up',
    'in transit': 'in_transit',
    'transit': 'in_transit',
    'on the way': 'in_transit',
    'moving': 'in_transit',
    'failed': 'failed',
    'failure': 'failed',
    'could not deliver': 'failed',
    'returned': 'returned',
    'return': 'returned',
    'going back': 'returned'
  };

  constructor() {}

  // Process voice input and extract commands
  async processVoiceInput(
    audioText: string,
    userId: string
  ): Promise<VoiceResponse> {
    try {
      const command = this.parseVoiceCommand(audioText, userId);
      
      if (!command) {
        return {
          success: false,
          message: "I couldn't understand that command. Try saying 'help' for available commands."
        };
      }

      // Execute the command
      switch (command.type) {
        case 'delivery_update':
          return await this.handleDeliveryUpdate(command, userId);
        case 'status_change':
          return await this.handleStatusChange(command, userId);
        case 'location_update':
          return await this.handleLocationUpdate(command, userId);
        case 'help_request':
          return this.handleHelpRequest();
        default:
          return {
            success: false,
            message: "Unknown command type"
          };
      }

    } catch (error) {
      console.error('Voice AI processing error:', error);
      return {
        success: false,
        message: "Sorry, I encountered an error processing your request. Please try again."
      };
    }
  }

  // Parse voice input to extract command type and content
  private parseVoiceCommand(audioText: string, userId: string): VoiceCommand | null {
    const text = audioText.toLowerCase().trim();
    
    // Check each command pattern
    for (const [commandType, patterns] of Object.entries(this.COMMAND_PATTERNS)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return {
            type: commandType as any,
            content: text,
            confidence: this.calculateConfidence(text, pattern),
            timestamp: new Date(),
            userId
          };
        }
      }
    }

    // Check for partial matches with lower confidence
    const partialMatch = this.findPartialMatch(text);
    if (partialMatch) {
      return {
        type: partialMatch.type as 'delivery_update' | 'status_change' | 'location_update' | 'help_request',
        content: text,
        confidence: 0.6, // Lower confidence for partial matches
        timestamp: new Date(),
        userId
      };
    }

    return null;
  }

  // Find partial matches for commands
  private findPartialMatch(text: string): { type: string } | null {
    const words = text.split(/\s+/);
    
    // Check for key words
    if (words.some(word => ['delivered', 'delivery', 'dropped'].includes(word))) {
      return { type: 'delivery_update' };
    }
    
    if (words.some(word => ['picked', 'collected', 'got'].includes(word))) {
      return { type: 'delivery_update' };
    }
    
    if (words.some(word => ['status', 'update', 'change'].includes(word))) {
      return { type: 'status_change' };
    }
    
    if (words.some(word => ['at', 'location', 'here'].includes(word))) {
      return { type: 'location_update' };
    }
    
    if (words.some(word => ['help', 'assist', 'command'].includes(word))) {
      return { type: 'help_request' };
    }
    
    return null;
  }

  // Calculate confidence score for voice recognition
  private calculateConfidence(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    if (!match) return 0;
    
    let confidence = 0.8; // Base confidence
    
    // Adjust based on text length and clarity
    if (text.length < 10) confidence -= 0.1;
    if (text.length > 50) confidence -= 0.1;
    
    // Check for common delivery terms
    const deliveryTerms = ['order', 'package', 'delivery', 'delivered', 'picked'];
    const hasDeliveryTerms = deliveryTerms.some(term => text.includes(term));
    if (hasDeliveryTerms) confidence += 0.1;
    
    // Check for clear status words
    const statusWords = ['delivered', 'picked', 'transit', 'failed', 'returned'];
    const hasStatusWords = statusWords.some(word => text.includes(word));
    if (hasStatusWords) confidence += 0.1;
    
    return Math.min(confidence, 0.95);
  }

  // Handle delivery status updates
  private async handleDeliveryUpdate(command: VoiceCommand, userId: string): Promise<VoiceResponse> {
    try {
      const text = command.content.toLowerCase();
      
      // Extract order ID and status
      const orderMatch = text.match(/(?:order|package)\s+(\w+)/i);
      const statusMatch = text.match(/(delivered|picked up|in transit|failed|returned)/i);
      
      if (!orderMatch || !statusMatch) {
        return {
          success: false,
          message: "Please specify the order ID and status. Example: 'Order ABC123 delivered'"
        };
      }
      
      const orderId = orderMatch[1];
      const statusText = statusMatch[1];
      const mappedStatus = this.STATUS_MAPPINGS[statusText.toLowerCase() as keyof typeof this.STATUS_MAPPINGS];
      
      if (!mappedStatus) {
        return {
          success: false,
          message: `Unknown status: ${statusText}. Valid statuses are: delivered, picked up, in transit, failed, returned`
        };
      }

      // Update order status in database
      await this.updateOrderStatus(orderId, mappedStatus, userId);
      
      return {
        success: true,
        message: `Order ${orderId} status updated to ${mappedStatus}`,
        action: 'status_updated',
        data: { orderId, status: mappedStatus }
      };

    } catch (error) {
      console.error('Delivery update error:', error);
      return {
        success: false,
        message: "Failed to update delivery status. Please try again or contact support."
      };
    }
  }

  // Handle general status changes
  private async handleStatusChange(command: VoiceCommand, userId: string): Promise<VoiceResponse> {
    try {
      const text = command.content.toLowerCase();
      
      // Extract status from command
      const statusMatch = text.match(/(delivered|picked up|in transit|failed|returned)/i);
      
      if (!statusMatch) {
        return {
          success: false,
          message: "Please specify the status. Example: 'Change status to delivered'"
        };
      }
      
      const statusText = statusMatch[1];
      const mappedStatus = this.STATUS_MAPPINGS[statusText.toLowerCase() as keyof typeof this.STATUS_MAPPINGS];
      
      if (!mappedStatus) {
        return {
          success: false,
          message: `Unknown status: ${statusText}. Valid statuses are: delivered, picked up, in transit, failed, returned`
        };
      }

      // Get user's active orders
      const activeOrders = await this.getActiveOrders(userId);
      
      if (activeOrders.length === 0) {
        return {
          success: false,
          message: "You don't have any active orders to update."
        };
      }

      if (activeOrders.length === 1) {
        // Single active order - update it
        const orderId = activeOrders[0].id;
        await this.updateOrderStatus(orderId, mappedStatus, userId);
        
        return {
          success: true,
          message: `Updated your active order ${orderId} to ${mappedStatus}`,
          action: 'status_updated',
          data: { orderId, status: mappedStatus }
        };
      } else {
        // Multiple active orders - ask for clarification
        return {
          success: false,
          message: `You have ${activeOrders.length} active orders. Please specify which one: 'Order [ID] ${mappedStatus}'`,
          action: 'clarification_needed',
          data: { activeOrders: activeOrders.map(o => ({ id: o.id, orderNumber: o.orderNumber })) }
        };
      }

    } catch (error) {
      console.error('Status change error:', error);
      return {
        success: false,
        message: "Failed to change status. Please try again."
      };
    }
  }

  // Handle location updates
  private async handleLocationUpdate(command: VoiceCommand, userId: string): Promise<VoiceResponse> {
    try {
      const text = command.content.toLowerCase();
      
      // Extract location from command
      const locationMatch = text.match(/(?:at|location|currently at)\s+(.+)/i);
      
      if (!locationMatch) {
        return {
          success: false,
          message: "Please specify your location. Example: 'At Hostel 3' or 'Location Main Gate'"
        };
      }
      
      const location = locationMatch[1].trim();
      
      // Update user's current location
      await this.updateUserLocation(userId, location);
      
      return {
        success: true,
        message: `Location updated to: ${location}`,
        action: 'location_updated',
        data: { location }
      };

    } catch (error) {
      console.error('Location update error:', error);
      return {
        success: false,
        message: "Failed to update location. Please try again."
      };
    }
  }

  // Handle help requests
  private handleHelpRequest(): VoiceResponse {
    const helpText = `
      Here are the voice commands you can use:
      
      Delivery Updates:
      - "Order ABC123 delivered"
      - "Picked up package XYZ789"
      - "Status delivered for order DEF456"
      
      Status Changes:
      - "Change status to in transit"
      - "Update status delivered"
      
      Location Updates:
      - "At Hostel 3"
      - "Location Main Gate"
      - "Currently at Library"
      
      Other:
      - "Help" - Show this message
      - "What can I say" - List commands
    `.trim();

    return {
      success: true,
      message: helpText,
      action: 'help_displayed'
    };
  }

  // Update order status in database
  private async updateOrderStatus(orderId: string, status: string, userId: string): Promise<void> {
    try {
      // In production, this would update the actual database
      // For now, we'll just log the update
      console.log(`Voice AI: Updating order ${orderId} to status ${status} by user ${userId}`);
      
      // You would typically call:
      // await storage.updateOrderStatus(orderId, status);
      // await storage.createOrderTracking({ orderId, status, updatedBy: userId });
      
    } catch (error) {
      console.error('Failed to update order status:', error);
      throw error;
    }
  }

  // Get user's active orders
  private async getActiveOrders(userId: string): Promise<any[]> {
    try {
      // In production, this would query the actual database
      // For now, return mock data
      return [
        { id: 'order_123', orderNumber: 'ORD001', status: 'in_transit' },
        { id: 'order_124', orderNumber: 'ORD002', status: 'picked_up' }
      ];
      
      // You would typically call:
      // return await storage.getOrdersByDeliveryPartner(userId, ['picked_up', 'in_transit']);
      
    } catch (error) {
      console.error('Failed to get active orders:', error);
      return [];
    }
  }

  // Update user's current location
  private async updateUserLocation(userId: string, location: string): Promise<void> {
    try {
      // In production, this would update the actual database
      // For now, we'll just log the update
      console.log(`Voice AI: Updating user ${userId} location to ${location}`);
      
      // You would typically call:
      // await storage.updateDeliveryPartnerLocation(userId, location);
      
    } catch (error) {
      console.error('Failed to update user location:', error);
      throw error;
    }
  }

  // Get available voice commands for a user
  async getAvailableCommands(userId: string): Promise<string[]> {
    try {
      const commands = [
        'Order [ID] delivered',
        'Order [ID] picked up',
        'Order [ID] in transit',
        'Change status to [status]',
        'At [location]',
        'Location [location]',
        'Help'
      ];
      
      // Add user-specific commands based on their role and active orders
      const activeOrders = await this.getActiveOrders(userId);
      if (activeOrders.length > 0) {
        commands.push(`Update order ${activeOrders[0].orderNumber}`);
        commands.push(`Status for ${activeOrders[0].orderNumber}`);
      }
      
      return commands;
      
    } catch (error) {
      console.error('Failed to get available commands:', error);
      return [];
    }
  }

  // Validate voice command before processing
  async validateCommand(command: VoiceCommand): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    if (!command.content || command.content.trim().length < 3) {
      errors.push('Command too short');
    }
    
    if (command.confidence < 0.5) {
      errors.push('Low confidence in voice recognition');
    }
    
    if (command.type === 'delivery_update') {
      // Check if order ID format is valid
      const orderMatch = command.content.match(/(?:order|package)\s+(\w+)/i);
      if (!orderMatch) {
        errors.push('Order ID not specified');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const voiceAI = new VoiceAIService();
