"""
Node.js Bridge for Python Services Integration
This module provides a bridge between Node.js and Python services
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from datetime import datetime

# Import all Python services
from services.analytics_service import AnalyticsService
from services.recommendation_service import RecommendationService
from services.fraud_detection import FraudDetectionService
from services.demand_prediction import DemandPredictionService
from services.route_optimization import RouteOptimizationService
from services.nlp_service import NLPService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Zipzy Python Services API",
    description="AI/ML Services for Zipzy Delivery Application",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
analytics_service = AnalyticsService()
recommendation_service = RecommendationService()
fraud_detection_service = FraudDetectionService()
demand_prediction_service = DemandPredictionService()
route_optimization_service = RouteOptimizationService()
nlp_service = NLPService()

# Pydantic models for request/response
class AnalyticsRequest(BaseModel):
    data: Dict[str, Any]
    report_type: str = "daily"

class RecommendationRequest(BaseModel):
    data: Dict[str, Any]
    recommendation_type: str = "products"

class FraudDetectionRequest(BaseModel):
    data: Dict[str, Any]
    detection_type: str = "orders"

class DemandPredictionRequest(BaseModel):
    data: Dict[str, Any]
    prediction_type: str = "daily"

class RouteOptimizationRequest(BaseModel):
    data: Dict[str, Any]
    optimization_type: str = "multi_stop"

class NLPRequest(BaseModel):
    data: Dict[str, Any]
    nlp_type: str = "sentiment"

class HealthResponse(BaseModel):
    status: str
    timestamp: str
    services: Dict[str, str]

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        services={
            "analytics": "active",
            "recommendations": "active",
            "fraud_detection": "active",
            "demand_prediction": "active",
            "route_optimization": "active",
            "nlp": "active"
        }
    )

# Analytics endpoints
@app.post("/api/analytics/daily-report")
async def generate_daily_report(request: AnalyticsRequest):
    """Generate daily analytics report"""
    try:
        result = await analytics_service.generate_daily_report(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in daily report generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/customer-segments")
async def analyze_customer_segments(request: AnalyticsRequest):
    """Analyze customer segments"""
    try:
        result = await analytics_service.analyze_customer_segments(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in customer segmentation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/delivery-metrics")
async def calculate_delivery_metrics(request: AnalyticsRequest):
    """Calculate delivery metrics"""
    try:
        result = await analytics_service.calculate_delivery_metrics(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in delivery metrics calculation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/revenue-trends")
async def analyze_revenue_trends(request: AnalyticsRequest):
    """Analyze revenue trends"""
    try:
        result = await analytics_service.analyze_revenue_trends(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in revenue trend analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/partner-performance")
async def generate_partner_performance(request: AnalyticsRequest):
    """Generate partner performance metrics"""
    try:
        result = await analytics_service.generate_partner_performance(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in partner performance generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Recommendation endpoints
@app.post("/api/recommendations/products")
async def generate_product_recommendations(request: RecommendationRequest):
    """Generate product recommendations"""
    try:
        result = await recommendation_service.generate_product_recommendations(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in product recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommendations/delivery")
async def generate_delivery_recommendations(request: RecommendationRequest):
    """Generate delivery recommendations"""
    try:
        result = await recommendation_service.generate_delivery_recommendations(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in delivery recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommendations/menu")
async def generate_menu_recommendations(request: RecommendationRequest):
    """Generate menu recommendations"""
    try:
        result = await recommendation_service.generate_menu_recommendations(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in menu recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/recommendations/promotional")
async def generate_promotional_recommendations(request: RecommendationRequest):
    """Generate promotional recommendations"""
    try:
        result = await recommendation_service.generate_promotional_recommendations(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in promotional recommendations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Fraud detection endpoints
@app.post("/api/fraud/orders")
async def detect_fake_orders(request: FraudDetectionRequest):
    """Detect fake orders"""
    try:
        result = await fraud_detection_service.detect_fake_orders(request.data)
        return {"success": True, "fraud_score": result}
    except Exception as e:
        logger.error(f"Error in fake order detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fraud/payments")
async def detect_payment_fraud(request: FraudDetectionRequest):
    """Detect payment fraud"""
    try:
        result = await fraud_detection_service.detect_payment_fraud(request.data)
        return {"success": True, "fraud_score": result}
    except Exception as e:
        logger.error(f"Error in payment fraud detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fraud/accounts")
async def detect_account_takeover(request: FraudDetectionRequest):
    """Detect account takeover"""
    try:
        result = await fraud_detection_service.detect_account_takeover(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in account takeover detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fraud/delivery")
async def detect_delivery_fraud(request: FraudDetectionRequest):
    """Detect delivery fraud"""
    try:
        result = await fraud_detection_service.detect_delivery_fraud(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in delivery fraud detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Demand prediction endpoints
@app.post("/api/demand/daily-forecast")
async def predict_daily_demand(request: DemandPredictionRequest):
    """Predict daily demand"""
    try:
        result = await demand_prediction_service.predict_daily_demand(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in daily demand prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/demand/hourly-forecast")
async def predict_hourly_demand(request: DemandPredictionRequest):
    """Predict hourly demand"""
    try:
        result = await demand_prediction_service.predict_hourly_demand(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in hourly demand prediction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Route optimization endpoints
@app.post("/api/route/optimize")
async def optimize_route(request: RouteOptimizationRequest):
    """Optimize delivery route"""
    try:
        result = await route_optimization_service.optimize_route(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in route optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# NLP endpoints
@app.post("/api/nlp/sentiment")
async def analyze_sentiment(request: NLPRequest):
    """Analyze sentiment"""
    try:
        result = await nlp_service.analyze_sentiment(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/nlp/classify")
async def classify_text(request: NLPRequest):
    """Classify text"""
    try:
        result = await nlp_service.classify_text(request.data)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Error in text classification: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Batch processing endpoint
@app.post("/api/batch/process")
async def batch_process(background_tasks: BackgroundTasks, request: Dict[str, Any]):
    """Process multiple requests in batch"""
    try:
        results = {}
        tasks = request.get("tasks", [])
        
        for task in tasks:
            task_type = task.get("type")
            task_data = task.get("data")
            
            if task_type == "analytics":
                result = await analytics_service.generate_daily_report(task_data)
            elif task_type == "recommendations":
                result = await recommendation_service.generate_product_recommendations(task_data)
            elif task_type == "fraud":
                result = await fraud_detection_service.detect_fake_orders(task_data)
            else:
                result = {"error": f"Unknown task type: {task_type}"}
            
            results[task.get("id", "unknown")] = result
        
        return {"success": True, "results": results}
    except Exception as e:
        logger.error(f"Error in batch processing: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "nodejs_bridge:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
