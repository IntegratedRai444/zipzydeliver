import { EventEmitter } from 'events';

export interface PartnerAssignmentCriteria {
  distance: number; // km
  rating: number;
  totalDeliveries: number;
  responseTime: number; // seconds
  isOnline: boolean;
}

export interface AssignmentStrategy {
  name: string;
  description: string;
  weight: {
    distance: number;
    rating: number;
    experience: number;
    availability: number;
  };
}

export interface AssignmentResult {
  partnerId: string;
  partnerName: string;
  distance: number;
  estimatedDeliveryTime: number;
  score: number;
  reason: string;
}

export class PartnerAssignmentService extends EventEmitter {
  private storage: any;
  private strategies: Map<string, AssignmentStrategy> = new Map();

  constructor(storage: any) {
    super();
    this.storage = storage;
    this.initializeStrategies();
  }

  /**
   * Set storage instance
   */
  setStorage(storage: any): void {
    this.storage = storage;
    console.log('🚚 Partner assignment service storage updated');
  }

  /**
   * Initialize assignment strategies
   */
  private initializeStrategies(): void {
    // Default strategy: Balance distance and rating
    this.strategies.set('balanced', {
      name: 'Balanced Assignment',
      description: 'Balance between distance, rating, and experience',
      weight: {
        distance: 0.4,    // 40% weight to distance
        rating: 0.3,      // 30% weight to rating
        experience: 0.2,  // 20% weight to experience
        availability: 0.1 // 10% weight to availability
      }
    });

    // Distance-first strategy: Prioritize closest partner
    this.strategies.set('distance_first', {
      name: 'Distance First',
      description: 'Prioritize closest available partner',
      weight: {
        distance: 0.7,
        rating: 0.15,
        experience: 0.1,
        availability: 0.05
      }
    });

    // Quality-first strategy: Prioritize highest rated partners
    this.strategies.set('quality_first', {
      name: 'Quality First',
      description: 'Prioritize highest rated partners',
      weight: {
        distance: 0.2,
        rating: 0.5,
        experience: 0.25,
        availability: 0.05
      }
    });

    console.log(`✅ Initialized ${this.strategies.size} assignment strategies`);
  }

  /**
   * Find and assign the best partner for an order
   */
  async assignBestPartner(
    orderId: string,
    orderLocation: { lat: number; lng: number; address?: string },
    strategy: string = 'balanced',
    maxDistance: number = 5 // km
  ): Promise<AssignmentResult | null> {
    try {
      console.log(`🔍 Finding best partner for order ${orderId} using ${strategy} strategy`);

      // Get available partners
      const availablePartners = await this.getAvailablePartners();
      if (availablePartners.length === 0) {
        console.log(`❌ No available partners found for order ${orderId}`);
        this.emit('noPartnersAvailable', { orderId, orderLocation });
        return null;
      }

      console.log(`📋 Found ${availablePartners.length} available partners`);

      // Calculate scores for each partner
      const partnerScores = await this.calculatePartnerScores(
        availablePartners,
        orderLocation,
        strategy,
        maxDistance
      );

      if (partnerScores.length === 0) {
        console.log(`❌ No partners within ${maxDistance}km of order location`);
        this.emit('noPartnersInRange', { orderId, orderLocation, maxDistance });
        return null;
      }

      // Sort by score (highest first)
      partnerScores.sort((a, b) => b.score - a.score);
      const bestPartner = partnerScores[0];

      console.log(`✅ Best partner found: ${bestPartner.partnerName} (score: ${bestPartner.score.toFixed(2)})`);

      // Assign the order to the best partner
      const success = await this.assignOrderToPartner(orderId, bestPartner.partnerId);
      
      if (success) {
        this.emit('partnerAssigned', {
          orderId,
          partnerId: bestPartner.partnerId,
          assignment: bestPartner
        });

        return bestPartner;
      } else {
        console.error(`❌ Failed to assign order ${orderId} to partner ${bestPartner.partnerId}`);
        return null;
      }

    } catch (error) {
      console.error(`❌ Partner assignment failed for order ${orderId}:`, error);
      this.emit('assignmentFailed', { orderId, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get available partners from storage
   */
  private async getAvailablePartners(): Promise<any[]> {
    try {
      // Try to get from delivery partners collection first
      if (this.storage.getAvailablePartners) {
        const partners = await this.storage.getAvailablePartners();
        if (partners.length > 0) {
          return partners;
        }
      }

      // Fallback: Get all users and filter for potential delivery partners
      const users = await this.storage.getUsers?.() || [];
      return users
        .filter((user: any) => user.email && user.phone) // Basic criteria for being a partner
        .map((user: any) => ({
          id: user.id,
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          vehicleType: 'Walking',
          isActive: true,
          isOnline: true, // Assume online for MVP
          currentLocation: {
            lat: 28.6139 + (Math.random() - 0.5) * 0.01, // Random location near campus
            lng: 77.2090 + (Math.random() - 0.5) * 0.01,
            timestamp: new Date()
          },
          rating: 4.5 + Math.random() * 0.5, // Random rating 4.5-5.0
          totalDeliveries: Math.floor(Math.random() * 100)
        }));

    } catch (error) {
      console.error('❌ Failed to get available partners:', error);
      return [];
    }
  }

  /**
   * Calculate scores for partners based on strategy
   */
  private async calculatePartnerScores(
    partners: any[],
    orderLocation: { lat: number; lng: number },
    strategyName: string,
    maxDistance: number
  ): Promise<AssignmentResult[]> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown assignment strategy: ${strategyName}`);
    }

    const results: AssignmentResult[] = [];

    for (const partner of partners) {
      try {
        // Calculate distance
        const distance = this.calculateDistance(
          orderLocation,
          partner.currentLocation
        );

        // Skip if too far
        if (distance > maxDistance) {
          continue;
        }

        // Calculate individual scores
        const distanceScore = this.calculateDistanceScore(distance, maxDistance);
        const ratingScore = this.calculateRatingScore(partner.rating || 4.5);
        const experienceScore = this.calculateExperienceScore(partner.totalDeliveries || 0);
        const availabilityScore = this.calculateAvailabilityScore(partner);

        // Calculate weighted total score
        const totalScore = (
          distanceScore * strategy.weight.distance +
          ratingScore * strategy.weight.rating +
          experienceScore * strategy.weight.experience +
          availabilityScore * strategy.weight.availability
        );

        // Estimate delivery time
        const estimatedDeliveryTime = this.estimateDeliveryTime(distance, partner.vehicleType);

        results.push({
          partnerId: partner.id || partner.userId,
          partnerName: partner.name,
          distance,
          estimatedDeliveryTime,
          score: totalScore,
          reason: `Distance: ${distance.toFixed(2)}km, Rating: ${(partner.rating || 4.5).toFixed(1)}, Experience: ${partner.totalDeliveries || 0} deliveries`
        });

      } catch (error) {
        console.error(`❌ Error calculating score for partner ${partner.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLon = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate distance score (closer is better)
   */
  private calculateDistanceScore(distance: number, maxDistance: number): number {
    return Math.max(0, (maxDistance - distance) / maxDistance);
  }

  /**
   * Calculate rating score (higher is better)
   */
  private calculateRatingScore(rating: number): number {
    return Math.max(0, (rating - 1) / 4); // Normalize 1-5 rating to 0-1
  }

  /**
   * Calculate experience score (more deliveries is better)
   */
  private calculateExperienceScore(totalDeliveries: number): number {
    // Logarithmic scale for experience, maxing out at 100 deliveries
    return Math.min(1, Math.log(totalDeliveries + 1) / Math.log(101));
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(partner: any): number {
    let score = 0;
    
    // Base score for being online
    if (partner.isOnline) score += 0.5;
    if (partner.isActive) score += 0.3;
    
    // Bonus for recent activity
    if (partner.currentLocation?.timestamp) {
      const timeSinceUpdate = Date.now() - new Date(partner.currentLocation.timestamp).getTime();
      const hoursAgo = timeSinceUpdate / (1000 * 60 * 60);
      if (hoursAgo < 1) score += 0.2; // Recently active
    }
    
    return Math.min(1, score);
  }

  /**
   * Estimate delivery time based on distance and vehicle type
   */
  private estimateDeliveryTime(distance: number, vehicleType: string): number {
    const speeds = {
      'Walking': 5,      // 5 km/h
      'Bicycle': 15,     // 15 km/h
      'Bike': 25,        // 25 km/h
      'Scooter': 30,     // 30 km/h
      'Car': 40          // 40 km/h (in city traffic)
    };

    const speed = speeds[vehicleType as keyof typeof speeds] || speeds.Walking;
    const timeHours = distance / speed;
    const timeMinutes = timeHours * 60;
    
    // Add buffer time for pickup and delivery
    return Math.round(timeMinutes + 10); // +10 minutes buffer
  }

  /**
   * Assign order to partner via storage
   */
  private async assignOrderToPartner(orderId: string, partnerId: string): Promise<boolean> {
    try {
      if (this.storage.assignOrderToPartner) {
        await this.storage.assignOrderToPartner(orderId, partnerId);
        return true;
      } else {
        // Fallback: update order directly
        await this.storage.updateOrder(orderId, {
          assignedTo: partnerId,
          status: 'assigned',
          acceptedAt: new Date()
        });
        return true;
      }
    } catch (error) {
      console.error(`❌ Failed to assign order to partner:`, error);
      return false;
    }
  }

  /**
   * Get assignment statistics
   */
  getAssignmentStats(): any {
    return {
      strategies: Array.from(this.strategies.keys()),
      totalStrategies: this.strategies.size,
      defaultStrategy: 'balanced'
    };
  }

  /**
   * Add custom assignment strategy
   */
  addStrategy(name: string, strategy: AssignmentStrategy): void {
    this.strategies.set(name, strategy);
    console.log(`✅ Added assignment strategy: ${name}`);
  }

  /**
   * Auto-assign orders that are ready for delivery
   */
  async autoAssignReadyOrders(): Promise<void> {
    try {
      console.log('🔄 Running auto-assignment for ready orders...');

      const orders = await this.storage.getOrders();
      const readyOrders = orders.filter((order: any) => 
        order.status === 'ready' && !order.assignedTo
      );

      if (readyOrders.length === 0) {
        console.log('✅ No orders pending assignment');
        return;
      }

      console.log(`📋 Found ${readyOrders.length} orders ready for assignment`);

      for (const order of readyOrders) {
        try {
          // Parse delivery location
          let orderLocation = { lat: 28.6139, lng: 77.2090 }; // Default campus location
          
          if (order.deliveryLocation) {
            if (typeof order.deliveryLocation === 'object' && order.deliveryLocation.lat) {
              orderLocation = order.deliveryLocation;
            } else {
              // Try to parse string location (for backward compatibility)
              console.log(`⚠️ Order ${order.id} has text delivery location, using default coordinates`);
            }
          }

          const assignment = await this.assignBestPartner(
            order.id,
            orderLocation,
            'balanced', // Use balanced strategy
            5 // 5km max distance
          );

          if (assignment) {
            console.log(`✅ Auto-assigned order ${order.id} to ${assignment.partnerName}`);
          } else {
            console.log(`⚠️ Could not auto-assign order ${order.id}`);
          }

        } catch (error) {
          console.error(`❌ Failed to auto-assign order ${order.id}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Auto-assignment process failed:', error);
    }
  }
}

export const partnerAssignmentService = new PartnerAssignmentService(null);
