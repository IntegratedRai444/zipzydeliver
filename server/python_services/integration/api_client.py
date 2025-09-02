"""
API Client for Python Services Integration
This module provides a client for communicating with Python services
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class PythonServiceClient:
    """Client for communicating with Python services"""
    
    def __init__(self, base_url: str = "http://localhost:8000", timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = None
        self.retry_attempts = 3
        self.retry_delay = 1
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def health_check(self) -> Dict[str, Any]:
        """Check health of Python services"""
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"status": "unhealthy", "error": f"HTTP {response.status}"}
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return {"status": "unhealthy", "error": str(e)}
    
    async def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.retry_attempts):
            try:
                if method.upper() == "GET":
                    async with self.session.get(url) as response:
                        result = await response.json()
                        if response.status == 200:
                            return result
                        else:
                            raise Exception(f"HTTP {response.status}: {result}")
                
                elif method.upper() == "POST":
                    async with self.session.post(url, json=data) as response:
                        result = await response.json()
                        if response.status == 200:
                            return result
                        else:
                            raise Exception(f"HTTP {response.status}: {result}")
                
                else:
                    raise Exception(f"Unsupported HTTP method: {method}")
                    
            except Exception as e:
                logger.warning(f"Request attempt {attempt + 1} failed: {e}")
                if attempt < self.retry_attempts - 1:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))  # Exponential backoff
                else:
                    raise e
        
        raise Exception("All retry attempts failed")
    
    # Analytics endpoints
    async def generate_daily_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate daily analytics report"""
        return await self._make_request("POST", "/api/analytics/daily-report", data)
    
    async def analyze_customer_segments(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer segments"""
        return await self._make_request("POST", "/api/analytics/customer-segments", data)
    
    async def calculate_delivery_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate delivery metrics"""
        return await self._make_request("POST", "/api/analytics/delivery-metrics", data)
    
    async def analyze_revenue_trends(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze revenue trends"""
        return await self._make_request("POST", "/api/analytics/revenue-trends", data)
    
    async def generate_partner_performance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate partner performance metrics"""
        return await self._make_request("POST", "/api/analytics/partner-performance", data)
    
    # Recommendation endpoints
    async def generate_product_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate product recommendations"""
        return await self._make_request("POST", "/api/recommendations/products", data)
    
    async def generate_delivery_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate delivery recommendations"""
        return await self._make_request("POST", "/api/recommendations/delivery", data)
    
    async def generate_menu_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate menu recommendations"""
        return await self._make_request("POST", "/api/recommendations/menu", data)
    
    async def generate_promotional_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate promotional recommendations"""
        return await self._make_request("POST", "/api/recommendations/promotional", data)
    
    # Fraud detection endpoints
    async def detect_fake_orders(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect fake orders"""
        return await self._make_request("POST", "/api/fraud/orders", data)
    
    async def detect_payment_fraud(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect payment fraud"""
        return await self._make_request("POST", "/api/fraud/payments", data)
    
    async def detect_account_takeover(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect account takeover"""
        return await self._make_request("POST", "/api/fraud/accounts", data)
    
    async def detect_delivery_fraud(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect delivery fraud"""
        return await self._make_request("POST", "/api/fraud/delivery", data)
    
    # Demand prediction endpoints
    async def predict_daily_demand(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict daily demand"""
        return await self._make_request("POST", "/api/demand/daily-forecast", data)
    
    async def predict_hourly_demand(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict hourly demand"""
        return await self._make_request("POST", "/api/demand/hourly-forecast", data)
    
    # Route optimization endpoints
    async def optimize_route(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize delivery route"""
        return await self._make_request("POST", "/api/route/optimize", data)
    
    # NLP endpoints
    async def analyze_sentiment(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sentiment"""
        return await self._make_request("POST", "/api/nlp/sentiment", data)
    
    async def classify_text(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Classify text"""
        return await self._make_request("POST", "/api/nlp/classify", data)
    
    # Batch processing
    async def batch_process(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process multiple tasks in batch"""
        data = {"tasks": tasks}
        return await self._make_request("POST", "/api/batch/process", data)

class PythonServiceManager:
    """Manager for Python services with caching and error handling"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.client = PythonServiceClient(base_url)
        self.cache = {}
        self.cache_ttl = 300  # 5 minutes
        self.is_healthy = False
        self.last_health_check = 0
        self.health_check_interval = 60  # 1 minute
    
    async def ensure_healthy(self) -> bool:
        """Ensure Python services are healthy"""
        current_time = time.time()
        
        if current_time - self.last_health_check > self.health_check_interval:
            async with self.client as client:
                health_result = await client.health_check()
                self.is_healthy = health_result.get("status") == "healthy"
                self.last_health_check = current_time
        
        return self.is_healthy
    
    async def get_cached_result(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached result if available and not expired"""
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if time.time() - cached_data["timestamp"] < self.cache_ttl:
                return cached_data["result"]
            else:
                del self.cache[cache_key]
        return None
    
    async def set_cached_result(self, cache_key: str, result: Dict[str, Any]):
        """Cache result with timestamp"""
        self.cache[cache_key] = {
            "result": result,
            "timestamp": time.time()
        }
    
    async def generate_daily_report(self, data: Dict[str, Any], use_cache: bool = True) -> Dict[str, Any]:
        """Generate daily report with caching"""
        cache_key = f"daily_report_{hash(json.dumps(data, sort_keys=True))}"
        
        if use_cache:
            cached_result = await self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
        
        if not await self.ensure_healthy():
            return {"error": "Python services are not healthy"}
        
        try:
            async with self.client as client:
                result = await client.generate_daily_report(data)
                if use_cache:
                    await self.set_cached_result(cache_key, result)
                return result
        except Exception as e:
            logger.error(f"Error generating daily report: {e}")
            return {"error": str(e)}
    
    async def generate_product_recommendations(self, data: Dict[str, Any], use_cache: bool = True) -> Dict[str, Any]:
        """Generate product recommendations with caching"""
        cache_key = f"product_recommendations_{data.get('user_id', 'anonymous')}"
        
        if use_cache:
            cached_result = await self.get_cached_result(cache_key)
            if cached_result:
                return cached_result
        
        if not await self.ensure_healthy():
            return {"error": "Python services are not healthy"}
        
        try:
            async with self.client as client:
                result = await client.generate_product_recommendations(data)
                if use_cache:
                    await self.set_cached_result(cache_key, result)
                return result
        except Exception as e:
            logger.error(f"Error generating product recommendations: {e}")
            return {"error": str(e)}
    
    async def detect_fraud(self, data: Dict[str, Any], fraud_type: str = "orders") -> Dict[str, Any]:
        """Detect fraud with error handling"""
        if not await self.ensure_healthy():
            return {"error": "Python services are not healthy"}
        
        try:
            async with self.client as client:
                if fraud_type == "orders":
                    return await client.detect_fake_orders(data)
                elif fraud_type == "payments":
                    return await client.detect_payment_fraud(data)
                elif fraud_type == "accounts":
                    return await client.detect_account_takeover(data)
                elif fraud_type == "delivery":
                    return await client.detect_delivery_fraud(data)
                else:
                    return {"error": f"Unknown fraud type: {fraud_type}"}
        except Exception as e:
            logger.error(f"Error detecting fraud: {e}")
            return {"error": str(e)}
    
    async def batch_process_analytics(self, data_sets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process multiple analytics tasks in batch"""
        if not await self.ensure_healthy():
            return {"error": "Python services are not healthy"}
        
        try:
            tasks = []
            for i, data in enumerate(data_sets):
                tasks.append({
                    "id": f"analytics_{i}",
                    "type": "analytics",
                    "data": data
                })
            
            async with self.client as client:
                return await client.batch_process(tasks)
        except Exception as e:
            logger.error(f"Error in batch analytics processing: {e}")
            return {"error": str(e)}
    
    def clear_cache(self):
        """Clear all cached results"""
        self.cache.clear()
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        current_time = time.time()
        active_entries = 0
        expired_entries = 0
        
        for cache_key, cached_data in self.cache.items():
            if current_time - cached_data["timestamp"] < self.cache_ttl:
                active_entries += 1
            else:
                expired_entries += 1
        
        return {
            "total_entries": len(self.cache),
            "active_entries": active_entries,
            "expired_entries": expired_entries,
            "cache_ttl": self.cache_ttl,
            "is_healthy": self.is_healthy
        }
