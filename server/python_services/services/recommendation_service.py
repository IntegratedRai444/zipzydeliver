import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics.pairwise import cosine_similarity
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self):
        self.models = {
            'collaborative_filtering': RandomForestRegressor(n_estimators=100, random_state=42),
            'content_based': RandomForestRegressor(n_estimators=100, random_state=42)
        }
        self.is_trained = False
        
    async def generate_product_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate personalized product recommendations"""
        try:
            user_id = data.get("user_id")
            user_preferences = data.get("user_preferences", {})
            product_catalog = data.get("product_catalog", [])
            user_history = data.get("user_history", [])
            
            if not user_id or not product_catalog:
                return {"recommendations": [], "timestamp": datetime.now().isoformat()}
            
            # Generate different types of recommendations
            collaborative_recommendations = await self.generate_collaborative_recommendations(user_id, product_catalog, user_history)
            content_based_recommendations = await self.generate_content_based_recommendations(user_preferences, product_catalog)
            popular_recommendations = await self.generate_popular_recommendations(product_catalog, user_history)
            
            # Combine and rank recommendations
            combined_recommendations = await self.combine_recommendations(
                collaborative_recommendations,
                content_based_recommendations,
                popular_recommendations,
                user_preferences
            )
            
            return {
                "user_id": user_id,
                "recommendations": combined_recommendations,
                "recommendation_types": {
                    "collaborative": len(collaborative_recommendations),
                    "content_based": len(content_based_recommendations),
                    "popular": len(popular_recommendations)
                },
                "total_recommendations": len(combined_recommendations),
                "confidence": 0.87,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating product recommendations: {e}")
            raise e
    
    async def generate_delivery_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate delivery optimization recommendations"""
        try:
            delivery_data = data.get("delivery_data", {})
            partner_data = data.get("partner_data", [])
            route_data = data.get("route_data", [])
            
            if not delivery_data:
                return {"delivery_recommendations": [], "timestamp": datetime.now().isoformat()}
            
            # Generate delivery recommendations
            route_recommendations = await self.generate_route_recommendations(delivery_data, route_data)
            partner_recommendations = await self.generate_partner_recommendations(delivery_data, partner_data)
            timing_recommendations = await self.generate_timing_recommendations(delivery_data)
            
            # Combine recommendations
            combined_delivery_recommendations = route_recommendations + partner_recommendations + timing_recommendations
            
            return {
                "delivery_recommendations": combined_delivery_recommendations,
                "recommendation_categories": {
                    "route": len(route_recommendations),
                    "partner": len(partner_recommendations),
                    "timing": len(timing_recommendations)
                },
                "total_recommendations": len(combined_delivery_recommendations),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating delivery recommendations: {e}")
            raise e
    
    async def generate_menu_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate menu optimization recommendations"""
        try:
            menu_data = data.get("menu_data", [])
            sales_data = data.get("sales_data", [])
            customer_preferences = data.get("customer_preferences", {})
            
            if not menu_data:
                return {"menu_recommendations": [], "timestamp": datetime.now().isoformat()}
            
            # Generate menu recommendations
            item_recommendations = await self.generate_menu_item_recommendations(menu_data, sales_data)
            pricing_recommendations = await self.generate_menu_pricing_recommendations(menu_data, sales_data)
            combination_recommendations = await self.generate_menu_combination_recommendations(menu_data, customer_preferences)
            
            # Combine recommendations
            combined_menu_recommendations = item_recommendations + pricing_recommendations + combination_recommendations
            
            return {
                "menu_recommendations": combined_menu_recommendations,
                "recommendation_categories": {
                    "items": len(item_recommendations),
                    "pricing": len(pricing_recommendations),
                    "combinations": len(combination_recommendations)
                },
                "total_recommendations": len(combined_menu_recommendations),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating menu recommendations: {e}")
            raise e
    
    async def generate_promotional_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate promotional strategy recommendations"""
        try:
            customer_data = data.get("customer_data", [])
            sales_data = data.get("sales_data", [])
            promotional_history = data.get("promotional_history", [])
            
            if not customer_data:
                return {"promotional_recommendations": [], "timestamp": datetime.now().isoformat()}
            
            # Generate promotional recommendations
            customer_targeting = await self.generate_customer_targeting_recommendations(customer_data, sales_data)
            offer_recommendations = await self.generate_offer_recommendations(customer_data, promotional_history)
            timing_recommendations = await self.generate_promotional_timing_recommendations(sales_data, promotional_history)
            
            # Combine recommendations
            combined_promotional_recommendations = customer_targeting + offer_recommendations + timing_recommendations
            
            return {
                "promotional_recommendations": combined_promotional_recommendations,
                "recommendation_categories": {
                    "targeting": len(customer_targeting),
                    "offers": len(offer_recommendations),
                    "timing": len(timing_recommendations)
                },
                "total_recommendations": len(combined_promotional_recommendations),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating promotional recommendations: {e}")
            raise e
    
    async def generate_operational_recommendations(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate operational efficiency recommendations"""
        try:
            operational_data = data.get("operational_data", {})
            performance_metrics = data.get("performance_metrics", {})
            resource_data = data.get("resource_data", {})
            
            if not operational_data:
                return {"operational_recommendations": [], "timestamp": datetime.now().isoformat()}
            
            # Generate operational recommendations
            efficiency_recommendations = await self.generate_efficiency_recommendations(operational_data, performance_metrics)
            resource_recommendations = await self.generate_resource_recommendations(operational_data, resource_data)
            process_recommendations = await self.generate_process_recommendations(operational_data, performance_metrics)
            
            # Combine recommendations
            combined_operational_recommendations = efficiency_recommendations + resource_recommendations + process_recommendations
            
            return {
                "operational_recommendations": combined_operational_recommendations,
                "recommendation_categories": {
                    "efficiency": len(efficiency_recommendations),
                    "resources": len(resource_recommendations),
                    "processes": len(process_recommendations)
                },
                "total_recommendations": len(combined_operational_recommendations),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating operational recommendations: {e}")
            raise e
    
    async def generate_recommendation_reports(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive recommendation reports"""
        try:
            recommendation_data = data.get("recommendation_data", {})
            performance_data = data.get("performance_data", {})
            
            summary = await self.generate_recommendation_summary(recommendation_data, performance_data)
            insights = await self.generate_recommendation_insights(recommendation_data, performance_data)
            
            return {
                "summary": summary,
                "insights": insights,
                "generated_at": datetime.now().isoformat(),
                "confidence": 0.89
            }
            
        except Exception as e:
            logger.error(f"Error generating recommendation reports: {e}")
            raise e
    
    # Helper methods for different recommendation types
    async def generate_collaborative_recommendations(self, user_id: str, products: List[Dict], history: List[Dict]) -> List[Dict]:
        """Generate collaborative filtering recommendations"""
        try:
            # Mock collaborative filtering
            user_history = [h for h in history if h.get("user_id") == user_id]
            user_products = [h.get("product_id") for h in user_history]
            
            # Find similar users and their preferences
            similar_products = []
            for product in products:
                if product["id"] not in user_products:
                    # Calculate similarity score
                    similarity_score = await self.calculate_product_similarity(product, user_history)
                    if similarity_score > 0.5:
                        similar_products.append({
                            "product_id": product["id"],
                            "product_name": product.get("name", "Unknown"),
                            "similarity_score": similarity_score,
                            "recommendation_reason": "Similar users liked this"
                        })
            
            # Sort by similarity score
            similar_products.sort(key=lambda x: x["similarity_score"], reverse=True)
            return similar_products[:10]  # Return top 10
            
        except Exception as e:
            logger.error(f"Error generating collaborative recommendations: {e}")
            return []
    
    async def generate_content_based_recommendations(self, preferences: Dict[str, Any], products: List[Dict]) -> List[Dict]:
        """Generate content-based recommendations"""
        try:
            content_recommendations = []
            user_categories = preferences.get("preferred_categories", [])
            user_price_range = preferences.get("price_range", [0, 100])
            
            for product in products:
                # Calculate content similarity
                category_match = 1.0 if product.get("category") in user_categories else 0.0
                price_match = 1.0 if user_price_range[0] <= product.get("price", 0) <= user_price_range[1] else 0.0
                
                # Combined similarity score
                similarity_score = (category_match * 0.6) + (price_match * 0.4)
                
                if similarity_score > 0.3:
                    content_recommendations.append({
                        "product_id": product["id"],
                        "product_name": product.get("name", "Unknown"),
                        "similarity_score": similarity_score,
                        "recommendation_reason": "Matches your preferences"
                    })
            
            # Sort by similarity score
            content_recommendations.sort(key=lambda x: x["similarity_score"], reverse=True)
            return content_recommendations[:10]
            
        except Exception as e:
            logger.error(f"Error generating content-based recommendations: {e}")
            return []
    
    async def generate_popular_recommendations(self, products: List[Dict], history: List[Dict]) -> List[Dict]:
        """Generate popular item recommendations"""
        try:
            # Calculate popularity scores
            popularity_scores = {}
            for product in products:
                product_history = [h for h in history if h.get("product_id") == product["id"]]
                popularity_scores[product["id"]] = len(product_history)
            
            # Get top popular products
            popular_products = []
            for product in products:
                popularity = popularity_scores.get(product["id"], 0)
                if popularity > 0:
                    popular_products.append({
                        "product_id": product["id"],
                        "product_name": product.get("name", "Unknown"),
                        "popularity_score": popularity,
                        "recommendation_reason": "Popular among customers"
                    })
            
            # Sort by popularity
            popular_products.sort(key=lambda x: x["popularity_score"], reverse=True)
            return popular_products[:10]
            
        except Exception as e:
            logger.error(f"Error generating popular recommendations: {e}")
            return []
    
    async def combine_recommendations(self, collaborative: List[Dict], content_based: List[Dict], popular: List[Dict], preferences: Dict[str, Any]) -> List[Dict]:
        """Combine and rank different recommendation types"""
        try:
            all_recommendations = {}
            
            # Add collaborative recommendations
            for rec in collaborative:
                product_id = rec["product_id"]
                if product_id not in all_recommendations:
                    all_recommendations[product_id] = {
                        "product_id": product_id,
                        "product_name": rec["product_name"],
                        "collaborative_score": rec["similarity_score"],
                        "content_score": 0.0,
                        "popularity_score": 0.0,
                        "combined_score": 0.0,
                        "recommendation_reasons": [rec["recommendation_reason"]]
                    }
            
            # Add content-based recommendations
            for rec in content_based:
                product_id = rec["product_id"]
                if product_id in all_recommendations:
                    all_recommendations[product_id]["content_score"] = rec["similarity_score"]
                    all_recommendations[product_id]["recommendation_reasons"].append(rec["recommendation_reason"])
                else:
                    all_recommendations[product_id] = {
                        "product_id": product_id,
                        "product_name": rec["product_name"],
                        "collaborative_score": 0.0,
                        "content_score": rec["similarity_score"],
                        "popularity_score": 0.0,
                        "combined_score": 0.0,
                        "recommendation_reasons": [rec["recommendation_reason"]]
                    }
            
            # Add popular recommendations
            for rec in popular:
                product_id = rec["product_id"]
                if product_id in all_recommendations:
                    all_recommendations[product_id]["popularity_score"] = rec["popularity_score"] / 100.0  # Normalize
                    all_recommendations[product_id]["recommendation_reasons"].append(rec["recommendation_reason"])
                else:
                    all_recommendations[product_id] = {
                        "product_id": product_id,
                        "product_name": rec["product_name"],
                        "collaborative_score": 0.0,
                        "content_score": 0.0,
                        "popularity_score": rec["popularity_score"] / 100.0,
                        "combined_score": 0.0,
                        "recommendation_reasons": [rec["recommendation_reason"]]
                    }
            
            # Calculate combined scores
            for product_id, rec in all_recommendations.items():
                # Weighted combination
                rec["combined_score"] = (
                    rec["collaborative_score"] * 0.4 +
                    rec["content_score"] * 0.4 +
                    rec["popularity_score"] * 0.2
                )
            
            # Convert to list and sort
            combined_list = list(all_recommendations.values())
            combined_list.sort(key=lambda x: x["combined_score"], reverse=True)
            
            return combined_list[:20]  # Return top 20
            
        except Exception as e:
            logger.error(f"Error combining recommendations: {e}")
            return []
    
    async def calculate_product_similarity(self, product: Dict[str, Any], user_history: List[Dict]) -> float:
        """Calculate product similarity score"""
        try:
            # Mock similarity calculation
            if not user_history:
                return 0.0
            
            # Simple similarity based on category and price
            user_categories = [h.get("category") for h in user_history if h.get("category")]
            user_avg_price = np.mean([h.get("price", 0) for h in user_history if h.get("price", 0) > 0])
            
            category_match = 1.0 if product.get("category") in user_categories else 0.0
            price_similarity = 1.0 - min(abs(product.get("price", 0) - user_avg_price) / max(user_avg_price, 1), 1.0)
            
            return (category_match * 0.7) + (price_similarity * 0.3)
            
        except Exception as e:
            logger.error(f"Error calculating product similarity: {e}")
            return 0.0
    
    # Additional helper methods for other recommendation types
    async def generate_route_recommendations(self, delivery_data: Dict[str, Any], route_data: List[Dict]) -> List[Dict]:
        """Generate route optimization recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "route_optimization",
                "recommendation": "Optimize delivery route for efficiency",
                "priority": "high",
                "expected_impact": "15% time reduction"
            }
        ]
    
    async def generate_partner_recommendations(self, delivery_data: Dict[str, Any], partner_data: List[Dict]) -> List[Dict]:
        """Generate partner assignment recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "partner_assignment",
                "recommendation": "Assign orders based on proximity",
                "priority": "medium",
                "expected_impact": "10% efficiency improvement"
            }
        ]
    
    async def generate_timing_recommendations(self, delivery_data: Dict[str, Any]) -> List[Dict]:
        """Generate delivery timing recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "delivery_timing",
                "recommendation": "Schedule deliveries during off-peak hours",
                "priority": "low",
                "expected_impact": "5% cost reduction"
            }
        ]
    
    async def generate_menu_item_recommendations(self, menu_data: List[Dict], sales_data: List[Dict]) -> List[Dict]:
        """Generate menu item recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "menu_item",
                "recommendation": "Add popular trending items",
                "priority": "medium",
                "expected_impact": "8% sales increase"
            }
        ]
    
    async def generate_menu_pricing_recommendations(self, menu_data: List[Dict], sales_data: List[Dict]) -> List[Dict]:
        """Generate menu pricing recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "menu_pricing",
                "recommendation": "Implement dynamic pricing for peak hours",
                "priority": "high",
                "expected_impact": "12% revenue increase"
            }
        ]
    
    async def generate_menu_combination_recommendations(self, menu_data: List[Dict], preferences: Dict[str, Any]) -> List[Dict]:
        """Generate menu combination recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "menu_combination",
                "recommendation": "Create meal bundles for families",
                "priority": "medium",
                "expected_impact": "6% order value increase"
            }
        ]
    
    async def generate_customer_targeting_recommendations(self, customer_data: List[Dict], sales_data: List[Dict]) -> List[Dict]:
        """Generate customer targeting recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "customer_targeting",
                "recommendation": "Target high-value customers with premium offers",
                "priority": "high",
                "expected_impact": "20% customer retention"
            }
        ]
    
    async def generate_offer_recommendations(self, customer_data: List[Dict], promotional_history: List[Dict]) -> List[Dict]:
        """Generate promotional offer recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "promotional_offer",
                "recommendation": "First-time customer discount",
                "priority": "medium",
                "expected_impact": "15% new customer acquisition"
            }
        ]
    
    async def generate_promotional_timing_recommendations(self, sales_data: List[Dict], promotional_history: List[Dict]) -> List[Dict]:
        """Generate promotional timing recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "promotional_timing",
                "recommendation": "Launch promotions during slow periods",
                "priority": "low",
                "expected_impact": "8% sales boost"
            }
        ]
    
    async def generate_efficiency_recommendations(self, operational_data: Dict[str, Any], performance_metrics: Dict[str, Any]) -> List[Dict]:
        """Generate efficiency recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "efficiency",
                "recommendation": "Automate order processing",
                "priority": "high",
                "expected_impact": "25% time savings"
            }
        ]
    
    async def generate_resource_recommendations(self, operational_data: Dict[str, Any], resource_data: Dict[str, Any]) -> List[Dict]:
        """Generate resource optimization recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "resource_optimization",
                "recommendation": "Optimize staff scheduling",
                "priority": "medium",
                "expected_impact": "12% cost reduction"
            }
        ]
    
    async def generate_process_recommendations(self, operational_data: Dict[str, Any], performance_metrics: Dict[str, Any]) -> List[Dict]:
        """Generate process improvement recommendations"""
        # Placeholder implementation
        return [
            {
                "type": "process_improvement",
                "recommendation": "Streamline delivery workflow",
                "priority": "high",
                "expected_impact": "18% efficiency improvement"
            }
        ]
    
    async def generate_recommendation_summary(self, recommendation_data: Dict[str, Any], performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate recommendation summary"""
        # Placeholder implementation
        return {
            "total_recommendations": 45,
            "high_priority": 12,
            "medium_priority": 20,
            "low_priority": 13
        }
    
    async def generate_recommendation_insights(self, recommendation_data: Dict[str, Any], performance_data: Dict[str, Any]) -> List[str]:
        """Generate recommendation insights"""
        # Placeholder implementation
        return [
            "Route optimization shows highest impact potential",
            "Customer targeting recommendations drive retention",
            "Menu optimization increases order value"
        ]
