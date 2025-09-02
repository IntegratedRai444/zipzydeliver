# 🐍 Python Services Integration Guide

## 📋 **OVERVIEW**

This guide provides comprehensive documentation for integrating Python AI/ML services into the Zipzy delivery application. The integration includes advanced analytics, recommendations, fraud detection, demand prediction, route optimization, and NLP services.

## 🚀 **QUICK START**

### **1. Prerequisites**
- Python 3.8 or higher
- Node.js 16 or higher
- MongoDB (local or cloud)
- Git

### **2. Installation**

```bash
# Navigate to Python services directory
cd server/python_services

# Install Python dependencies
python start_python_services.py

# Or manually install dependencies
pip install -r requirements.txt

# Start Python services
python integration/nodejs_bridge.py
```

### **3. Start the Application**

```bash
# Start both Node.js and Python services
npm run dev

# Or start Python services separately
cd server/python_services
python start_python_services.py
```

## 🏗️ **ARCHITECTURE**

### **Service Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Node.js       │    │   Python        │
│   (React)       │◄──►│   Backend       │◄──►│   Services      │
│                 │    │                 │    │                 │
│ - Analytics UI  │    │ - API Routes    │    │ - FastAPI       │
│ - Recommendations│   │ - Service Bridge│    │ - ML Models     │
│ - Fraud Panel   │    │ - Data Transform│    │ - AI Services   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Data Flow**
1. **Frontend** → **Node.js API** → **Python Services**
2. **Python Services** → **Node.js Bridge** → **Frontend**
3. **Real-time** updates via WebSocket connections

## 🔧 **AVAILABLE SERVICES**

### **1. Analytics Service** (`analytics_service.py`)
**Purpose**: Comprehensive business analytics and reporting

**Features**:
- Daily analytics reports
- Customer segmentation (K-means clustering)
- Delivery performance metrics
- Revenue trend analysis
- Partner performance tracking
- Product performance analysis
- Customer lifetime value (CLV) calculation

**API Endpoints**:
```bash
POST /api/python/analytics/daily-report
POST /api/python/analytics/customer-segments
POST /api/python/analytics/delivery-metrics
POST /api/python/analytics/revenue-trends
POST /api/python/analytics/partner-performance
```

**Example Usage**:
```javascript
// Generate daily report
const response = await fetch('/api/python/analytics/daily-report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    orders: [...],
    customers: [...],
    deliveries: [...]
  })
});
```

### **2. Recommendation Service** (`recommendation_service.py`)
**Purpose**: AI-powered recommendations for products, delivery, and marketing

**Features**:
- Personalized product recommendations (collaborative filtering + content-based)
- Delivery optimization recommendations
- Menu optimization suggestions
- Promotional strategy recommendations
- Real-time recommendation updates

**API Endpoints**:
```bash
POST /api/python/recommendations/products
POST /api/python/recommendations/delivery
POST /api/python/recommendations/menu
POST /api/python/recommendations/promotional
```

**Example Usage**:
```javascript
// Get product recommendations
const response = await fetch('/api/python/recommendations/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 'user_123',
    user_preferences: {
      preferred_categories: ['pizza', 'burger'],
      price_range: [50, 300]
    },
    product_catalog: [...],
    user_history: [...]
  })
});
```

### **3. Fraud Detection Service** (`fraud_detection.py`)
**Purpose**: Advanced fraud detection using ensemble ML models

**Features**:
- Fake order detection
- Payment fraud detection
- Account takeover detection
- Delivery fraud detection
- Collusion fraud detection
- Identity theft detection
- Real-time fraud scoring

**API Endpoints**:
```bash
POST /api/python/fraud/orders
POST /api/python/fraud/payments
POST /api/python/fraud/accounts
POST /api/python/fraud/delivery
```

**Example Usage**:
```javascript
// Detect fake orders
const response = await fetch('/api/python/fraud/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order: {
      total_amount: 150.0,
      customer_age_days: 5,
      payment_method: 'upi'
    },
    customer: {
      order_count: 1,
      rating: 0
    }
  })
});
```

### **4. Demand Prediction Service** (`demand_prediction.py`)
**Purpose**: Predict demand patterns for inventory and staffing

**Features**:
- Daily demand forecasting
- Hourly demand prediction
- Weather impact analysis
- Event demand prediction
- Customer behavior analysis
- Product popularity prediction

**API Endpoints**:
```bash
POST /api/python/demand/daily-forecast
POST /api/python/demand/hourly-forecast
```

### **5. Route Optimization Service** (`route_optimization.py`)
**Purpose**: Optimize delivery routes for efficiency

**Features**:
- Multi-stop route optimization
- Real-time route adjustments
- Traffic-aware routing
- Fuel efficiency optimization
- Delivery time estimation
- Partner assignment optimization

**API Endpoints**:
```bash
POST /api/python/route/optimize
```

### **6. NLP Service** (`nlp_service.py`)
**Purpose**: Natural language processing for customer interactions

**Features**:
- Customer sentiment analysis
- Review analysis and insights
- Text classification
- Intent recognition
- Language processing

**API Endpoints**:
```bash
POST /api/python/nlp/sentiment
POST /api/python/nlp/classify
```

## 🔌 **INTEGRATION METHODS**

### **1. Node.js Service Bridge**
The `pythonServiceBridge.ts` provides a seamless integration layer:

```typescript
import { pythonServiceBridge } from './services/pythonServiceBridge';

// Generate analytics report
const result = await pythonServiceBridge.generateDailyReport(data);

// Get recommendations
const recommendations = await pythonServiceBridge.generateProductRecommendations(data);

// Detect fraud
const fraudScore = await pythonServiceBridge.detectFakeOrders(data);
```

### **2. Direct API Calls**
You can also call Python services directly:

```javascript
// Direct API call
const response = await fetch('/api/python/analytics/daily-report', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### **3. Batch Processing**
Process multiple requests efficiently:

```javascript
const tasks = [
  { id: 'task_1', type: 'analytics', data: analyticsData },
  { id: 'task_2', type: 'recommendations', data: recommendationData }
];

const results = await pythonServiceBridge.batchProcess(tasks);
```

## 📊 **DATA TRANSFORMATION**

### **Input Data Format**
All services expect data in a standardized format:

```javascript
// Analytics data
{
  "orders": [
    {
      "id": "order_1",
      "total_amount": 150.0,
      "status": "delivered",
      "created_at": "2024-01-01T10:00:00Z",
      "customer_id": "customer_1"
    }
  ],
  "customers": [
    {
      "id": "customer_1",
      "name": "John Doe",
      "total_spent": 500.0,
      "order_count": 5,
      "created_at": "2024-01-01T09:00:00Z"
    }
  ],
  "deliveries": [
    {
      "id": "delivery_1",
      "order_id": "order_1",
      "status": "delivered",
      "delivery_time": 25.0,
      "distance": 5.2,
      "rating": 4.5
    }
  ]
}
```

### **Output Data Format**
Services return structured responses:

```javascript
{
  "success": true,
  "data": {
    "summary": {
      "total_orders": 150,
      "total_revenue": 25000,
      "success_rate": 0.95
    },
    "insights": [
      "Revenue increased by 15% compared to yesterday",
      "Delivery success rate improved to 95%"
    ],
    "recommendations": [
      "Consider increasing partner capacity during peak hours"
    ]
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🧪 **TESTING**

### **Run Integration Tests**
```bash
cd server/python_services
python test_integration.py
```

### **Test Individual Services**
```bash
# Test health check
curl http://localhost:8000/health

# Test analytics
curl -X POST http://localhost:8000/api/analytics/daily-report \
  -H "Content-Type: application/json" \
  -d '{"orders": [], "customers": [], "deliveries": []}'
```

### **Test from Node.js**
```bash
# Test Python services through Node.js
curl http://localhost:5000/api/python/health
```

## 🔧 **CONFIGURATION**

### **Environment Variables**
```bash
# Python services
PYTHON_SERVICES_URL=http://localhost:8000
PYTHON_SERVICES_TIMEOUT=30000
PYTHON_SERVICES_RETRY_ATTEMPTS=3

# Node.js integration
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/zipzy
```

### **Service Configuration**
```typescript
// Configure Python service bridge
const config = {
  baseUrl: 'http://localhost:8000',
  timeout: 30000,
  retryAttempts: 3,
  enableCaching: true,
  cacheTTL: 300000 // 5 minutes
};

const bridge = new PythonServiceBridge(config);
```

## 📈 **PERFORMANCE OPTIMIZATION**

### **Caching**
- Results are cached for 5 minutes by default
- Cache can be cleared via API: `POST /api/python/cache/clear`
- Cache stats available: `GET /api/python/cache/stats`

### **Batch Processing**
- Process multiple requests in a single call
- Reduces network overhead
- Improves response times

### **Async Processing**
- All services use async/await
- Non-blocking operations
- Better resource utilization

## 🔒 **SECURITY**

### **API Security**
- Input validation on all endpoints
- Rate limiting implemented
- Error handling and logging
- CORS configuration

### **Data Privacy**
- Sensitive data is handled securely
- No data persistence in Python services
- Encrypted communication

## 📝 **MONITORING & LOGGING**

### **Health Monitoring**
```bash
# Check service health
GET /api/python/health

# Get service status
GET /api/python/status
```

### **Logging**
- Comprehensive logging for all operations
- Error tracking and alerting
- Performance metrics
- Business metrics

## 🚀 **DEPLOYMENT**

### **Development**
```bash
# Start Python services
cd server/python_services
python start_python_services.py

# Start Node.js server
npm run dev
```

### **Production**
```bash
# Use PM2 for process management
pm2 start python_services.js
pm2 start node_server.js
```

### **Docker Deployment**
```dockerfile
# Python services
FROM python:3.9-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "integration/nodejs_bridge.py"]
```

## 🔄 **MAINTENANCE**

### **Regular Updates**
- Keep Python dependencies updated
- Retrain ML models regularly
- Monitor performance metrics
- Update documentation

### **Troubleshooting**
- Check service health: `GET /api/python/health`
- View logs for errors
- Clear cache if needed: `POST /api/python/cache/clear`
- Restart services if necessary

## 📚 **EXAMPLES**

### **Complete Analytics Workflow**
```javascript
// 1. Collect data
const data = {
  orders: await getOrders(),
  customers: await getCustomers(),
  deliveries: await getDeliveries()
};

// 2. Generate analytics
const analytics = await pythonServiceBridge.generateDailyReport(data);

// 3. Get insights
const insights = analytics.data.insights;

// 4. Apply recommendations
const recommendations = analytics.data.recommendations;
```

### **Real-time Fraud Detection**
```javascript
// Check order for fraud
const fraudCheck = await pythonServiceBridge.detectFakeOrders({
  order: orderData,
  customer: customerData,
  payment: paymentData
});

if (fraudCheck.data.fraud_score > 0.7) {
  // Flag for manual review
  await flagOrderForReview(orderData.id);
}
```

### **Personalized Recommendations**
```javascript
// Get product recommendations
const recommendations = await pythonServiceBridge.generateProductRecommendations({
  user_id: userId,
  user_preferences: userPreferences,
  product_catalog: products,
  user_history: orderHistory
});

// Display recommendations to user
displayRecommendations(recommendations.data.recommendations);
```

## 🆘 **SUPPORT**

### **Common Issues**
1. **Python services not starting**: Check Python version and dependencies
2. **Connection errors**: Verify service URLs and ports
3. **Timeout errors**: Increase timeout configuration
4. **Memory issues**: Monitor resource usage

### **Getting Help**
- Check logs for detailed error messages
- Verify service health endpoints
- Test individual services
- Review configuration settings

## 🎯 **NEXT STEPS**

1. **Integrate with Frontend**: Add Python service calls to React components
2. **Add Real-time Updates**: Implement WebSocket integration
3. **Enhance ML Models**: Improve accuracy with more data
4. **Add More Services**: Implement additional AI/ML capabilities
5. **Performance Tuning**: Optimize based on usage patterns

This integration provides a powerful foundation for AI/ML capabilities in your Zipzy application. The services are designed to be scalable, maintainable, and easy to use.
