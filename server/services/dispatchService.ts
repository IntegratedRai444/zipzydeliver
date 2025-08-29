import { storage } from '../storage';
import { findPartnersInRadius, expandSearchRadius, Coordinates } from '../utils/distance';
import { websocketService } from './websocketService';
import { pythonAIIntegration } from './pythonAIIntegration';

export interface DispatchResult {
  orderId: string;
  matchedPartners: Array<{
    partnerId: string;
    distance: number;
    isStudent: boolean;
    searchRadius: number;
  }>;
  status: 'pending' | 'matched' | 'accepted' | 'expired';
  expiresAt: Date;
}

export interface PartnerMatch {
  partnerId: string;
  distance: number;
  isStudent: boolean;
  searchRadius: number;
  dailyDeliveries: number;
  isOnline: boolean;
}

/**
 * Dispatch service for partner matching and order assignment
 */
export class DispatchService {
  private static instance: DispatchService;
  private activeDispatches: Map<string, DispatchResult> = new Map();
  private readonly DISPATCH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  static getInstance(): DispatchService {
    if (!DispatchService.instance) {
      DispatchService.instance = new DispatchService();
    }
    return DispatchService.instance;
  }

  /**
   * Find available partners for an order with AI optimization
   */
  async findAvailablePartners(
    orderId: string,
    destination: Coordinates,
    maxPartners: number = 5
  ): Promise<DispatchResult> {
    // Get all online partners
    const allPartners = await storage.getAllPartners();
    const onlinePartners = allPartners.filter(p => p.isOnline);

    // First try: find nearby students (priority)
    let matchedPartners = await this.findStudentPartners(destination, onlinePartners, maxPartners);

    // If not enough students, expand search and include non-students
    if (matchedPartners.length < maxPartners) {
      const fallbackPartners = await this.findFallbackPartners(
        destination, 
        onlinePartners, 
        maxPartners - matchedPartners.length,
        matchedPartners.map(p => p.partnerId)
      );
      matchedPartners = [...matchedPartners, ...fallbackPartners];
    }

    // Check daily delivery limits for students
    matchedPartners = await this.filterByDailyLimits(matchedPartners);

    // Use AI to optimize partner assignment if available
    if (await pythonAIIntegration.isServiceAvailable()) {
      try {
        const aiOptimization = await pythonAIIntegration.optimizePartnerAssignment({
          orderId,
          destination,
          availablePartners: matchedPartners,
          maxPartners,
          constraints: {
            studentPriority: true,
            dailyLimits: true,
            distanceWeight: 0.4,
            ratingWeight: 0.3,
            availabilityWeight: 0.3
          }
        });

        if (aiOptimization.success && aiOptimization.data?.assignment) {
          // Use AI-optimized assignment
          matchedPartners = aiOptimization.data.assignment.optimizedPartners || matchedPartners;
          console.log(`AI optimized partner assignment for order ${orderId} with confidence: ${aiOptimization.confidence}`);
        }
      } catch (error) {
        console.warn('AI optimization failed, using fallback assignment:', error);
      }
    }

    const dispatchResult: DispatchResult = {
      orderId,
      matchedPartners: matchedPartners.slice(0, maxPartners),
      status: 'pending',
      expiresAt: new Date(Date.now() + this.DISPATCH_TIMEOUT_MS)
    };

    // Store active dispatch
    this.activeDispatches.set(orderId, dispatchResult);

    // Notify matched partners via WebSocket
    await websocketService.notifyPartnersOfDispatch(orderId, matchedPartners);

    // Set timeout to expire dispatch
    setTimeout(() => {
      this.expireDispatch(orderId);
    }, this.DISPATCH_TIMEOUT_MS);

    return dispatchResult;
  }

  /**
   * Find student partners within initial radius
   */
  private async findStudentPartners(
    destination: Coordinates,
    partners: any[],
    maxCount: number
  ): Promise<PartnerMatch[]> {
    const studentPartners = partners.filter(p => p.isStudent);
    const initialRadius = 5; // Start with 5km radius

    const inRadius = findPartnersInRadius(destination, studentPartners, initialRadius);
    
    return inRadius.slice(0, maxCount).map(partner => ({
      partnerId: partner.id,
      distance: partner.distance,
      isStudent: true,
      searchRadius: initialRadius,
      dailyDeliveries: 0, // Will be populated later
      isOnline: true
    }));
  }

  /**
   * Find fallback partners (expand radius, include non-students)
   */
  private async findFallbackPartners(
    destination: Coordinates,
    partners: any[],
    maxCount: number,
    excludePartnerIds: string[]
  ): Promise<PartnerMatch[]> {
    const availablePartners = partners.filter(p => !excludePartnerIds.includes(p.id));
    
    // Use expandSearchRadius for fallback logic
    const expandedResults = expandSearchRadius(destination, availablePartners, 5, 20);
    
    return expandedResults
      .filter(result => !excludePartnerIds.includes(result.id))
      .slice(0, maxCount)
      .map(result => ({
        partnerId: result.id,
        distance: result.distance,
        isStudent: result.isStudent,
        searchRadius: result.searchRadius,
        dailyDeliveries: 0, // Will be populated later
        isOnline: true
      }));
  }

  /**
   * Filter partners by daily delivery limits (students max 3/day)
   */
  private async filterByDailyLimits(partners: PartnerMatch[]): Promise<PartnerMatch[]> {
    const filtered: PartnerMatch[] = [];
    
    for (const partner of partners) {
      if (partner.isStudent) {
        // Get today's delivery count for student
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayDeliveries = await storage.getPartnerDeliveriesCount(
          partner.partnerId, 
          today
        );
        
        if (todayDeliveries < 3) {
          filtered.push({ ...partner, dailyDeliveries: todayDeliveries });
        }
      } else {
        // Non-students have no daily limit
        filtered.push(partner);
      }
    }
    
    return filtered;
  }

  /**
   * Accept race: first partner to accept gets the order
   */
  async acceptOrder(orderId: string, partnerId: string): Promise<{ success: boolean; message: string }> {
    const dispatch = this.activeDispatches.get(orderId);
    
    if (!dispatch) {
      return { success: false, message: 'Dispatch not found or expired' };
    }

    if (dispatch.status !== 'pending') {
      return { success: false, message: 'Order already assigned or expired' };
    }

    // Check if partner is still in matched list
    const isMatched = dispatch.matchedPartners.some(p => p.partnerId === partnerId);
    if (!isMatched) {
      return { success: false, message: 'Partner not matched for this order' };
    }

    // Atomic assignment: update order and dispatch status
    try {
      await storage.assignOrderToPartner(orderId, partnerId);
      
      // Update dispatch status
      dispatch.status = 'accepted';
      this.activeDispatches.set(orderId, dispatch);
      
      // Notify order status update via WebSocket
      await websocketService.notifyOrderStatusUpdate(orderId, 'assigned', partnerId);
      
      // Remove from active dispatches after a delay
      setTimeout(() => {
        this.activeDispatches.delete(orderId);
      }, 60000); // Keep for 1 minute after acceptance
      
      return { success: true, message: 'Order accepted successfully' };
    } catch (error) {
      console.error('Error accepting order:', error);
      return { success: false, message: 'Failed to accept order' };
    }
  }

  /**
   * Get active dispatch for an order
   */
  getActiveDispatch(orderId: string): DispatchResult | undefined {
    return this.activeDispatches.get(orderId);
  }

  /**
   * Expire a dispatch (timeout reached)
   */
  private expireDispatch(orderId: string): void {
    const dispatch = this.activeDispatches.get(orderId);
    if (dispatch && dispatch.status === 'pending') {
      dispatch.status = 'expired';
      this.activeDispatches.set(orderId, dispatch);
      
      // Clean up after a delay
      setTimeout(() => {
        this.activeDispatches.delete(orderId);
      }, 300000); // 5 minutes
    }
  }

  /**
   * Get all active dispatches
   */
  getAllActiveDispatches(): DispatchResult[] {
    return Array.from(this.activeDispatches.values());
  }

  /**
   * Clean up expired dispatches
   */
  cleanupExpiredDispatches(): void {
    const now = new Date();
    for (const [orderId, dispatch] of this.activeDispatches.entries()) {
      if (dispatch.expiresAt < now && dispatch.status === 'pending') {
        this.expireDispatch(orderId);
      }
    }
  }
}

export const dispatchService = DispatchService.getInstance();
