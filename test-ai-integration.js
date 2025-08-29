#!/usr/bin/env node

/**
 * AI Integration Test Script
 * Tests the integration between Node.js backend and Python AI services
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const PYTHON_AI_URL = 'http://localhost:8000';

// Test configuration
const TEST_CONFIG = {
  timeout: 10000,
  retries: 3
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const testResult = (testName, success, details = '') => {
  results.total++;
  if (success) {
    results.passed++;
    log(`${testName}: PASSED`, 'success');
  } else {
    results.failed++;
    log(`${testName}: FAILED - ${details}`, 'error');
  }
  
  results.details.push({
    test: testName,
    success,
    details,
    timestamp: new Date().toISOString()
  });
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
const testPythonAIServiceHealth = async () => {
  try {
    const response = await axios.get(`${PYTHON_AI_URL}/health`, { timeout: TEST_CONFIG.timeout });
    const isHealthy = response.status === 200 && response.data.status === 'healthy';
    testResult('Python AI Service Health Check', isHealthy, 
      isHealthy ? 'Service is healthy' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isHealthy;
  } catch (error) {
    testResult('Python AI Service Health Check', false, error.message);
    return false;
  }
};

const testNodeJSAIStatus = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/ai/status`, { timeout: TEST_CONFIG.timeout });
    const isAvailable = response.status === 200 && response.data.status === 'available';
    testResult('Node.js AI Status Endpoint', isAvailable,
      isAvailable ? 'AI services are available' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isAvailable;
  } catch (error) {
    testResult('Node.js AI Status Endpoint', false, error.message);
    return false;
  }
};

const testDemandPrediction = async () => {
  try {
    const testData = {
      location: 'campus_center',
      date: new Date().toISOString().split('T')[0],
      weather: 'sunny'
    };

    const response = await axios.post(`${BASE_URL}/api/ai/demand/daily`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Demand Prediction API', isSuccess,
      isSuccess ? 'Successfully predicted demand' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Demand Prediction API', false, error.message);
    return false;
  }
};

const testRouteOptimization = async () => {
  try {
    const testData = {
      orders: [
        { id: 'order1', location: { lat: 28.7041, lng: 77.1025 }, priority: 'high' },
        { id: 'order2', location: { lat: 28.7042, lng: 77.1026 }, priority: 'medium' }
      ],
      partners: [
        { id: 'partner1', location: { lat: 28.7040, lng: 77.1024 }, available: true },
        { id: 'partner2', location: { lat: 28.7043, lng: 77.1027 }, available: true }
      ],
      constraints: { maxDistance: 10, timeWindow: '2h' }
    };

    const response = await axios.post(`${BASE_URL}/api/ai/route/optimize`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Route Optimization API', isSuccess,
      isSuccess ? 'Successfully optimized route' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Route Optimization API', false, error.message);
    return false;
  }
};

const testFraudDetection = async () => {
  try {
    const testData = {
      orderData: {
        customerId: 'customer123',
        amount: 1500,
        items: ['burger', 'fries'],
        deliveryAddress: 'Campus Center'
      },
      customerHistory: [
        { orderId: 'prev1', amount: 800, status: 'delivered' },
        { orderId: 'prev2', amount: 1200, status: 'delivered' }
      ],
      location: 'Campus Center'
    };

    const response = await axios.post(`${BASE_URL}/api/ai/fraud/detect-orders`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Fraud Detection API', isSuccess,
      isSuccess ? 'Successfully detected fraud' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Fraud Detection API', false, error.message);
    return false;
  }
};

const testNLPService = async () => {
  try {
    const testData = {
      feedback: 'The delivery was excellent and the food was delicious!'
    };

    const response = await axios.post(`${BASE_URL}/api/ai/nlp/analyze-feedback`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('NLP Service API', isSuccess,
      isSuccess ? 'Successfully analyzed feedback' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('NLP Service API', false, error.message);
    return false;
  }
};

const testAnalyticsService = async () => {
  try {
    const testData = {
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      metrics: ['orders', 'revenue', 'customer_satisfaction']
    };

    const response = await axios.post(`${BASE_URL}/api/ai/analytics/daily-report`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Analytics Service API', isSuccess,
      isSuccess ? 'Successfully generated analytics report' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Analytics Service API', false, error.message);
    return false;
  }
};

const testRecommendationService = async () => {
  try {
    const testData = {
      userId: 'user123',
      preferences: ['fast_food', 'healthy_options'],
      orderHistory: ['burger', 'salad', 'pizza']
    };

    const response = await axios.post(`${BASE_URL}/api/ai/recommend/products`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Recommendation Service API', isSuccess,
      isSuccess ? 'Successfully generated recommendations' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Recommendation Service API', false, error.message);
    return false;
  }
};

const testOperationalService = async () => {
  try {
    const testData = {
      staff: [
        { id: 'staff1', role: 'delivery', availability: 'morning', efficiency: 0.85 },
        { id: 'staff2', role: 'kitchen', availability: 'evening', efficiency: 0.92 }
      ],
      workload: { orders: 150, peakHours: ['12:00-14:00', '18:00-20:00'] }
    };

    const response = await axios.post(`${BASE_URL}/api/ai/operational/staff-scheduling`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Operational Service API', isSuccess,
      isSuccess ? 'Successfully optimized staff scheduling' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Operational Service API', false, error.message);
    return false;
  }
};

const testFinancialService = async () => {
  try {
    const testData = {
      historicalData: [
        { month: '2024-01', revenue: 50000, costs: 35000, orders: 1200 },
        { month: '2024-02', revenue: 55000, costs: 38000, orders: 1350 },
        { month: '2024-03', revenue: 60000, costs: 40000, orders: 1500 }
      ],
      forecastPeriod: 3
    };

    const response = await axios.post(`${BASE_URL}/api/ai/financial/revenue-forecast`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Financial Service API', isSuccess,
      isSuccess ? 'Successfully forecasted revenue' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Financial Service API', false, error.message);
    return false;
  }
};

const testBatchProcessing = async () => {
  try {
    const testData = {
      orders: ['order1', 'order2', 'order3'],
      type: 'analytics',
      priority: 'medium'
    };

    const response = await axios.post(`${BASE_URL}/api/ai/batch/process-orders`, testData, {
      timeout: TEST_CONFIG.timeout,
      headers: { 'Content-Type': 'application/json' }
    });

    const isSuccess = response.status === 200 && response.data.success;
    testResult('Batch Processing API', isSuccess,
      isSuccess ? 'Successfully started batch processing' : `Unexpected response: ${JSON.stringify(response.data)}`);
    return isSuccess;
  } catch (error) {
    testResult('Batch Processing API', false, error.message);
    return false;
  }
};

// Main test runner
const runAllTests = async () => {
  log('🚀 Starting AI Integration Tests...', 'info');
  log(`Testing Node.js backend at: ${BASE_URL}`, 'info');
  log(`Testing Python AI services at: ${PYTHON_AI_URL}`, 'info');
  log('', 'info');

  // Wait for services to be ready
  log('⏳ Waiting for services to be ready...', 'info');
  await wait(2000);

  // Run tests
  await testPythonAIServiceHealth();
  await testNodeJSAIStatus();
  await testDemandPrediction();
  await testRouteOptimization();
  await testFraudDetection();
  await testNLPService();
  await testAnalyticsService();
  await testRecommendationService();
  await testOperationalService();
  await testFinancialService();
  await testBatchProcessing();

  // Print results
  log('', 'info');
  log('📊 Test Results Summary:', 'info');
  log(`Total Tests: ${results.total}`, 'info');
  log(`Passed: ${results.passed} ✅`, 'success');
  log(`Failed: ${results.failed} ❌`, results.failed > 0 ? 'error' : 'success');
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`, 'info');

  if (results.failed > 0) {
    log('', 'info');
    log('❌ Failed Tests:', 'error');
    results.details
      .filter(r => !r.success)
      .forEach(r => log(`  - ${r.test}: ${r.details}`, 'error'));
  }

  log('', 'info');
  if (results.failed === 0) {
    log('🎉 All tests passed! AI integration is working correctly.', 'success');
  } else {
    log('⚠️  Some tests failed. Please check the service configuration and try again.', 'error');
  }

  // Exit with appropriate code
  process.exit(results.failed === 0 ? 0 : 1);
};

// Handle errors and cleanup
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'error');
  process.exit(1);
});

process.on('SIGINT', () => {
  log('Test interrupted by user', 'info');
  process.exit(0);
});

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  results
};
