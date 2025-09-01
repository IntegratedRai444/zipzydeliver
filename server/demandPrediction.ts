import { db } from './db';

export interface DemandPattern {
  hour: number;
  dayOfWeek: number;
  orderCount: number;
  averageValue: number;
  peakFactor: number; // 0-1, how busy this time is
}

export interface DemandPrediction {
  timestamp: Date;
  predictedOrders: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface CampusDemand {
  campusId: string;
  predictions: DemandPrediction[];
  peakHours: Array<{ hour: number; intensity: 'low' | 'medium' | 'high' }>;
  busyDays: Array<{ day: string; intensity: 'low' | 'medium' | 'high' }>;
}

export class DemandPredictionService {
  private historicalPatterns: Map<string, DemandPattern[]> = new Map();
  private readonly CAMPUS_LOCATIONS = {
    'main': { lat: 28.6139, lng: 77.2090, name: 'Main Campus' },
    'north': { lat: 28.6239, lng: 77.2190, name: 'North Campus' },
    'south': { lat: 28.6039, lng: 77.1990, name: 'South Campus' }
  };

  constructor() {
    this.initializeHistoricalPatterns();
  }

  // Initialize with mock historical patterns
  private initializeHistoricalPatterns() {
    // Mock data for demonstration - in production this would come from actual order history
    const mockPatterns: DemandPattern[] = [
      // Breakfast rush (7-9 AM)
      { hour: 7, dayOfWeek: 1, orderCount: 45, averageValue: 120, peakFactor: 0.8 },
      { hour: 8, dayOfWeek: 1, orderCount: 78, averageValue: 95, peakFactor: 0.9 },
      { hour: 9, dayOfWeek: 1, orderCount: 65, averageValue: 110, peakFactor: 0.7 },
      
      // Lunch rush (12-2 PM)
      { hour: 12, dayOfWeek: 1, orderCount: 120, averageValue: 180, peakFactor: 1.0 },
      { hour: 13, dayOfWeek: 1, orderCount: 95, averageValue: 160, peakFactor: 0.9 },
      { hour: 14, dayOfWeek: 1, orderCount: 45, averageValue: 140, peakFactor: 0.6 },
      
      // Evening snack (4-6 PM)
      { hour: 16, dayOfWeek: 1, orderCount: 55, averageValue: 80, peakFactor: 0.7 },
      { hour: 17, dayOfWeek: 1, orderCount: 70, averageValue: 90, peakFactor: 0.8 },
      { hour: 18, dayOfWeek: 1, orderCount: 60, averageValue: 85, peakFactor: 0.6 },
      
      // Dinner rush (7-9 PM)
      { hour: 19, dayOfWeek: 1, orderCount: 85, averageValue: 200, peakFactor: 0.9 },
      { hour: 20, dayOfWeek: 1, orderCount: 75, averageValue: 180, peakFactor: 0.8 },
      { hour: 21, dayOfWeek: 1, orderCount: 40, averageValue: 150, peakFactor: 0.5 },
      
      // Late night (10 PM - 12 AM)
      { hour: 22, dayOfWeek: 1, orderCount: 35, averageValue: 100, peakFactor: 0.4 },
      { hour: 23, dayOfWeek: 1, orderCount: 25, averageValue: 90, peakFactor: 0.3 },
      { hour: 0, dayOfWeek: 1, orderCount: 15, averageValue: 80, peakFactor: 0.2 }
    ];

    // Add patterns for other days (simplified)
    for (let day = 2; day <= 7; day++) {
      mockPatterns.push(...mockPatterns.map(pattern => ({
        ...pattern,
        dayOfWeek: day,
        orderCount: Math.round(pattern.orderCount * this.getDayMultiplier(day)),
        peakFactor: pattern.peakFactor * this.getDayMultiplier(day)
      })));
    }

    this.historicalPatterns.set('main', mockPatterns);
  }

  // Get day multiplier (weekends are busier)
  private getDayMultiplier(dayOfWeek: number): number {
    if (dayOfWeek === 6 || dayOfWeek === 7) return 1.2; // Weekend
    if (dayOfWeek === 5) return 1.1; // Friday
    return 1.0; // Weekday
  }

  // Predict demand for a specific time
  async predictDemand(
    campusId: string,
    timestamp: Date,
    weather?: { condition: string; temperature: number }
  ): Promise<DemandPrediction> {
    try {
      const hour = timestamp.getHours();
      const dayOfWeek = timestamp.getDay() || 7; // Convert Sunday (0) to 7
      
      // Get historical pattern for this time
      const patterns = this.historicalPatterns.get(campusId) || [];
      const basePattern = patterns.find(p => p.hour === hour && p.dayOfWeek === dayOfWeek);
      
      if (!basePattern) {
        return this.generateFallbackPrediction(timestamp);
      }

      // Apply weather adjustments
      let weatherMultiplier = 1.0;
      if (weather) {
        weatherMultiplier = this.calculateWeatherMultiplier(weather);
      }

      // Apply time-based adjustments
      const timeMultiplier = this.calculateTimeMultiplier(timestamp);
      
      // Calculate final prediction
      const predictedOrders = Math.round(
        basePattern.orderCount * weatherMultiplier * timeMultiplier
      );

      // Calculate confidence based on historical data consistency
      const confidence = this.calculateConfidence(basePattern, patterns);
      
      // Generate factors and recommendations
      const factors = this.generateFactors(basePattern, weather, timestamp);
      const recommendations = this.generateRecommendations(predictedOrders, basePattern.peakFactor);

      return {
        timestamp,
        predictedOrders,
        confidence,
        factors,
        recommendations
      };

    } catch (error) {
      console.error('Demand prediction error:', error);
      return this.generateFallbackPrediction(timestamp);
    }
  }

  // Calculate weather impact on demand
  private calculateWeatherMultiplier(weather: { condition: string; temperature: number }): number {
    let multiplier = 1.0;
    
    // Weather conditions
    switch (weather.condition.toLowerCase()) {
      case 'rain':
      case 'snow':
        multiplier *= 1.3; // More orders in bad weather
        break;
      case 'sunny':
      case 'clear':
        if (weather.temperature > 30) {
          multiplier *= 1.2; // Hot weather increases beverage orders
        }
        break;
      case 'cloudy':
        multiplier *= 1.1;
        break;
    }
    
    // Temperature effects
    if (weather.temperature < 10) {
      multiplier *= 1.2; // Cold weather increases food orders
    } else if (weather.temperature > 35) {
      multiplier *= 1.15; // Hot weather increases beverage orders
    }
    
    return Math.min(multiplier, 1.5); // Cap at 50% increase
  }

  // Calculate time-based adjustments
  private calculateTimeMultiplier(timestamp: Date): number {
    const hour = timestamp.getHours();
    const month = timestamp.getMonth() + 1;
    
    let multiplier = 1.0;
    
    // Exam season (March-May, October-December)
    if ((month >= 3 && month <= 5) || (month >= 10 && month <= 12)) {
      multiplier *= 1.2;
    }
    
    // Holiday season (December)
    if (month === 12) {
      multiplier *= 1.3;
    }
    
    // Special events (simplified)
    const dayOfMonth = timestamp.getDate();
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      multiplier *= 1.1; // Beginning/middle of month
    }
    
    return multiplier;
  }

  // Calculate prediction confidence
  private calculateConfidence(basePattern: DemandPattern, allPatterns: DemandPattern[]): number {
    // Calculate variance in similar time slots
    const similarPatterns = allPatterns.filter(p => 
      Math.abs(p.hour - basePattern.hour) <= 1 && 
      Math.abs(p.orderCount - basePattern.orderCount) / basePattern.orderCount < 0.3
    );
    
    if (similarPatterns.length < 3) return 0.6; // Low confidence if few similar patterns
    
    const variance = this.calculateVariance(similarPatterns.map(p => p.orderCount));
    const coefficientOfVariation = Math.sqrt(variance) / basePattern.orderCount;
    
    // Higher confidence for lower variance
    return Math.max(0.3, Math.min(0.95, 1 - coefficientOfVariation));
  }

  // Calculate variance of a dataset
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  // Generate factors affecting demand
  private generateFactors(
    basePattern: DemandPattern,
    weather?: { condition: string; temperature: number },
    timestamp?: Date
  ): string[] {
    const factors = [];
    
    if (basePattern.peakFactor > 0.8) {
      factors.push('Peak ordering time');
    }
    
    if (timestamp) {
      const hour = timestamp.getHours();
      if (hour >= 7 && hour <= 9) factors.push('Breakfast rush');
      if (hour >= 12 && hour <= 14) factors.push('Lunch rush');
      if (hour >= 19 && hour <= 21) factors.push('Dinner rush');
      if (hour >= 22 || hour <= 2) factors.push('Late night orders');
    }
    
    if (weather) {
      if (weather.condition.toLowerCase().includes('rain')) {
        factors.push('Bad weather increases delivery demand');
      }
      if (weather.temperature > 30) {
        factors.push('Hot weather increases beverage demand');
      }
      if (weather.temperature < 10) {
        factors.push('Cold weather increases food demand');
      }
    }
    
    return factors;
  }

  // Generate recommendations for delivery partners
  private generateRecommendations(predictedOrders: number, peakFactor: number): string[] {
    const recommendations = [];
    
    if (predictedOrders > 100) {
      recommendations.push('High demand expected - ensure sufficient delivery partners');
      recommendations.push('Consider pre-positioning at popular pickup locations');
    } else if (predictedOrders > 50) {
      recommendations.push('Moderate demand - maintain normal delivery capacity');
    } else {
      recommendations.push('Low demand period - partners can take breaks or handle other tasks');
    }
    
    if (peakFactor > 0.8) {
      recommendations.push('Peak hours - prioritize speed over cost optimization');
      recommendations.push('Consider surge pricing for premium delivery');
    }
    
    if (predictedOrders > 80) {
      recommendations.push('Batch orders for efficiency');
      recommendations.push('Use route optimization for multiple deliveries');
    }
    
    return recommendations;
  }

  // Generate fallback prediction when historical data is unavailable
  private generateFallbackPrediction(timestamp: Date): DemandPrediction {
    const hour = timestamp.getHours();
    let predictedOrders = 30; // Base prediction
    
    // Simple time-based estimation
    if (hour >= 7 && hour <= 9) predictedOrders = 60; // Breakfast
    else if (hour >= 12 && hour <= 14) predictedOrders = 80; // Lunch
    else if (hour >= 19 && hour <= 21) predictedOrders = 70; // Dinner
    else if (hour >= 22 || hour <= 2) predictedOrders = 20; // Late night
    
    return {
      timestamp,
      predictedOrders,
      confidence: 0.4, // Low confidence for fallback
      factors: ['Fallback prediction - limited historical data'],
      recommendations: ['Collect more data for better predictions']
    };
  }

  // Get campus-wide demand overview
  async getCampusDemand(campusId: string): Promise<CampusDemand> {
    try {
      const now = new Date();
      const predictions: DemandPrediction[] = [];
      
      // Generate predictions for next 24 hours
      for (let i = 0; i < 24; i++) {
        const futureTime = new Date(now.getTime() + i * 60 * 60 * 1000);
        const prediction = await this.predictDemand(campusId, futureTime);
        predictions.push(prediction);
      }
      
      // Identify peak hours
      const peakHours = this.identifyPeakHours(predictions);
      
      // Identify busy days
      const busyDays = this.identifyBusyDays(predictions);
      
      return {
        campusId,
        predictions,
        peakHours,
        busyDays
      };
      
    } catch (error) {
      console.error('Campus demand error:', error);
      throw error;
    }
  }

  // Identify peak hours from predictions
  private identifyPeakHours(predictions: DemandPrediction[]): Array<{ hour: number; intensity: 'low' | 'medium' | 'high' }> {
    const hourlyAverages = new Map<number, number>();
    
    // Group by hour and calculate average orders
    predictions.forEach(pred => {
      const hour = pred.timestamp.getHours();
      const current = hourlyAverages.get(hour) || 0;
      hourlyAverages.set(hour, current + pred.predictedOrders);
    });
    
    // Calculate overall average
    const allValues = Array.from(hourlyAverages.values());
    const overallAverage = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    
    // Categorize hours by intensity
    return Array.from(hourlyAverages.entries()).map(([hour, orders]) => {
      let intensity: 'low' | 'medium' | 'high';
      if (orders < overallAverage * 0.7) intensity = 'low';
      else if (orders < overallAverage * 1.3) intensity = 'medium';
      else intensity = 'high';
      
      return { hour, intensity };
    }).sort((a, b) => a.hour - b.hour);
  }

  // Identify busy days from predictions
  private identifyBusyDays(predictions: DemandPrediction[]): Array<{ day: string; intensity: 'low' | 'medium' | 'high' }> {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = new Map<number, number>();
    
    // Group by day and calculate total orders
    predictions.forEach(pred => {
      const day = pred.timestamp.getDay();
      const current = dayTotals.get(day) || 0;
      dayTotals.set(day, current + pred.predictedOrders);
    });
    
    // Calculate overall average
    const allValues = Array.from(dayTotals.values());
    const overallAverage = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    
    // Categorize days by intensity
    return Array.from(dayTotals.entries()).map(([day, orders]) => {
      let intensity: 'low' | 'medium' | 'high';
      if (orders < overallAverage * 0.8) intensity = 'low';
      else if (orders < overallAverage * 1.2) intensity = 'medium';
      else intensity = 'high';
      
      return { day: dayNames[day], intensity };
    });
  }

  // Update historical patterns with new data
  async updateHistoricalPatterns(campusId: string, newOrders: any[]): Promise<void> {
    try {
      // In production, this would update the database with new order data
      // For now, we'll just log the update
      console.log(`Updating historical patterns for ${campusId} with ${newOrders.length} new orders`);
      
      // This is where you'd implement actual pattern learning
      // For example, using moving averages or machine learning models
      
    } catch (error) {
      console.error('Failed to update historical patterns:', error);
    }
  }
}

export const demandPrediction = new DemandPredictionService();
