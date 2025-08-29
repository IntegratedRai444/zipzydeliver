import axios from 'axios';

interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;
  timestamp: string;
}

export class PythonAIIntegrationService {
  private pythonServiceUrl: string;
  private timeout: number;

  constructor() {
    this.pythonServiceUrl = process.env.PYTHON_AI_SERVICE_URL || 'http://localhost:8000';
    this.timeout = 30000; // 30 seconds
  }

  private async makeRequest<T>(endpoint: string, data: any): Promise<AIResponse<T>> {
    try {
      const response = await axios.post(`${this.pythonServiceUrl}${endpoint}`, data, {
        timeout: this.timeout,
        headers: { 'Content-Type': 'application/json' }
      });

      return {
        success: true,
        data: response.data,
        confidence: response.data.confidence,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error(`Python AI Service Error (${endpoint}):`, error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== DEMAND PREDICTION SERVICE =====
  async predictDailyDemand(data: any): Promise<AIResponse> {
    return this.makeRequest('/predict/daily-demand', data);
  }

  async predictHourlyDemand(data: any): Promise<AIResponse> {
    return this.makeRequest('/predict/hourly-demand', data);
  }

  async predictWeatherImpact(data: any): Promise<AIResponse> {
    return this.makeRequest('/predict/weather-impact', data);
  }

  // ===== ROUTE OPTIMIZATION SERVICE =====
  async optimizeDeliveryRoute(data: any): Promise<AIResponse> {
    return this.makeRequest('/optimize/route', data);
  }

  async optimizePartnerAssignment(data: any): Promise<AIResponse> {
    return this.makeRequest('/optimize/partner-assignment', data);
  }

  // ===== NLP SERVICE =====
  async analyzeCustomerFeedback(feedback: string): Promise<AIResponse> {
    return this.makeRequest('/nlp/analyze-feedback', { feedback });
  }

  async generateSmartResponse(query: string, context: any): Promise<AIResponse> {
    return this.makeRequest('/nlp/generate-response', { query, context });
  }

  // ===== ANALYTICS SERVICE =====
  async generateDailyReport(data: any): Promise<AIResponse> {
    return this.makeRequest('/analytics/daily-report', data);
  }

  async analyzeCustomerSegments(data: any): Promise<AIResponse> {
    return this.makeRequest('/analytics/customer-segments', data);
  }

  // ===== RECOMMENDATION SERVICE =====
  async recommendProducts(data: any): Promise<AIResponse> {
    return this.makeRequest('/recommend/products', data);
  }

  async recommendDeliveryTimes(data: any): Promise<AIResponse> {
    return this.makeRequest('/recommend/delivery-times', data);
  }

  // ===== FRAUD DETECTION SERVICE =====
  async detectFakeOrders(data: any): Promise<AIResponse> {
    return this.makeRequest('/fraud/detect-fake-orders', data);
  }

  async detectPaymentFraud(data: any): Promise<AIResponse> {
    return this.makeRequest('/fraud/detect-payment-fraud', data);
  }

  // ===== WEATHER SERVICE =====
  async getWeatherForecast(location: string): Promise<AIResponse> {
    return this.makeRequest('/weather/forecast', { location });
  }

  async analyzeWeatherImpact(data: any): Promise<AIResponse> {
    return this.makeRequest('/weather/impact-analysis', data);
  }

  // ===== TRAFFIC SERVICE =====
  async getTrafficConditions(route: any): Promise<AIResponse> {
    return this.makeRequest('/traffic/conditions', { route });
  }

  async predictTrafficPatterns(data: any): Promise<AIResponse> {
    return this.makeRequest('/traffic/predict-patterns', data);
  }

  // ===== INVENTORY SERVICE =====
  async predictStockNeeds(data: any): Promise<AIResponse> {
    return this.makeRequest('/inventory/predict-stock', data);
  }

  async optimizeReorderPoints(data: any): Promise<AIResponse> {
    return this.makeRequest('/inventory/optimize-reorder', data);
  }

  // ===== PRICING SERVICE =====
  async calculateDynamicPricing(data: any): Promise<AIResponse> {
    return this.makeRequest('/pricing/dynamic-pricing', data);
  }

  async calculateDemandBasedPricing(data: any): Promise<AIResponse> {
    return this.makeRequest('/pricing/demand-based', data);
  }

  // ===== CUSTOMER SERVICE =====
  async predictCustomerChurn(data: any): Promise<AIResponse> {
    return this.makeRequest('/customer/churn-prediction', data);
  }

  async analyzeCustomerSatisfaction(data: any): Promise<AIResponse> {
    return this.makeRequest('/customer/satisfaction-analysis', data);
  }

  // ===== OPERATIONAL SERVICE =====
  async optimizeStaffScheduling(data: any): Promise<AIResponse> {
    return this.makeRequest('/operational/staff-scheduling', data);
  }

  async predictEquipmentMaintenance(data: any): Promise<AIResponse> {
    return this.makeRequest('/operational/maintenance-prediction', data);
  }

  // ===== FINANCIAL SERVICE =====
  async forecastRevenue(data: any): Promise<AIResponse> {
    return this.makeRequest('/financial/revenue-forecast', data);
  }

  async optimizeCosts(data: any): Promise<AIResponse> {
    return this.makeRequest('/financial/cost-optimization', data);
  }

  // ===== MARKETING SERVICE =====
  async analyzeCampaignEffectiveness(data: any): Promise<AIResponse> {
    return this.makeRequest('/marketing/campaign-effectiveness', data);
  }

  async segmentCustomers(data: any): Promise<AIResponse> {
    return this.makeRequest('/marketing/customer-segmentation', data);
  }

  // ===== SECURITY SERVICE =====
  async detectAnomalies(data: any): Promise<AIResponse> {
    return this.makeRequest('/security/anomaly-detection', data);
  }

  async analyzeAccessPatterns(data: any): Promise<AIResponse> {
    return this.makeRequest('/security/access-pattern-analysis', data);
  }

  // ===== BATCH PROCESSING =====
  async processOrdersBatch(data: any): Promise<AIResponse> {
    return this.makeRequest('/batch/process-orders', data);
  }

  async generateReportsBatch(data: any): Promise<AIResponse> {
    return this.makeRequest('/batch/generate-reports', data);
  }

  // ===== HEALTH CHECK =====
  async checkServiceHealth(): Promise<AIResponse> {
    try {
      const response = await axios.get(`${this.pythonServiceUrl}/health`, {
        timeout: 5000
      });
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== UTILITY METHODS =====
  getServiceUrl(): string {
    return this.pythonServiceUrl;
  }

  isServiceAvailable(): Promise<boolean> {
    return this.checkServiceHealth().then(response => response.success);
  }
}

// Export singleton instance
export const pythonAIIntegration = new PythonAIIntegrationService();
