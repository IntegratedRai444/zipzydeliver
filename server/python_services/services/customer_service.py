import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

class CustomerService:
    def __init__(self):
        self.models = {
            'churn_prediction': RandomForestClassifier(n_estimators=100, random_state=42),
            'lifetime_value': RandomForestClassifier(n_estimators=100, random_state=42)
        }
        self.is_trained = False
        
    async def predict_customer_churn(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict customer churn probability"""
        try:
            customers = data.get("customers", [])
            historical_data = data.get("historical_data", [])
            
            if not customers:
                return {"churn_predictions": [], "timestamp": datetime.now().isoformat()}
            
            churn_predictions = []
            for customer in customers:
                # Calculate churn probability
                churn_probability = await self.calculate_churn_probability(customer, historical_data)
                
                # Generate churn insights
                churn_insights = await self.generate_churn_insights(customer, churn_probability)
                
                # Generate retention strategies
                retention_strategies = await self.generate_retention_strategies(customer, churn_probability)
                
                churn_predictions.append({
                    "customer_id": customer["id"],
                    "customer_name": customer.get("name", "Unknown"),
                    "churn_probability": churn_probability,
                    "churn_insights": churn_insights,
                    "retention_strategies": retention_strategies,
                    "confidence": 0.85
                })
            
            return {
                "churn_predictions": churn_predictions,
                "total_customers": len(customers),
                "high_risk_customers": len([c for c in churn_predictions if c["churn_probability"] > 0.7]),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in customer churn prediction: {e}")
            raise e
    
    async def calculate_customer_lifetime_value(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate customer lifetime value (CLV)"""
        try:
            customers = data.get("customers", [])
            order_history = data.get("order_history", [])
            
            if not customers:
                return {"clv_analysis": [], "timestamp": datetime.now().isoformat()}
            
            clv_analysis = []
            for customer in customers:
                # Calculate CLV
                clv = await self.calculate_clv(customer, order_history)
                
                # Generate CLV insights
                clv_insights = await self.generate_clv_insights(customer, clv)
                
                # Generate growth strategies
                growth_strategies = await self.generate_growth_strategies(customer, clv)
                
                clv_analysis.append({
                    "customer_id": customer["id"],
                    "customer_name": customer.get("name", "Unknown"),
                    "clv": clv,
                    "clv_insights": clv_insights,
                    "growth_strategies": growth_strategies
                })
            
            return {
                "clv_analysis": clv_analysis,
                "total_customers": len(customers),
                "average_clv": np.mean([c["clv"]["total_clv"] for c in clv_analysis]) if clv_analysis else 0,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in CLV calculation: {e}")
            raise e
    
    async def segment_customers(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Segment customers based on behavior and characteristics"""
        try:
            customers = data.get("customers", [])
            behavioral_data = data.get("behavioral_data", [])
            
            if not customers:
                return {"customer_segments": [], "timestamp": datetime.now().isoformat()}
            
            customer_segments = []
            for customer in customers:
                # Analyze customer behavior
                behavior_analysis = await self.analyze_customer_behavior(customer, behavioral_data)
                
                # Assign segment
                segment = await self.assign_customer_segment(customer, behavior_analysis)
                
                # Generate segment insights
                segment_insights = await self.generate_segment_insights(customer, segment)
                
                customer_segments.append({
                    "customer_id": customer["id"],
                    "customer_name": customer.get("name", "Unknown"),
                    "segment": segment,
                    "behavior_analysis": behavior_analysis,
                    "segment_insights": segment_insights
                })
            
            return {
                "customer_segments": customer_segments,
                "total_customers": len(customers),
                "segment_distribution": await self.calculate_segment_distribution(customer_segments),
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in customer segmentation: {e}")
            raise e
    
    async def analyze_customer_satisfaction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze customer satisfaction and feedback"""
        try:
            customers = data.get("customers", [])
            feedback_data = data.get("feedback_data", [])
            
            if not customers:
                return {"satisfaction_analysis": [], "timestamp": datetime.now().isoformat()}
            
            satisfaction_analysis = []
            for customer in customers:
                # Analyze customer feedback
                feedback_analysis = await self.analyze_customer_feedback(customer, feedback_data)
                
                # Calculate satisfaction score
                satisfaction_score = await self.calculate_satisfaction_score(customer, feedback_analysis)
                
                # Generate improvement recommendations
                improvement_recommendations = await self.generate_improvement_recommendations(customer, satisfaction_score)
                
                satisfaction_analysis.append({
                    "customer_id": customer["id"],
                    "customer_name": customer.get("name", "Unknown"),
                    "satisfaction_score": satisfaction_score,
                    "feedback_analysis": feedback_analysis,
                    "improvement_recommendations": improvement_recommendations
                })
            
            return {
                "satisfaction_analysis": satisfaction_analysis,
                "total_customers": len(customers),
                "average_satisfaction": np.mean([s["satisfaction_score"] for s in satisfaction_analysis]) if satisfaction_analysis else 0,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in customer satisfaction analysis: {e}")
            raise e
    
    async def generate_customer_reports(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive customer reports"""
        try:
            customers = data.get("customers", [])
            customer_data = data.get("customer_data", {})
            
            summary = await self.generate_customer_summary(customers, customer_data)
            recommendations = await self.generate_customer_recommendations(summary)
            
            return {
                "summary": summary,
                "recommendations": recommendations,
                "total_customers": len(customers),
                "generated_at": datetime.now().isoformat(),
                "confidence": 0.88
            }
            
        except Exception as e:
            logger.error(f"Error generating customer reports: {e}")
            raise e
    
    # Helper methods
    async def calculate_churn_probability(self, customer: Dict[str, Any], history: List[Dict]) -> float:
        """Calculate churn probability"""
        try:
            # Mock churn calculation
            last_order_days = customer.get("days_since_last_order", 30)
            order_frequency = customer.get("order_frequency", 1)
            
            # Simple churn model
            if last_order_days > 60:
                return 0.8
            elif last_order_days > 30:
                return 0.5
            elif order_frequency < 0.5:
                return 0.3
            else:
                return 0.1
        except Exception as e:
            logger.error(f"Error calculating churn probability: {e}")
            return 0.5
    
    async def generate_churn_insights(self, customer: Dict[str, Any], churn_probability: float) -> List[str]:
        """Generate churn insights"""
        try:
            insights = []
            if churn_probability > 0.7:
                insights.append("High churn risk - immediate action required")
            elif churn_probability > 0.5:
                insights.append("Medium churn risk - proactive engagement needed")
            else:
                insights.append("Low churn risk - maintain current engagement")
            
            return insights
        except Exception as e:
            logger.error(f"Error generating churn insights: {e}")
            return []
    
    async def generate_retention_strategies(self, customer: Dict[str, Any], churn_probability: float) -> List[str]:
        """Generate retention strategies"""
        try:
            if churn_probability > 0.7:
                return ["Personalized outreach", "Special offers", "Feedback collection"]
            elif churn_probability > 0.5:
                return ["Increased engagement", "Loyalty programs", "Regular communication"]
            else:
                return ["Maintain service quality", "Regular check-ins", "Upselling opportunities"]
        except Exception as e:
            logger.error(f"Error generating retention strategies: {e}")
            return []
    
    async def calculate_clv(self, customer: Dict[str, Any], order_history: List[Dict]) -> Dict[str, Any]:
        """Calculate customer lifetime value"""
        try:
            customer_orders = [o for o in order_history if o.get("customer_id") == customer["id"]]
            
            total_revenue = sum(o.get("total_amount", 0) for o in customer_orders)
            avg_order_value = total_revenue / max(1, len(customer_orders))
            order_frequency = len(customer_orders) / max(1, customer.get("customer_age_days", 365)) * 365
            
            # Simple CLV calculation
            clv = total_revenue * (order_frequency / 365) * customer.get("expected_lifespan_years", 5)
            
            return {
                "total_clv": clv,
                "current_revenue": total_revenue,
                "avg_order_value": avg_order_value,
                "order_frequency": order_frequency
            }
        except Exception as e:
            logger.error(f"Error calculating CLV: {e}")
            return {"total_clv": 0, "current_revenue": 0, "avg_order_value": 0, "order_frequency": 0}
    
    async def generate_clv_insights(self, customer: Dict[str, Any], clv: Dict[str, Any]) -> List[str]:
        """Generate CLV insights"""
        try:
            insights = []
            if clv["total_clv"] > 1000:
                insights.append("High-value customer - prioritize retention")
            elif clv["total_clv"] > 500:
                insights.append("Medium-value customer - growth opportunities")
            else:
                insights.append("Low-value customer - engagement focus")
            
            return insights
        except Exception as e:
            logger.error(f"Error generating CLV insights: {e}")
            return []
    
    async def generate_growth_strategies(self, customer: Dict[str, Any], clv: Dict[str, Any]) -> List[str]:
        """Generate growth strategies"""
        try:
            if clv["total_clv"] > 1000:
                return ["Premium services", "Exclusive offers", "VIP treatment"]
            elif clv["total_clv"] > 500:
                return ["Cross-selling", "Loyalty programs", "Personalized recommendations"]
            else:
                return ["Basic engagement", "Service improvement", "Regular communication"]
        except Exception as e:
            logger.error(f"Error generating growth strategies: {e}")
            return []
    
    async def analyze_customer_behavior(self, customer: Dict[str, Any], behavioral_data: List[Dict]) -> Dict[str, Any]:
        """Analyze customer behavior"""
        try:
            customer_behavior = [b for b in behavioral_data if b.get("customer_id") == customer["id"]]
            
            return {
                "order_pattern": "regular" if len(customer_behavior) > 5 else "occasional",
                "preferred_categories": ["food", "beverages"],
                "response_time": "fast" if customer.get("avg_response_time", 24) < 12 else "slow"
            }
        except Exception as e:
            logger.error(f"Error analyzing customer behavior: {e}")
            return {}
    
    async def assign_customer_segment(self, customer: Dict[str, Any], behavior: Dict[str, Any]) -> str:
        """Assign customer segment"""
        try:
            if behavior.get("order_pattern") == "regular" and behavior.get("response_time") == "fast":
                return "loyal_engaged"
            elif behavior.get("order_pattern") == "regular":
                return "loyal_passive"
            elif behavior.get("response_time") == "fast":
                return "responsive_occasional"
            else:
                return "passive_occasional"
        except Exception as e:
            logger.error(f"Error assigning customer segment: {e}")
            return "unknown"
    
    async def generate_segment_insights(self, customer: Dict[str, Any], segment: str) -> List[str]:
        """Generate segment insights"""
        try:
            if segment == "loyal_engaged":
                return ["High-value segment", "Focus on retention", "Premium services"]
            elif segment == "loyal_passive":
                return ["Stable segment", "Increase engagement", "Communication focus"]
            elif segment == "responsive_occasional":
                return ["Growth potential", "Increase frequency", "Targeted offers"]
            else:
                return ["Development focus", "Basic engagement", "Service improvement"]
        except Exception as e:
            logger.error(f"Error generating segment insights: {e}")
            return []
    
    async def calculate_segment_distribution(self, customer_segments: List[Dict]) -> Dict[str, int]:
        """Calculate segment distribution"""
        try:
            distribution = {}
            for segment_data in customer_segments:
                segment = segment_data["segment"]
                distribution[segment] = distribution.get(segment, 0) + 1
            
            return distribution
        except Exception as e:
            logger.error(f"Error calculating segment distribution: {e}")
            return {}
    
    async def analyze_customer_feedback(self, customer: Dict[str, Any], feedback_data: List[Dict]) -> Dict[str, Any]:
        """Analyze customer feedback"""
        try:
            customer_feedback = [f for f in feedback_data if f.get("customer_id") == customer["id"]]
            
            return {
                "feedback_count": len(customer_feedback),
                "avg_rating": np.mean([f.get("rating", 5) for f in customer_feedback]) if customer_feedback else 5,
                "common_issues": ["delivery_time", "food_quality"]
            }
        except Exception as e:
            logger.error(f"Error analyzing customer feedback: {e}")
            return {}
    
    async def calculate_satisfaction_score(self, customer: Dict[str, Any], feedback: Dict[str, Any]) -> float:
        """Calculate satisfaction score"""
        try:
            base_score = feedback.get("avg_rating", 5) / 5.0
            feedback_weight = min(feedback.get("feedback_count", 0) / 10.0, 1.0)
            
            return base_score * 0.7 + feedback_weight * 0.3
        except Exception as e:
            logger.error(f"Error calculating satisfaction score: {e}")
            return 0.5
    
    async def generate_improvement_recommendations(self, customer: Dict[str, Any], satisfaction: float) -> List[str]:
        """Generate improvement recommendations"""
        try:
            if satisfaction < 0.6:
                return ["Immediate service review", "Customer outreach", "Process improvement"]
            elif satisfaction < 0.8:
                return ["Service enhancement", "Feedback collection", "Quality improvement"]
            else:
                return ["Maintain standards", "Regular check-ins", "Upselling opportunities"]
        except Exception as e:
            logger.error(f"Error generating improvement recommendations: {e}")
            return []
    
    async def generate_customer_summary(self, customers: List[Dict], customer_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate customer summary"""
        try:
            return {
                "total_customers": len(customers),
                "active_customers": len([c for c in customers if c.get("is_active", True)]),
                "new_customers": len([c for c in customers if c.get("customer_age_days", 0) < 30])
            }
        except Exception as e:
            logger.error(f"Error generating customer summary: {e}")
            return {}
    
    async def generate_customer_recommendations(self, summary: Dict[str, Any]) -> List[str]:
        """Generate customer recommendations"""
        try:
            return [
                "Implement customer segmentation",
                "Develop retention strategies",
                "Enhance customer experience"
            ]
        except Exception as e:
            logger.error(f"Error generating customer recommendations: {e}")
            return []
