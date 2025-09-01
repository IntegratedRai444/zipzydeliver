import express from 'express';
import { pythonAIIntegration } from '../services/pythonAIIntegration';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all AI routes
// router.use(authenticateToken);

// ===== DEMAND PREDICTION ROUTES =====
router.post('/demand/daily', async (req, res) => {
  try {
    const prediction = await pythonAIIntegration.predictDailyDemand(req.body);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict daily demand' });
  }
});

router.post('/demand/hourly', async (req, res) => {
  try {
    const prediction = await pythonAIIntegration.predictHourlyDemand(req.body);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict hourly demand' });
  }
});

router.post('/demand/weather-impact', async (req, res) => {
  try {
    const impact = await pythonAIIntegration.predictWeatherImpact(req.body);
    res.json(impact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze weather impact' });
  }
});

// ===== ROUTE OPTIMIZATION ROUTES =====
router.post('/route/optimize', async (req, res) => {
  try {
    const optimization = await pythonAIIntegration.optimizeDeliveryRoute(req.body);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize route' });
  }
});

router.post('/route/partner-assignment', async (req, res) => {
  try {
    const assignment = await pythonAIIntegration.optimizePartnerAssignment(req.body);
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize partner assignment' });
  }
});

// ===== NLP SERVICE ROUTES =====
router.post('/nlp/analyze-feedback', async (req, res) => {
  try {
    const analysis = await pythonAIIntegration.analyzeCustomerFeedback(req.body.feedback);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze feedback' });
  }
});

router.post('/nlp/generate-response', async (req, res) => {
  try {
    const response = await pythonAIIntegration.generateSmartResponse(req.body.query, req.body.context);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// ===== ANALYTICS SERVICE ROUTES =====
router.post('/analytics/daily-report', async (req, res) => {
  try {
    const report = await pythonAIIntegration.generateDailyReport(req.body);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

router.post('/analytics/customer-segments', async (req, res) => {
  try {
    const segments = await pythonAIIntegration.analyzeCustomerSegments(req.body);
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze customer segments' });
  }
});

// ===== RECOMMENDATION SERVICE ROUTES =====
router.post('/recommend/products', async (req, res) => {
  try {
    const recommendations = await pythonAIIntegration.recommendProducts(req.body);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate product recommendations' });
  }
});

router.post('/recommend/delivery-times', async (req, res) => {
  try {
    const times = await pythonAIIntegration.recommendDeliveryTimes(req.body);
    res.json(times);
  } catch (error) {
    res.status(500).json({ error: 'Failed to recommend delivery times' });
  }
});

// ===== FRAUD DETECTION ROUTES =====
router.post('/fraud/detect-orders', async (req, res) => {
  try {
    const fraudCheck = await pythonAIIntegration.detectFakeOrders(req.body);
    res.json(fraudCheck);
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect fraud' });
  }
});

router.post('/fraud/detect-payment', async (req, res) => {
  try {
    const fraudCheck = await pythonAIIntegration.detectPaymentFraud(req.body);
    res.json(fraudCheck);
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect payment fraud' });
  }
});

// ===== WEATHER SERVICE ROUTES =====
router.post('/weather/forecast', async (req, res) => {
  try {
    const forecast = await pythonAIIntegration.getWeatherForecast(req.body.location);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get weather forecast' });
  }
});

router.post('/weather/impact', async (req, res) => {
  try {
    const impact = await pythonAIIntegration.analyzeWeatherImpact(req.body);
    res.json(impact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze weather impact' });
  }
});

// ===== TRAFFIC SERVICE ROUTES =====
router.post('/traffic/conditions', async (req, res) => {
  try {
    const conditions = await pythonAIIntegration.getTrafficConditions(req.body.route);
    res.json(conditions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get traffic conditions' });
  }
});

router.post('/traffic/predict', async (req, res) => {
  try {
    const patterns = await pythonAIIntegration.predictTrafficPatterns(req.body);
    res.json(patterns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict traffic patterns' });
  }
});

// ===== INVENTORY SERVICE ROUTES =====
router.post('/inventory/predict-stock', async (req, res) => {
  try {
    const prediction = await pythonAIIntegration.predictStockNeeds(req.body);
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict stock needs' });
  }
});

router.post('/inventory/optimize-reorder', async (req, res) => {
  try {
    const optimization = await pythonAIIntegration.optimizeReorderPoints(req.body);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize reorder points' });
  }
});

// ===== PRICING SERVICE ROUTES =====
router.post('/pricing/dynamic', async (req, res) => {
  try {
    const pricing = await pythonAIIntegration.calculateDynamicPricing(req.body);
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate dynamic pricing' });
  }
});

router.post('/pricing/demand-based', async (req, res) => {
  try {
    const pricing = await pythonAIIntegration.calculateDemandBasedPricing(req.body);
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate demand-based pricing' });
  }
});

// ===== CUSTOMER SERVICE ROUTES =====
router.post('/customer/churn-prediction', async (req, res) => {
  try {
    const churnRisk = await pythonAIIntegration.predictCustomerChurn(req.body);
    res.json(churnRisk);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict customer churn' });
  }
});

router.post('/customer/satisfaction', async (req, res) => {
  try {
    const satisfaction = await pythonAIIntegration.analyzeCustomerSatisfaction(req.body);
    res.json(satisfaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze customer satisfaction' });
  }
});

// ===== OPERATIONAL SERVICE ROUTES =====
router.post('/operational/staff-scheduling', async (req, res) => {
  try {
    const schedule = await pythonAIIntegration.optimizeStaffScheduling(req.body);
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize staff scheduling' });
  }
});

router.post('/operational/maintenance', async (req, res) => {
  try {
    const maintenance = await pythonAIIntegration.predictEquipmentMaintenance(req.body);
    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict maintenance needs' });
  }
});

// ===== FINANCIAL SERVICE ROUTES =====
router.post('/financial/revenue-forecast', async (req, res) => {
  try {
    const forecast = await pythonAIIntegration.forecastRevenue(req.body);
    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: 'Failed to forecast revenue' });
  }
});

router.post('/financial/cost-optimization', async (req, res) => {
  try {
    const optimization = await pythonAIIntegration.optimizeCosts(req.body);
    res.json(optimization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to optimize costs' });
  }
});

// ===== MARKETING SERVICE ROUTES =====
router.post('/marketing/campaign-effectiveness', async (req, res) => {
  try {
    const effectiveness = await pythonAIIntegration.analyzeCampaignEffectiveness(req.body);
    res.json(effectiveness);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze campaign effectiveness' });
  }
});

router.post('/marketing/customer-segmentation', async (req, res) => {
  try {
    const segments = await pythonAIIntegration.segmentCustomers(req.body);
    res.json(segments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to segment customers' });
  }
});

// ===== SECURITY SERVICE ROUTES =====
router.post('/security/anomaly-detection', async (req, res) => {
  try {
    const anomalies = await pythonAIIntegration.detectAnomalies(req.body);
    res.json(anomalies);
  } catch (error) {
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

router.post('/security/access-patterns', async (req, res) => {
  try {
    const patterns = await pythonAIIntegration.analyzeAccessPatterns(req.body);
    res.json(patterns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze access patterns' });
  }
});

// ===== BATCH PROCESSING ROUTES =====
router.post('/batch/process-orders', async (req, res) => {
  try {
    const result = await pythonAIIntegration.processOrdersBatch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process orders batch' });
  }
});

router.post('/batch/generate-reports', async (req, res) => {
  try {
    const result = await pythonAIIntegration.generateReportsBatch(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate reports batch' });
  }
});

// ===== HEALTH CHECK ROUTE =====
router.get('/health', async (req, res) => {
  try {
    const health = await pythonAIIntegration.checkServiceHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check AI service health' });
  }
});

// ===== SERVICE STATUS ROUTE =====
router.get('/status', async (req, res) => {
  try {
    const isAvailable = await pythonAIIntegration.isServiceAvailable();
    res.json({
      service: 'Python AI Services',
      status: isAvailable ? 'available' : 'unavailable',
      url: pythonAIIntegration.getServiceUrl(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

export default router;
