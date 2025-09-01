import { EventEmitter } from 'events';

export interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: Date;
  address?: string;
}

export interface LocationUpdate {
  partnerId: string;
  orderId?: string;
  location: Location;
  status: 'online' | 'offline' | 'delivering' | 'idle';
  battery?: number;
  speed?: number;
}

export interface GeofenceArea {
  id: string;
  name: string;
  center: Location;
  radius: number; // in meters
  type: 'pickup' | 'delivery' | 'campus' | 'restricted';
}

export interface TrackingSession {
  partnerId: string;
  orderId: string;
  startLocation: Location;
  currentLocation: Location;
  route: Location[];
  startTime: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  distanceTraveled: number;
  status: 'started' | 'in_progress' | 'completed' | 'cancelled';
}

export class LocationTrackingService extends EventEmitter {
  private activePartners: Map<string, LocationUpdate> = new Map();
  private trackingSessions: Map<string, TrackingSession> = new Map();
  private geofences: Map<string, GeofenceArea> = new Map();
  private locationHistory: Map<string, Location[]> = new Map();
  private storage: any;

  constructor(storage: any) {
    super();
    this.storage = storage;
    this.setupGeofences();
    this.startCleanupInterval();
  }

  /**
   * Set storage instance
   */
  setStorage(storage: any): void {
    this.storage = storage;
    console.log('📍 Location tracking service storage updated');
  }

  /**
   * Update partner location
   */
  async updatePartnerLocation(update: LocationUpdate): Promise<void> {
    try {
      const { partnerId, location, status } = update;
      
      console.log(`📍 Location update for partner ${partnerId}:`, {
        lat: location.lat,
        lng: location.lng,
        status,
        timestamp: location.timestamp || new Date()
      });

      // Store current location
      this.activePartners.set(partnerId, {
        ...update,
        location: {
          ...location,
          timestamp: location.timestamp || new Date()
        }
      });

      // Add to location history
      const history = this.locationHistory.get(partnerId) || [];
      history.push({
        ...location,
        timestamp: location.timestamp || new Date()
      });
      
      // Keep only last 100 locations
      if (history.length > 100) {
        history.shift();
      }
      this.locationHistory.set(partnerId, history);

      // Update partner in storage
      await this.updatePartnerLocationInStorage(partnerId, location, status);

      // Update tracking session if partner is delivering
      if (update.orderId) {
        await this.updateTrackingSession(partnerId, update.orderId, location);
      }

      // Check geofences
      await this.checkGeofences(partnerId, location, update.orderId);

      // Emit location update event
      this.emit('locationUpdate', {
        partnerId,
        location,
        status,
        orderId: update.orderId
      });

      // Calculate and emit ETA updates
      if (update.orderId && status === 'delivering') {
        const eta = await this.calculateETA(partnerId, update.orderId, location);
        if (eta) {
          this.emit('etaUpdate', {
            partnerId,
            orderId: update.orderId,
            eta,
            location
          });
        }
      }

    } catch (error) {
      console.error('❌ Location update error:', error);
      throw error;
    }
  }

  /**
   * Start tracking session for delivery
   */
  async startTrackingSession(partnerId: string, orderId: string, startLocation: Location): Promise<TrackingSession> {
    try {
      console.log(`🚀 Starting tracking session for partner ${partnerId}, order ${orderId}`);

      const session: TrackingSession = {
        partnerId,
        orderId,
        startLocation,
        currentLocation: startLocation,
        route: [startLocation],
        startTime: new Date(),
        distanceTraveled: 0,
        status: 'started'
      };

      // Calculate initial ETA
      const order = await this.storage.getOrderById(orderId);
      if (order?.deliveryLocation) {
        session.estimatedDeliveryTime = await this.calculateDeliveryETA(startLocation, order.deliveryLocation);
      }

      this.trackingSessions.set(`${partnerId}-${orderId}`, session);

      // Emit tracking started event
      this.emit('trackingStarted', session);

      return session;

    } catch (error) {
      console.error('❌ Start tracking session error:', error);
      throw error;
    }
  }

  /**
   * Update tracking session with new location
   */
  private async updateTrackingSession(partnerId: string, orderId: string, location: Location): Promise<void> {
    const sessionKey = `${partnerId}-${orderId}`;
    const session = this.trackingSessions.get(sessionKey);

    if (!session) return;

    // Calculate distance from last location
    const lastLocation = session.currentLocation;
    const distance = this.calculateDistance(lastLocation, location);

    // Update session
    session.currentLocation = location;
    session.route.push(location);
    session.distanceTraveled += distance;
    session.status = 'in_progress';

    // Update ETA
    const order = await this.storage.getOrderById(orderId);
    if (order?.deliveryLocation) {
      session.estimatedDeliveryTime = await this.calculateDeliveryETA(location, order.deliveryLocation);
    }

    this.trackingSessions.set(sessionKey, session);

    // Emit tracking update event
    this.emit('trackingUpdate', session);
  }

  /**
   * Complete tracking session
   */
  async completeTrackingSession(partnerId: string, orderId: string, deliveryLocation: Location): Promise<void> {
    try {
      const sessionKey = `${partnerId}-${orderId}`;
      const session = this.trackingSessions.get(sessionKey);

      if (!session) return;

      session.currentLocation = deliveryLocation;
      session.route.push(deliveryLocation);
      session.actualDeliveryTime = new Date();
      session.status = 'completed';

      // Calculate final distance
      const lastLocation = session.route[session.route.length - 2];
      if (lastLocation) {
        session.distanceTraveled += this.calculateDistance(lastLocation, deliveryLocation);
      }

      // Store completed session for analytics
      await this.storeTrackingSession(session);

      // Remove from active sessions
      this.trackingSessions.delete(sessionKey);

      console.log(`✅ Tracking session completed for partner ${partnerId}, order ${orderId}`);

      // Emit tracking completed event
      this.emit('trackingCompleted', session);

    } catch (error) {
      console.error('❌ Complete tracking session error:', error);
      throw error;
    }
  }

  /**
   * Get partner current location
   */
  getPartnerLocation(partnerId: string): LocationUpdate | null {
    return this.activePartners.get(partnerId) || null;
  }

  /**
   * Get all active partner locations
   */
  getAllActivePartners(): LocationUpdate[] {
    return Array.from(this.activePartners.values());
  }

  /**
   * Get partner location history
   */
  getPartnerHistory(partnerId: string, limit: number = 50): Location[] {
    const history = this.locationHistory.get(partnerId) || [];
    return history.slice(-limit);
  }

  /**
   * Get tracking session
   */
  getTrackingSession(partnerId: string, orderId: string): TrackingSession | null {
    return this.trackingSessions.get(`${partnerId}-${orderId}`) || null;
  }

  /**
   * Get partners near location
   */
  getPartnersNearLocation(location: Location, radiusKm: number = 5): LocationUpdate[] {
    return Array.from(this.activePartners.values()).filter(partner => {
      const distance = this.calculateDistance(location, partner.location);
      return distance <= radiusKm;
    });
  }

  /**
   * Check geofences for partner location
   */
  private async checkGeofences(partnerId: string, location: Location, orderId?: string): Promise<void> {
    for (const [geofenceId, geofence] of Array.from(this.geofences.entries())) {
      const distance = this.calculateDistance(location, geofence.center);
      const isInside = distance <= (geofence.radius / 1000); // Convert meters to km

      if (isInside) {
        console.log(`🎯 Partner ${partnerId} entered geofence: ${geofence.name}`);
        
        this.emit('geofenceEntered', {
          partnerId,
          orderId,
          geofence,
          location
        });

        // Handle specific geofence types
        if (geofence.type === 'pickup' && orderId) {
          this.emit('nearPickupLocation', { partnerId, orderId, location });
        } else if (geofence.type === 'delivery' && orderId) {
          this.emit('nearDeliveryLocation', { partnerId, orderId, location });
        }
      }
    }
  }

  /**
   * Calculate distance between two locations (Haversine formula)
   */
  private calculateDistance(loc1: Location, loc2: Location): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.lat - loc1.lat);
    const dLon = this.toRadians(loc2.lng - loc1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(loc1.lat)) * Math.cos(this.toRadians(loc2.lat)) *
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
   * Calculate ETA for delivery
   */
  private async calculateETA(partnerId: string, orderId: string, currentLocation: Location): Promise<Date | null> {
    try {
      const order = await this.storage.getOrderById(orderId);
      if (!order?.deliveryLocation) return null;

      // Parse delivery location (assuming it's stored as JSON string or object)
      let deliveryLoc: Location;
      if (typeof order.deliveryLocation === 'string') {
        try {
          deliveryLoc = JSON.parse(order.deliveryLocation);
        } catch {
          return null; // Invalid location format
        }
      } else if (order.deliveryLocation.lat && order.deliveryLocation.lng) {
        deliveryLoc = order.deliveryLocation;
      } else {
        return null;
      }

      return this.calculateDeliveryETA(currentLocation, deliveryLoc);

    } catch (error) {
      console.error('❌ ETA calculation error:', error);
      return null;
    }
  }

  /**
   * Calculate delivery ETA based on distance and average speed
   */
  private async calculateDeliveryETA(fromLocation: Location, toLocation: Location): Promise<Date> {
    const distance = this.calculateDistance(fromLocation, toLocation);
    const averageSpeedKmh = 15; // Average delivery speed in urban areas
    const estimatedTimeHours = distance / averageSpeedKmh;
    const estimatedTimeMs = estimatedTimeHours * 60 * 60 * 1000;
    
    return new Date(Date.now() + estimatedTimeMs);
  }

  /**
   * Update partner location in storage
   */
  private async updatePartnerLocationInStorage(partnerId: string, location: Location, status: string): Promise<void> {
    try {
      // Update partner current location
      if (this.storage.updatePartnerLocation) {
        await this.storage.updatePartnerLocation(partnerId, location, status);
      }

      // Create order tracking entry if partner is delivering
      const activeSession = Array.from(this.trackingSessions.values())
        .find(session => session.partnerId === partnerId && session.status === 'in_progress');

      if (activeSession && this.storage.createOrderTracking) {
        await this.storage.createOrderTracking({
          orderId: activeSession.orderId,
          status: 'location_update',
          location,
          deliveryPartnerId: partnerId,
          message: `Partner location updated: ${location.address || `${location.lat}, ${location.lng}`}`
        });
      }

    } catch (error) {
      console.error('❌ Storage update error:', error);
      // Don't throw - location tracking should continue even if storage fails
    }
  }

  /**
   * Store completed tracking session
   */
  private async storeTrackingSession(session: TrackingSession): Promise<void> {
    try {
      if (this.storage.storeTrackingSession) {
        await this.storage.storeTrackingSession(session);
      }
    } catch (error) {
      console.error('❌ Store tracking session error:', error);
    }
  }

  /**
   * Setup default geofences
   */
  private setupGeofences(): void {
    // Add campus geofence (example coordinates)
    this.geofences.set('campus-main', {
      id: 'campus-main',
      name: 'Main Campus',
      center: { lat: 28.6139, lng: 77.2090 }, // Example: Delhi coordinates
      radius: 2000, // 2km radius
      type: 'campus'
    });

    // Add pickup zones
    this.geofences.set('pickup-canteen', {
      id: 'pickup-canteen',
      name: 'Campus Canteen',
      center: { lat: 28.6145, lng: 77.2085 },
      radius: 100, // 100m radius
      type: 'pickup'
    });

    this.geofences.set('pickup-store', {
      id: 'pickup-store',
      name: 'Campus Store',
      center: { lat: 28.6135, lng: 77.2095 },
      radius: 100,
      type: 'pickup'
    });
  }

  /**
   * Add custom geofence
   */
  addGeofence(geofence: GeofenceArea): void {
    this.geofences.set(geofence.id, geofence);
    console.log(`✅ Added geofence: ${geofence.name}`);
  }

  /**
   * Remove geofence
   */
  removeGeofence(geofenceId: string): void {
    this.geofences.delete(geofenceId);
    console.log(`🗑️ Removed geofence: ${geofenceId}`);
  }

  /**
   * Start cleanup interval for old data
   */
  private startCleanupInterval(): void {
    // Clean up old location history every hour
    setInterval(() => {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [partnerId, history] of Array.from(this.locationHistory.entries())) {
        const filteredHistory = history.filter((loc: any) => 
          loc.timestamp && loc.timestamp > cutoffTime
        );
        this.locationHistory.set(partnerId, filteredHistory);
      }

      // Remove inactive partners (no update in last hour)
      const inactiveThreshold = new Date(Date.now() - 60 * 60 * 1000);
      for (const [partnerId, update] of Array.from(this.activePartners.entries())) {
        if (update.location.timestamp && update.location.timestamp < inactiveThreshold) {
          this.activePartners.delete(partnerId);
          console.log(`🧹 Removed inactive partner: ${partnerId}`);
        }
      }

    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Get location tracking statistics
   */
  getTrackingStats(): any {
    return {
      activePartners: this.activePartners.size,
      activeSessions: this.trackingSessions.size,
      geofences: this.geofences.size,
      totalLocationHistory: Array.from(this.locationHistory.values())
        .reduce((total, history) => total + history.length, 0)
    };
  }
}

export const locationTrackingService = new LocationTrackingService(null);
