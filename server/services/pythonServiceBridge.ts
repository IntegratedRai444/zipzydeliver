/**
 * Python Service Bridge for Node.js
 * This module provides integration between Node.js and Python AI/ML services
 */

import { spawn, ChildProcess } from 'child_process';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';

interface PythonServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCaching: boolean;
  cacheTTL: number;
}

interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  services: Record<string, string>;
}

class PythonServiceBridge extends EventEmitter {
  private config: PythonServiceConfig;
  private httpClient: AxiosInstance;
  private pythonProcess: ChildProcess | null = null;
  private isHealthy: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 60000; // 1 minute
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: Partial<PythonServiceConfig> = {}) {
    super();
    
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:8000',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
    };

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status >= 500) {
          this.emit('serviceError', error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Start Python services
   */
  async startPythonServices(): Promise<void> {
    try {
      const pythonPath = path.join(__dirname, '../python_services');
      const bridgePath = path.join(pythonPath, 'integration/nodejs_bridge.py');
      
      if (!fs.existsSync(bridgePath)) {
        throw new Error(`Python bridge not found at ${bridgePath}`);
      }

      this.pythonProcess = spawn('python', [bridgePath], {
        cwd: pythonPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: pythonPath }
      });

      this.pythonProcess.stdout?.on('data', (data) => {
        console.log(`Python Service: ${data}`);
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        console.error(`Python Service Error: ${data}`);
      });

      this.pythonProcess.on('close', (code) => {
        console.log(`Python Service exited with code ${code}`);
        this.isHealthy = false;
        this.emit('serviceStopped', code);
      });

      this.pythonProcess.on('error', (error) => {
        console.error('Python Service error:', error);
        this.isHealthy = false;
        this.emit('serviceError', error);
      });

      // Wait for service to start
      await this.waitForService();
      
    } catch (error) {
      console.error('Failed to start Python services:', error);
      throw error;
    }
  }

  /**
   * Stop Python services
   */
  async stopPythonServices(): Promise<void> {
    if (this.pythonProcess) {
      this.pythonProcess.kill('SIGTERM');
      this.pythonProcess = null;
      this.isHealthy = false;
    }
  }

  /**
   * Wait for Python service to be ready
   */
  private async waitForService(maxAttempts: number = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await this.httpClient.get('/health');
        if (response.status === 200) {
          this.isHealthy = true;
          this.emit('serviceReady');
          return;
        }
      } catch (error) {
        // Service not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Python service failed to start within timeout');
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response: AxiosResponse<HealthStatus> = await this.httpClient.get('/health');
      this.isHealthy = response.data.status === 'healthy';
      this.lastHealthCheck = Date.now();
      return response.data;
    } catch (error) {
      this.isHealthy = false;
      throw error;
    }
  }

  /**
   * Ensure service is healthy
   */
  private async ensureHealthy(): Promise<boolean> {
    const now = Date.now();
    
    if (now - this.lastHealthCheck > this.healthCheckInterval) {
      try {
        await this.checkHealth();
      } catch (error) {
        this.isHealthy = false;
      }
    }
    
    return this.isHealthy;
  }

  /**
   * Get cached result
   */
  private getCachedResult<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;
    
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Set cached result
   */
  private setCachedResult<T>(key: string, data: T): void {
    if (!this.config.enableCaching) return;
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any
  ): Promise<ServiceResponse<T>> {
    if (!(await this.ensureHealthy())) {
      return {
        success: false,
        error: 'Python services are not healthy',
        timestamp: new Date().toISOString()
      };
    }

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        let response: AxiosResponse;
        
        if (method === 'GET') {
          response = await this.httpClient.get(endpoint);
        } else {
          response = await this.httpClient.post(endpoint, data);
        }
        
        return {
          success: true,
          data: response.data,
          timestamp: new Date().toISOString()
        };
        
      } catch (error: any) {
        console.warn(`Request attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < this.config.retryAttempts - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt))
          );
        } else {
          return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          };
        }
      }
    }
    
    return {
      success: false,
      error: 'All retry attempts failed',
      timestamp: new Date().toISOString()
    };
  }

  // Analytics Methods
  async generateDailyReport(data: any): Promise<ServiceResponse> {
    const cacheKey = `daily_report_${JSON.stringify(data)}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: new Date().toISOString()
      };
    }
    
    const result = await this.makeRequest('POST', '/api/analytics/daily-report', data);
    
    if (result.success && result.data) {
      this.setCachedResult(cacheKey, result.data);
    }
    
    return result;
  }

  async analyzeCustomerSegments(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/analytics/customer-segments', data);
  }

  async calculateDeliveryMetrics(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/analytics/delivery-metrics', data);
  }

  async analyzeRevenueTrends(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/analytics/revenue-trends', data);
  }

  async generatePartnerPerformance(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/analytics/partner-performance', data);
  }

  // Recommendation Methods
  async generateProductRecommendations(data: any): Promise<ServiceResponse> {
    const cacheKey = `product_recommendations_${data.user_id || 'anonymous'}`;
    const cached = this.getCachedResult(cacheKey);
    
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: new Date().toISOString()
      };
    }
    
    const result = await this.makeRequest('POST', '/api/recommendations/products', data);
    
    if (result.success && result.data) {
      this.setCachedResult(cacheKey, result.data);
    }
    
    return result;
  }

  async generateDeliveryRecommendations(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/recommendations/delivery', data);
  }

  async generateMenuRecommendations(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/recommendations/menu', data);
  }

  async generatePromotionalRecommendations(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/recommendations/promotional', data);
  }

  // Fraud Detection Methods
  async detectFakeOrders(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/fraud/orders', data);
  }

  async detectPaymentFraud(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/fraud/payments', data);
  }

  async detectAccountTakeover(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/fraud/accounts', data);
  }

  async detectDeliveryFraud(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/fraud/delivery', data);
  }

  // Demand Prediction Methods
  async predictDailyDemand(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/demand/daily-forecast', data);
  }

  async predictHourlyDemand(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/demand/hourly-forecast', data);
  }

  // Route Optimization Methods
  async optimizeRoute(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/route/optimize', data);
  }

  // NLP Methods
  async analyzeSentiment(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/nlp/sentiment', data);
  }

  async classifyText(data: any): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/nlp/classify', data);
  }

  // Batch Processing
  async batchProcess(tasks: any[]): Promise<ServiceResponse> {
    return this.makeRequest('POST', '/api/batch/process', { tasks });
  }

  // Utility Methods
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): any {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, cached] of Array.from(this.cache.entries())) {
      if (now - cached.timestamp < this.config.cacheTTL) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      cacheTTL: this.config.cacheTTL,
      isHealthy: this.isHealthy
    };
  }

  getServiceStatus(): any {
    return {
      isHealthy: this.isHealthy,
      lastHealthCheck: this.lastHealthCheck,
      config: this.config,
      cacheStats: this.getCacheStats()
    };
  }
}

// Export singleton instance
export const pythonServiceBridge = new PythonServiceBridge();

// Export class for custom instances
export { PythonServiceBridge };

// Export types
export type { PythonServiceConfig, ServiceResponse, HealthStatus };
