#!/usr/bin/env python3
"""
Integration test script for Python services
This script tests all Python services and their integration with Node.js
"""

import asyncio
import aiohttp
import json
import time
import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PythonServiceTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url.rstrip('/')
        self.session = None
        self.test_results = {}
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make HTTP request to Python services"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url) as response:
                    result = await response.json()
                    return {"success": response.status == 200, "data": result, "status": response.status}
            elif method.upper() == "POST":
                async with self.session.post(url, json=data) as response:
                    result = await response.json()
                    return {"success": response.status == 200, "data": result, "status": response.status}
        except Exception as e:
            return {"success": False, "error": str(e), "status": 0}
    
    async def test_health_check(self) -> bool:
        """Test health check endpoint"""
        logger.info("Testing health check...")
        result = await self.make_request("GET", "/health")
        
        if result["success"]:
            logger.info("✅ Health check passed")
            self.test_results["health_check"] = {"status": "PASS", "data": result["data"]}
            return True
        else:
            logger.error(f"❌ Health check failed: {result.get('error', 'Unknown error')}")
            self.test_results["health_check"] = {"status": "FAIL", "error": result.get("error")}
            return False
    
    async def test_analytics_services(self) -> bool:
        """Test analytics services"""
        logger.info("Testing analytics services...")
        
        # Sample data for testing
        test_data = {
            "orders": [
                {
                    "id": "order_1",
                    "total_amount": 150.0,
                    "status": "delivered",
                    "created_at": datetime.now().isoformat(),
                    "customer_id": "customer_1"
                },
                {
                    "id": "order_2", 
                    "total_amount": 200.0,
                    "status": "pending",
                    "created_at": datetime.now().isoformat(),
                    "customer_id": "customer_2"
                }
            ],
            "customers": [
                {
                    "id": "customer_1",
                    "name": "John Doe",
                    "total_spent": 500.0,
                    "order_count": 5,
                    "created_at": (datetime.now() - timedelta(days=30)).isoformat()
                }
            ],
            "deliveries": [
                {
                    "id": "delivery_1",
                    "order_id": "order_1",
                    "status": "delivered",
                    "delivery_time": 25.0,
                    "distance": 5.2,
                    "rating": 4.5,
                    "created_at": datetime.now().isoformat()
                }
            ]
        }
        
        analytics_tests = [
            ("daily_report", "/api/analytics/daily-report"),
            ("customer_segments", "/api/analytics/customer-segments"),
            ("delivery_metrics", "/api/analytics/delivery-metrics"),
            ("revenue_trends", "/api/analytics/revenue-trends"),
            ("partner_performance", "/api/analytics/partner-performance")
        ]
        
        all_passed = True
        
        for test_name, endpoint in analytics_tests:
            logger.info(f"Testing {test_name}...")
            result = await self.make_request("POST", endpoint, test_data)
            
            if result["success"]:
                logger.info(f"✅ {test_name} passed")
                self.test_results[f"analytics_{test_name}"] = {"status": "PASS", "data": result["data"]}
            else:
                logger.error(f"❌ {test_name} failed: {result.get('error', 'Unknown error')}")
                self.test_results[f"analytics_{test_name}"] = {"status": "FAIL", "error": result.get("error")}
                all_passed = False
        
        return all_passed
    
    async def test_recommendation_services(self) -> bool:
        """Test recommendation services"""
        logger.info("Testing recommendation services...")
        
        # Sample data for testing
        test_data = {
            "user_id": "user_1",
            "user_preferences": {
                "preferred_categories": ["pizza", "burger"],
                "price_range": [50, 300],
                "dietary_restrictions": []
            },
            "product_catalog": [
                {
                    "id": "product_1",
                    "name": "Margherita Pizza",
                    "category": "pizza",
                    "price": 150.0,
                    "rating": 4.5
                },
                {
                    "id": "product_2",
                    "name": "Chicken Burger",
                    "category": "burger", 
                    "price": 120.0,
                    "rating": 4.2
                }
            ],
            "user_history": [
                {
                    "user_id": "user_1",
                    "product_id": "product_1",
                    "rating": 5,
                    "order_date": datetime.now().isoformat()
                }
            ]
        }
        
        recommendation_tests = [
            ("product_recommendations", "/api/recommendations/products"),
            ("delivery_recommendations", "/api/recommendations/delivery"),
            ("menu_recommendations", "/api/recommendations/menu"),
            ("promotional_recommendations", "/api/recommendations/promotional")
        ]
        
        all_passed = True
        
        for test_name, endpoint in recommendation_tests:
            logger.info(f"Testing {test_name}...")
            result = await self.make_request("POST", endpoint, test_data)
            
            if result["success"]:
                logger.info(f"✅ {test_name} passed")
                self.test_results[f"recommendation_{test_name}"] = {"status": "PASS", "data": result["data"]}
            else:
                logger.error(f"❌ {test_name} failed: {result.get('error', 'Unknown error')}")
                self.test_results[f"recommendation_{test_name}"] = {"status": "FAIL", "error": result.get("error")}
                all_passed = False
        
        return all_passed
    
    async def test_fraud_detection_services(self) -> bool:
        """Test fraud detection services"""
        logger.info("Testing fraud detection services...")
        
        # Sample data for testing
        test_data = {
            "order": {
                "id": "order_1",
                "total_amount": 150.0,
                "customer_age_days": 5,
                "payment_method": "upi",
                "items": [{"id": "item_1", "quantity": 2}],
                "delivery_distance": 3.5
            },
            "customer": {
                "id": "customer_1",
                "customer_age_days": 5,
                "order_count": 1,
                "rating": 0,
                "account_age_days": 5
            },
            "payment": {
                "amount": 150.0,
                "card_age_days": 0,
                "card_usage_frequency": 1
            }
        }
        
        fraud_tests = [
            ("fake_orders", "/api/fraud/orders"),
            ("payment_fraud", "/api/fraud/payments"),
            ("account_takeover", "/api/fraud/accounts"),
            ("delivery_fraud", "/api/fraud/delivery")
        ]
        
        all_passed = True
        
        for test_name, endpoint in fraud_tests:
            logger.info(f"Testing {test_name}...")
            result = await self.make_request("POST", endpoint, test_data)
            
            if result["success"]:
                logger.info(f"✅ {test_name} passed")
                self.test_results[f"fraud_{test_name}"] = {"status": "PASS", "data": result["data"]}
            else:
                logger.error(f"❌ {test_name} failed: {result.get('error', 'Unknown error')}")
                self.test_results[f"fraud_{test_name}"] = {"status": "FAIL", "error": result.get("error")}
                all_passed = False
        
        return all_passed
    
    async def test_demand_prediction_services(self) -> bool:
        """Test demand prediction services"""
        logger.info("Testing demand prediction services...")
        
        # Sample data for testing
        test_data = {
            "historical_orders": [
                {
                    "date": (datetime.now() - timedelta(days=1)).isoformat(),
                    "order_count": 25,
                    "total_amount": 5000.0
                },
                {
                    "date": (datetime.now() - timedelta(days=2)).isoformat(),
                    "order_count": 30,
                    "total_amount": 6000.0
                }
            ],
            "weather_data": {
                "temperature": 25.0,
                "humidity": 60.0,
                "condition": "sunny"
            },
            "events": []
        }
        
        demand_tests = [
            ("daily_forecast", "/api/demand/daily-forecast"),
            ("hourly_forecast", "/api/demand/hourly-forecast")
        ]
        
        all_passed = True
        
        for test_name, endpoint in demand_tests:
            logger.info(f"Testing {test_name}...")
            result = await self.make_request("POST", endpoint, test_data)
            
            if result["success"]:
                logger.info(f"✅ {test_name} passed")
                self.test_results[f"demand_{test_name}"] = {"status": "PASS", "data": result["data"]}
            else:
                logger.error(f"❌ {test_name} failed: {result.get('error', 'Unknown error')}")
                self.test_results[f"demand_{test_name}"] = {"status": "FAIL", "error": result.get("error")}
                all_passed = False
        
        return all_passed
    
    async def test_route_optimization_services(self) -> bool:
        """Test route optimization services"""
        logger.info("Testing route optimization services...")
        
        # Sample data for testing
        test_data = {
            "deliveries": [
                {
                    "id": "delivery_1",
                    "pickup_location": {"lat": 28.6139, "lng": 77.2090},
                    "delivery_location": {"lat": 28.6141, "lng": 77.2092},
                    "priority": "high",
                    "time_window": {"start": "10:00", "end": "12:00"}
                },
                {
                    "id": "delivery_2",
                    "pickup_location": {"lat": 28.6140, "lng": 77.2091},
                    "delivery_location": {"lat": 28.6142, "lng": 77.2093},
                    "priority": "medium",
                    "time_window": {"start": "11:00", "end": "13:00"}
                }
            ],
            "partners": [
                {
                    "id": "partner_1",
                    "location": {"lat": 28.6138, "lng": 77.2089},
                    "capacity": 5,
                    "rating": 4.5
                }
            ]
        }
        
        logger.info("Testing route optimization...")
        result = await self.make_request("POST", "/api/route/optimize", test_data)
        
        if result["success"]:
            logger.info("✅ Route optimization passed")
            self.test_results["route_optimization"] = {"status": "PASS", "data": result["data"]}
            return True
        else:
            logger.error(f"❌ Route optimization failed: {result.get('error', 'Unknown error')}")
            self.test_results["route_optimization"] = {"status": "FAIL", "error": result.get("error")}
            return False
    
    async def test_nlp_services(self) -> bool:
        """Test NLP services"""
        logger.info("Testing NLP services...")
        
        # Sample data for testing
        test_data = {
            "text": "The food was amazing! Great service and fast delivery. Highly recommended!",
            "type": "review"
        }
        
        nlp_tests = [
            ("sentiment_analysis", "/api/nlp/sentiment"),
            ("text_classification", "/api/nlp/classify")
        ]
        
        all_passed = True
        
        for test_name, endpoint in nlp_tests:
            logger.info(f"Testing {test_name}...")
            result = await self.make_request("POST", endpoint, test_data)
            
            if result["success"]:
                logger.info(f"✅ {test_name} passed")
                self.test_results[f"nlp_{test_name}"] = {"status": "PASS", "data": result["data"]}
            else:
                logger.error(f"❌ {test_name} failed: {result.get('error', 'Unknown error')}")
                self.test_results[f"nlp_{test_name}"] = {"status": "FAIL", "error": result.get("error")}
                all_passed = False
        
        return all_passed
    
    async def test_batch_processing(self) -> bool:
        """Test batch processing"""
        logger.info("Testing batch processing...")
        
        # Sample batch data
        batch_data = {
            "tasks": [
                {
                    "id": "task_1",
                    "type": "analytics",
                    "data": {
                        "orders": [{"id": "order_1", "total_amount": 100.0, "status": "delivered"}]
                    }
                },
                {
                    "id": "task_2",
                    "type": "recommendations",
                    "data": {
                        "user_id": "user_1",
                        "product_catalog": [{"id": "product_1", "name": "Pizza", "price": 150.0}]
                    }
                }
            ]
        }
        
        result = await self.make_request("POST", "/api/batch/process", batch_data)
        
        if result["success"]:
            logger.info("✅ Batch processing passed")
            self.test_results["batch_processing"] = {"status": "PASS", "data": result["data"]}
            return True
        else:
            logger.error(f"❌ Batch processing failed: {result.get('error', 'Unknown error')}")
            self.test_results["batch_processing"] = {"status": "FAIL", "error": result.get("error")}
            return False
    
    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all tests and return results"""
        logger.info("Starting comprehensive Python services integration test...")
        
        start_time = time.time()
        
        # Run all tests
        tests = [
            ("Health Check", self.test_health_check),
            ("Analytics Services", self.test_analytics_services),
            ("Recommendation Services", self.test_recommendation_services),
            ("Fraud Detection Services", self.test_fraud_detection_services),
            ("Demand Prediction Services", self.test_demand_prediction_services),
            ("Route Optimization Services", self.test_route_optimization_services),
            ("NLP Services", self.test_nlp_services),
            ("Batch Processing", self.test_batch_processing)
        ]
        
        test_results = {}
        total_tests = len(tests)
        passed_tests = 0
        
        for test_name, test_func in tests:
            logger.info(f"\n{'='*50}")
            logger.info(f"Running {test_name}...")
            logger.info(f"{'='*50}")
            
            try:
                result = await test_func()
                test_results[test_name] = result
                if result:
                    passed_tests += 1
            except Exception as e:
                logger.error(f"❌ {test_name} failed with exception: {e}")
                test_results[test_name] = False
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Generate summary
        summary = {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": (passed_tests / total_tests) * 100,
            "duration_seconds": duration,
            "test_results": self.test_results,
            "timestamp": datetime.now().isoformat()
        }
        
        # Print summary
        logger.info(f"\n{'='*60}")
        logger.info("TEST SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Total Tests: {total_tests}")
        logger.info(f"Passed: {passed_tests}")
        logger.info(f"Failed: {total_tests - passed_tests}")
        logger.info(f"Success Rate: {summary['success_rate']:.1f}%")
        logger.info(f"Duration: {duration:.2f} seconds")
        logger.info(f"{'='*60}")
        
        return summary

async def main():
    """Main test function"""
    async with PythonServiceTester() as tester:
        results = await tester.run_all_tests()
        
        # Save results to file
        with open("test_results.json", "w") as f:
            json.dump(results, f, indent=2)
        
        logger.info("Test results saved to test_results.json")
        
        # Exit with appropriate code
        if results["success_rate"] == 100:
            logger.info("🎉 All tests passed!")
            return 0
        else:
            logger.error("❌ Some tests failed!")
            return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
