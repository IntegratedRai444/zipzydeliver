/**
 * Python Services API Routes
 * This module provides API endpoints for Python AI/ML services
 */

import { Router, Request, Response } from 'express';
import { pythonServiceBridge } from '../services/pythonServiceBridge';

const router = Router();

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await pythonServiceBridge.checkHealth();
    res.json(health);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Service status endpoint
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = pythonServiceBridge.getServiceStatus();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Analytics endpoints
router.post('/analytics/daily-report', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.generateDailyReport(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/analytics/customer-segments', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.analyzeCustomerSegments(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/analytics/delivery-metrics', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.calculateDeliveryMetrics(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/analytics/revenue-trends', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.analyzeRevenueTrends(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/analytics/partner-performance', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.generatePartnerPerformance(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Recommendation endpoints
router.post('/recommendations/products', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.generateProductRecommendations(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/recommendations/delivery', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.generateDeliveryRecommendations(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/recommendations/menu', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.generateMenuRecommendations(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/recommendations/promotional', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.generatePromotionalRecommendations(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Fraud detection endpoints
router.post('/fraud/orders', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.detectFakeOrders(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/fraud/payments', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.detectPaymentFraud(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/fraud/accounts', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.detectAccountTakeover(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/fraud/delivery', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.detectDeliveryFraud(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Demand prediction endpoints
router.post('/demand/daily-forecast', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.predictDailyDemand(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/demand/hourly-forecast', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.predictHourlyDemand(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Route optimization endpoints
router.post('/route/optimize', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.optimizeRoute(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// NLP endpoints
router.post('/nlp/sentiment', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.analyzeSentiment(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/nlp/classify', async (req: Request, res: Response) => {
  try {
    const result = await pythonServiceBridge.classifyText(req.body);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Batch processing endpoint
router.post('/batch/process', async (req: Request, res: Response) => {
  try {
    const { tasks } = req.body;
    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: 'Tasks must be an array',
        timestamp: new Date().toISOString()
      });
    }
    
    const result = await pythonServiceBridge.batchProcess(tasks);
    res.json(result);
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Cache management endpoints
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    pythonServiceBridge.clearCache();
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = pythonServiceBridge.getCacheStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Service management endpoints
router.post('/start', async (req: Request, res: Response) => {
  try {
    await pythonServiceBridge.startPythonServices();
    res.json({
      success: true,
      message: 'Python services started successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/stop', async (req: Request, res: Response) => {
  try {
    await pythonServiceBridge.stopPythonServices();
    res.json({
      success: true,
      message: 'Python services stopped successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Python service error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
