import { db } from './db';

export interface DeliveryLocation {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  priority: 'high' | 'medium' | 'low';
  estimatedDeliveryTime: number; // in minutes (service time at stop)
  // Optional time windows for visits
  earliestTimeMinutes?: number; // minutes since day start
  latestTimeMinutes?: number;   // minutes since day start
}

export interface OptimizedRoute {
  routeId: string;
  deliveryPartnerId: string;
  stops: DeliveryLocation[];
  totalDistance: number; // in km
  estimatedDuration: number; // in minutes
  fuelEfficiency: number; // km/liter
  carbonFootprint: number; // kg CO2
  meta?: {
    improvedWithTwoOpt?: boolean;
    clustered?: boolean;
    clustersCount?: number;
    capacityConstraint?: number;
    timeWindowViolations?: number;
  };
}

export class RouteOptimizationService {
  private readonly EARTH_RADIUS = 6371; // Earth's radius in km

  constructor() {}

  // Calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return this.EARTH_RADIUS * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Simple nearest neighbor algorithm for route optimization
  private optimizeRouteNearestNeighbor(locations: DeliveryLocation[], startLocation: DeliveryLocation): DeliveryLocation[] {
    if (locations.length === 0) return [];
    
    const unvisited = [...locations];
    const route: DeliveryLocation[] = [startLocation];
    let currentLocation = startLocation;
    
    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      
      // Find nearest unvisited location
      for (let i = 0; i < unvisited.length; i++) {
        const distance = this.calculateDistance(
          currentLocation.latitude, currentLocation.longitude,
          unvisited[i].latitude, unvisited[i].longitude
        );
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }
      
      // Add nearest location to route
      route.push(unvisited[nearestIndex]);
      currentLocation = unvisited[nearestIndex];
      unvisited.splice(nearestIndex, 1);
    }
    
    return route;
  }

  // Priority-based route optimization
  private optimizeRouteByPriority(locations: DeliveryLocation[], startLocation: DeliveryLocation): DeliveryLocation[] {
    if (locations.length === 0) return [];
    
    // Sort by priority (high -> medium -> low) and then by distance
    const sortedLocations = [...locations].sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by distance from start
      const distA = this.calculateDistance(startLocation.latitude, startLocation.longitude, a.latitude, a.longitude);
      const distB = this.calculateDistance(startLocation.latitude, startLocation.longitude, b.latitude, b.longitude);
      return distA - distB;
    });
    
    return [startLocation, ...sortedLocations];
  }

  // 2-opt heuristic to improve an initial route ordering (except fixed start at index 0)
  private improveWithTwoOpt(route: DeliveryLocation[]): { route: DeliveryLocation[]; improved: boolean } {
    if (route.length <= 3) return { route, improved: false };
    let best = [...route];
    let improved = false;
    const distance = (a: DeliveryLocation, b: DeliveryLocation) =>
      this.calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude);

    const routeDistance = (r: DeliveryLocation[]) => {
      let d = 0;
      for (let i = 0; i < r.length - 1; i++) d += distance(r[i], r[i + 1]);
      return d;
    };

    let bestDistance = routeDistance(best);

    // Keep start fixed at index 0
    for (let i = 1; i < best.length - 2; i++) {
      for (let k = i + 1; k < best.length - 1; k++) {
        const candidate = best.slice(0, i).concat(best.slice(i, k + 1).reverse(), best.slice(k + 1));
        const candidateDistance = routeDistance(candidate);
        if (candidateDistance + 1e-6 < bestDistance) {
          best = candidate;
          bestDistance = candidateDistance;
          improved = true;
        }
      }
    }
    return { route: best, improved };
  }

  // Simple geo K-means clustering (lat/lng) for splitting many stops into multiple subroutes
  private kMeansCluster(locations: DeliveryLocation[], k: number, maxIterations: number = 20): DeliveryLocation[][] {
    if (k <= 1 || locations.length <= k) return [locations];
    // Initialize centroids with first k points
    let centroids = locations.slice(0, k).map(l => ({ lat: l.latitude, lng: l.longitude }));

    let assignments: number[] = new Array(locations.length).fill(0);
    const distancePoint = (lat: number, lng: number, c: { lat: number; lng: number }) =>
      this.calculateDistance(lat, lng, c.lat, c.lng);

    for (let iter = 0; iter < maxIterations; iter++) {
      // Assign
      let changed = false;
      for (let i = 0; i < locations.length; i++) {
        const l = locations[i];
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let j = 0; j < centroids.length; j++) {
          const d = distancePoint(l.latitude, l.longitude, centroids[j]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = j;
          }
        }
        if (assignments[i] !== bestIdx) {
          assignments[i] = bestIdx;
          changed = true;
        }
      }

      // Recompute centroids
      const sums = new Array(centroids.length).fill(0).map(() => ({ lat: 0, lng: 0, n: 0 }));
      for (let i = 0; i < locations.length; i++) {
        const a = assignments[i];
        sums[a].lat += locations[i].latitude;
        sums[a].lng += locations[i].longitude;
        sums[a].n += 1;
      }
      const newCentroids = centroids.map((c, idx) => (sums[idx].n > 0 ? {
        lat: sums[idx].lat / sums[idx].n,
        lng: sums[idx].lng / sums[idx].n,
      } : c));
      // Check convergence
      let moved = false;
      for (let i = 0; i < centroids.length; i++) {
        if (Math.abs(newCentroids[i].lat - centroids[i].lat) > 1e-6 || Math.abs(newCentroids[i].lng - centroids[i].lng) > 1e-6) {
          moved = true;
          break;
        }
      }
      centroids = newCentroids;
      if (!changed || !moved) break;
    }

    // Build clusters
    const clusters: DeliveryLocation[][] = new Array(centroids.length).fill(0).map(() => []);
    for (let i = 0; i < locations.length; i++) clusters[assignments[i]].push(locations[i]);
    // Remove empty clusters
    return clusters.filter(c => c.length > 0);
  }

  // Calculate total route metrics
  private calculateRouteMetrics(route: DeliveryLocation[]): {
    totalDistance: number;
    estimatedDuration: number;
    fuelEfficiency: number;
    carbonFootprint: number;
    timeWindowViolations: number;
  } {
    let totalDistance = 0;
    let totalDuration = 0;
    let currentTime = 8 * 60; // assume day starts at 8:00 AM (in minutes) for ETA calc
    let timeWindowViolations = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      const distance = this.calculateDistance(
        route[i].latitude, route[i].longitude,
        route[i + 1].latitude, route[i + 1].longitude
      );
      totalDistance += distance;
      
      // Add delivery time at current stop
      totalDuration += route[i].estimatedDeliveryTime;
      currentTime += route[i].estimatedDeliveryTime;
      
      // Add travel time (assuming 30 km/h average speed)
      const travelTime = (distance / 30) * 60; // Convert to minutes
      totalDuration += travelTime;
      currentTime += travelTime;

      // Check time windows on next stop (arrival time)
      const next = route[i + 1];
      if (typeof next.earliestTimeMinutes === 'number' && currentTime < next.earliestTimeMinutes) {
        // Wait until window opens
        const wait = next.earliestTimeMinutes - currentTime;
        totalDuration += wait;
        currentTime += wait;
      }
      if (typeof next.latestTimeMinutes === 'number' && currentTime > next.latestTimeMinutes) {
        timeWindowViolations += 1;
      }
    }
    
    // Add final delivery time
    if (route.length > 0) {
      totalDuration += route[route.length - 1].estimatedDeliveryTime;
    }
    
    // Fuel efficiency: assume 15 km/liter for delivery vehicles
    const fuelEfficiency = 15;
    
    // Carbon footprint: assume 2.3 kg CO2 per liter of fuel
    const carbonFootprint = (totalDistance / fuelEfficiency) * 2.3;
    
    return {
      totalDistance: Math.round(totalDistance * 100) / 100,
      estimatedDuration: Math.round(totalDuration),
      fuelEfficiency,
      carbonFootprint: Math.round(carbonFootprint * 100) / 100,
      timeWindowViolations
    };
  }

  // Main route optimization method
  async optimizeDeliveryRoute(
    deliveryPartnerId: string,
    locations: DeliveryLocation[],
    optimizationStrategy: 'nearest' | 'priority' | 'hybrid' = 'priority',
    options?: {
      useClustering?: boolean;
      clustersCount?: number;
      vehicleCapacity?: number; // max number of stops per route
      respectTimeWindows?: boolean;
      improveWithTwoOpt?: boolean;
    }
  ): Promise<OptimizedRoute> {
    try {
      if (locations.length === 0) {
        throw new Error('No delivery locations provided');
      }
      
      // Get delivery partner's current location (assuming they start from a depot)
      const startLocation: DeliveryLocation = {
        id: 'depot',
        address: 'Central Depot',
        latitude: 28.6139, // Default to Delhi coordinates
        longitude: 77.2090,
        priority: 'high',
        estimatedDeliveryTime: 0
      };
      
      let optimizedStops: DeliveryLocation[];
      let clustered = false;
      let clustersCount = 1;
      
      // Optional clustering first for many stops
      let workingLocations = [...locations];
      if (options?.useClustering && workingLocations.length > 12) {
        const k = Math.max(2, Math.min(options.clustersCount || 3, Math.floor(workingLocations.length / 6)));
        const clusters = this.kMeansCluster(workingLocations, k);
        clustered = true;
        clustersCount = clusters.length;
        // Build a route that visits clusters in nearest order, expanding each cluster with chosen strategy
        // Simple approach: order clusters by centroid distance from depot
        const centroids = clusters.map(c => ({
          lat: c.reduce((a, l) => a + l.latitude, 0) / c.length,
          lng: c.reduce((a, l) => a + l.longitude, 0) / c.length,
          items: c
        }));
        centroids.sort((a, b) => this.calculateDistance(startLocation.latitude, startLocation.longitude, a.lat, a.lng) -
                                  this.calculateDistance(startLocation.latitude, startLocation.longitude, b.lat, b.lng));
        const routeSeq: DeliveryLocation[] = [startLocation];
        for (const cluster of centroids) {
          const clusterStart = routeSeq[routeSeq.length - 1] || startLocation;
          const sub = optimizationStrategy === 'nearest'
            ? this.optimizeRouteNearestNeighbor(cluster.items, clusterStart)
            : this.optimizeRouteByPriority(cluster.items, clusterStart);
          // Remove the clusterStart duplicate if present
          const subNoStart = sub[0].id === clusterStart.id ? sub.slice(1) : sub;
          routeSeq.push(...subNoStart);
        }
        optimizedStops = routeSeq;
      } else {
        // Apply optimization strategy on all
        if (optimizationStrategy === 'nearest') {
          optimizedStops = this.optimizeRouteNearestNeighbor(workingLocations, startLocation);
        } else if (optimizationStrategy === 'hybrid') {
          // Start with priority to get good ordering, then refine with nearest
          const initial = this.optimizeRouteByPriority(workingLocations, startLocation);
          const refined = this.optimizeRouteNearestNeighbor(initial.slice(1), initial[0]);
          optimizedStops = refined;
        } else {
          optimizedStops = this.optimizeRouteByPriority(workingLocations, startLocation);
        }
      }
      
      // Calculate route metrics
      let { route: twoOptRoute, improved } = options?.improveWithTwoOpt
        ? this.improveWithTwoOpt(optimizedStops)
        : { route: optimizedStops, improved: false };

      // Respect capacity: trim to capacity if set
      if (options?.vehicleCapacity && options.vehicleCapacity > 0) {
        twoOptRoute = twoOptRoute.slice(0, Math.min(twoOptRoute.length, options.vehicleCapacity + 1)); // +1 for depot
      }

      const metrics = this.calculateRouteMetrics(twoOptRoute);
      
      // Generate route ID
      const routeId = `route_${deliveryPartnerId}_${Date.now()}`;
      
      return {
        routeId,
        deliveryPartnerId,
        stops: twoOptRoute,
        ...metrics,
        meta: {
          improvedWithTwoOpt: improved,
          clustered,
          clustersCount,
          capacityConstraint: options?.vehicleCapacity,
          timeWindowViolations: metrics.timeWindowViolations
        }
      };
      
    } catch (error) {
      console.error('Route optimization error:', error);
      throw error;
    }
  }

  // Get multiple route suggestions for comparison
  async getRouteAlternatives(
    deliveryPartnerId: string,
    locations: DeliveryLocation[]
  ): Promise<OptimizedRoute[]> {
    try {
      const alternatives: OptimizedRoute[] = [];
      
      // Generate different route strategies
      const strategies: Array<'nearest' | 'priority'> = ['nearest', 'priority'];
      
      for (const strategy of strategies) {
        try {
          const route = await this.optimizeDeliveryRoute(deliveryPartnerId, locations, strategy);
          alternatives.push(route);
        } catch (error) {
          console.warn(`Failed to generate route with strategy ${strategy}:`, error);
        }
      }
      
      // Sort by estimated duration
      return alternatives.sort((a, b) => a.estimatedDuration - b.estimatedDuration);
      
    } catch (error) {
      console.error('Route alternatives error:', error);
      return [];
    }
  }

  // Estimate delivery time for a specific route
  async estimateDeliveryTime(route: OptimizedRoute): Promise<{
    estimatedStartTime: Date;
    estimatedEndTime: Date;
    timeSlots: Array<{
      location: string;
      estimatedTime: Date;
      duration: number;
    }>;
  }> {
    try {
      const now = new Date();
      let currentTime = new Date(now);
      const timeSlots = [];
      
      for (let i = 0; i < route.stops.length; i++) {
        const stop = route.stops[i];
        
        if (i === 0) {
          // First stop (depot) - no travel time
          timeSlots.push({
            location: stop.address,
            estimatedTime: currentTime,
            duration: 0
          });
        } else {
          // Calculate travel time from previous stop
          const prevStop = route.stops[i - 1];
          const distance = this.calculateDistance(
            prevStop.latitude, prevStop.longitude,
            stop.latitude, stop.longitude
          );
          
          // Travel time (30 km/h average)
          const travelMinutes = (distance / 30) * 60;
          currentTime = new Date(currentTime.getTime() + travelMinutes * 60000);
          
          timeSlots.push({
            location: stop.address,
            estimatedTime: currentTime,
            duration: stop.estimatedDeliveryTime
          });
          
          // Add delivery time
          currentTime = new Date(currentTime.getTime() + stop.estimatedDeliveryTime * 60000);
        }
      }
      
      return {
        estimatedStartTime: now,
        estimatedEndTime: currentTime,
        timeSlots
      };
      
    } catch (error) {
      console.error('Delivery time estimation error:', error);
      throw error;
    }
  }
}

export const routeOptimization = new RouteOptimizationService();
