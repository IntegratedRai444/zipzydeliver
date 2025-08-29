import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour
    
    async def generate_daily_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive daily analytics report"""
        try:
            date = data.get("date", datetime.now().date())
            
            # Generate all daily metrics
            report = {
                "date": date.isoformat(),
                "summary": await self.generate_daily_summary(data),
                "order_metrics": await self.calculate_order_metrics(data),
                "revenue_metrics": await self.calculate_revenue_metrics(data),
                "delivery_metrics": await self.calculate_delivery_metrics(data),
                "customer_metrics": await self.calculate_customer_metrics(data),
                "partner_metrics": await self.calculate_partner_metrics(data),
                "performance_indicators": await self.calculate_performance_indicators(data),
                "charts": await self.generate_daily_charts(data),
                "insights": await self.generate_daily_insights(data),
                "recommendations": await self.generate_daily_recommendations(data)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error in daily report generation: {e}")
            raise e
    
    async def analyze_customer_segments(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze and segment customers based on behavior"""
        try:
            customers = data.get("customers", [])
            
            if not customers:
                return {"segments": [], "analysis": {}, "insights": []}
            
            # Create customer dataframe
            df = pd.DataFrame(customers)
            
            # Calculate customer metrics
            df['total_orders'] = df['order_count'].fillna(0)
            df['avg_order_value'] = df['total_spent'] / df['total_orders'].replace(0, 1)
            df['days_since_last_order'] = (datetime.now() - pd.to_datetime(df['last_order_date'])).dt.days
            df['loyalty_score'] = df['loyalty_points'].fillna(0)
            
            # Segment customers using K-means clustering
            segments = await self.perform_customer_segmentation(df)
            
            # Analyze each segment
            segment_analysis = {}
            for segment in segments:
                segment_data = df[df['segment'] == segment['name']]
                segment_analysis[segment['name']] = {
                    "customer_count": len(segment_data),
                    "avg_order_value": segment_data['avg_order_value'].mean(),
                    "avg_orders": segment_data['total_orders'].mean(),
                    "loyalty_score": segment_data['loyalty_score'].mean(),
                    "churn_risk": segment_data['days_since_last_order'].mean(),
                    "top_products": self.get_top_products(segment_data),
                    "preferred_times": self.get_preferred_times(segment_data)
                }
            
            # Generate insights
            insights = await self.generate_customer_insights(segment_analysis)
            
            return {
                "segments": segments,
                "segment_analysis": segment_analysis,
                "insights": insights,
                "total_customers": len(customers),
                "segmentation_method": "kmeans_clustering"
            }
            
        except Exception as e:
            logger.error(f"Error in customer segmentation: {e}")
            raise e
    
    async def calculate_delivery_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive delivery performance metrics"""
        try:
            deliveries = data.get("deliveries", [])
            
            if not deliveries:
                return {"metrics": {}, "performance": {}, "efficiency": {}}
            
            df = pd.DataFrame(deliveries)
            
            # Basic delivery metrics
            metrics = {
                "total_deliveries": len(deliveries),
                "successful_deliveries": len(df[df['status'] == 'delivered']),
                "failed_deliveries": len(df[df['status'] == 'failed']),
                "cancelled_deliveries": len(df[df['status'] == 'cancelled']),
                "success_rate": len(df[df['status'] == 'delivered']) / len(deliveries) * 100
            }
            
            # Time-based metrics
            if 'delivery_time' in df.columns:
                metrics.update({
                    "avg_delivery_time": df['delivery_time'].mean(),
                    "min_delivery_time": df['delivery_time'].min(),
                    "max_delivery_time": df['delivery_time'].max(),
                    "on_time_deliveries": len(df[df['delivery_time'] <= df['expected_time']]),
                    "late_deliveries": len(df[df['delivery_time'] > df['expected_time']])
                })
            
            # Distance metrics
            if 'distance' in df.columns:
                metrics.update({
                    "total_distance": df['distance'].sum(),
                    "avg_distance": df['distance'].mean(),
                    "fuel_efficiency": df['distance'].sum() / len(df[df['fuel_consumed'] > 0])
                })
            
            # Performance analysis
            performance = await self.analyze_delivery_performance(df)
            
            # Efficiency metrics
            efficiency = await self.calculate_delivery_efficiency(df)
            
            return {
                "metrics": metrics,
                "performance": performance,
                "efficiency": efficiency,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in delivery metrics calculation: {e}")
            raise e
    
    async def analyze_revenue_trends(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze revenue trends and patterns"""
        try:
            orders = data.get("orders", [])
            time_period = data.get("time_period", "monthly")
            
            if not orders:
                return {"trends": {}, "patterns": {}, "forecast": {}}
            
            df = pd.DataFrame(orders)
            df['order_date'] = pd.to_datetime(df['created_at'])
            df['revenue'] = df['total_amount'].fillna(0)
            
            # Group by time period
            if time_period == "daily":
                df['period'] = df['order_date'].dt.date
            elif time_period == "weekly":
                df['period'] = df['order_date'].dt.isocalendar().week
            elif time_period == "monthly":
                df['period'] = df['order_date'].dt.to_period('M')
            else:
                df['period'] = df['order_date'].dt.to_period('M')
            
            # Calculate revenue trends
            revenue_trends = df.groupby('period')['revenue'].agg([
                'sum', 'mean', 'count'
            ]).reset_index()
            
            # Calculate growth rates
            revenue_trends['growth_rate'] = revenue_trends['sum'].pct_change() * 100
            revenue_trends['avg_order_value'] = revenue_trends['sum'] / revenue_trends['count']
            
            # Identify patterns
            patterns = await self.identify_revenue_patterns(revenue_trends)
            
            # Generate forecast
            forecast = await self.generate_revenue_forecast(revenue_trends)
            
            return {
                "trends": revenue_trends.to_dict('records'),
                "patterns": patterns,
                "forecast": forecast,
                "summary": {
                    "total_revenue": df['revenue'].sum(),
                    "avg_order_value": df['revenue'].mean(),
                    "total_orders": len(df),
                    "growth_rate": revenue_trends['growth_rate'].iloc[-1] if len(revenue_trends) > 1 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in revenue trend analysis: {e}")
            raise e
    
    async def generate_partner_performance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate delivery partner performance metrics"""
        try:
            partners = data.get("partners", [])
            deliveries = data.get("deliveries", [])
            
            if not partners or not deliveries:
                return {"performance": {}, "rankings": {}, "insights": []}
            
            # Create performance dataframe
            delivery_df = pd.DataFrame(deliveries)
            partner_df = pd.DataFrame(partners)
            
            # Calculate partner metrics
            partner_metrics = []
            for partner in partners:
                partner_deliveries = delivery_df[delivery_df['partner_id'] == partner['id']]
                
                if len(partner_deliveries) > 0:
                    metrics = {
                        "partner_id": partner['id'],
                        "partner_name": partner.get('name', 'Unknown'),
                        "total_deliveries": len(partner_deliveries),
                        "successful_deliveries": len(partner_deliveries[partner_deliveries['status'] == 'delivered']),
                        "success_rate": len(partner_deliveries[partner_deliveries['status'] == 'delivered']) / len(partner_deliveries) * 100,
                        "avg_delivery_time": partner_deliveries['delivery_time'].mean() if 'delivery_time' in partner_deliveries.columns else 0,
                        "total_distance": partner_deliveries['distance'].sum() if 'distance' in partner_deliveries.columns else 0,
                        "customer_rating": partner_deliveries['rating'].mean() if 'rating' in partner_deliveries.columns else 0,
                        "earnings": partner_deliveries['earnings'].sum() if 'earnings' in partner_deliveries.columns else 0
                    }
                    
                    # Calculate efficiency score
                    efficiency_factors = [
                        metrics['success_rate'] / 100,
                        min(1.0, metrics['customer_rating'] / 5),
                        min(1.0, 30 / max(1, metrics['avg_delivery_time']))
                    ]
                    metrics['efficiency_score'] = sum(efficiency_factors) / len(efficiency_factors)
                    
                    partner_metrics.append(metrics)
            
            # Sort by efficiency score
            partner_metrics.sort(key=lambda x: x['efficiency_score'], reverse=True)
            
            # Generate rankings
            rankings = {
                "top_performers": partner_metrics[:5],
                "needs_improvement": partner_metrics[-5:],
                "efficiency_rankings": partner_metrics
            }
            
            # Generate insights
            insights = await self.generate_partner_insights(partner_metrics)
            
            return {
                "performance": {p['partner_id']: p for p in partner_metrics},
                "rankings": rankings,
                "insights": insights,
                "summary": {
                    "total_partners": len(partners),
                    "active_partners": len([p for p in partner_metrics if p['total_deliveries'] > 0]),
                    "avg_efficiency": sum(p['efficiency_score'] for p in partner_metrics) / len(partner_metrics) if partner_metrics else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error in partner performance generation: {e}")
            raise e
    
    async def analyze_product_performance(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze product performance and popularity"""
        try:
            orders = data.get("orders", [])
            products = data.get("products", [])
            
            if not orders or not products:
                return {"performance": {}, "trends": {}, "insights": []}
            
            # Create product performance dataframe
            order_df = pd.DataFrame(orders)
            product_df = pd.DataFrame(products)
            
            # Extract order items
            order_items = []
            for order in orders:
                for item in order.get('items', []):
                    order_items.append({
                        'order_id': order['id'],
                        'product_id': item['product_id'],
                        'quantity': item['quantity'],
                        'price': item['price'],
                        'order_date': order['created_at']
                    })
            
            if not order_items:
                return {"performance": {}, "trends": {}, "insights": []}
            
            items_df = pd.DataFrame(order_items)
            items_df['order_date'] = pd.to_datetime(items_df['order_date'])
            items_df['revenue'] = items_df['quantity'] * items_df['price']
            
            # Calculate product metrics
            product_performance = []
            for product in products:
                product_orders = items_df[items_df['product_id'] == product['id']]
                
                if len(product_orders) > 0:
                    performance = {
                        "product_id": product['id'],
                        "product_name": product['name'],
                        "category": product.get('category', 'Unknown'),
                        "total_orders": len(product_orders),
                        "total_quantity": product_orders['quantity'].sum(),
                        "total_revenue": product_orders['revenue'].sum(),
                        "avg_rating": product.get('rating', 0),
                        "review_count": product.get('review_count', 0),
                        "popularity_score": len(product_orders) * product_orders['quantity'].mean()
                    }
                    
                    # Calculate trends
                    if len(product_orders) > 1:
                        product_orders['week'] = product_orders['order_date'].dt.isocalendar().week
                        weekly_trend = product_orders.groupby('week')['quantity'].sum()
                        performance['trend'] = 'increasing' if weekly_trend.iloc[-1] > weekly_trend.iloc[0] else 'decreasing'
                    else:
                        performance['trend'] = 'stable'
                    
                    product_performance.append(performance)
            
            # Sort by popularity
            product_performance.sort(key=lambda x: x['popularity_score'], reverse=True)
            
            # Generate insights
            insights = await self.generate_product_insights(product_performance)
            
            return {
                "performance": {p['product_id']: p for p in product_performance},
                "trends": {
                    "top_products": product_performance[:10],
                    "trending_up": [p for p in product_performance if p['trend'] == 'increasing'],
                    "trending_down": [p for p in product_performance if p['trend'] == 'decreasing']
                },
                "insights": insights,
                "summary": {
                    "total_products": len(products),
                    "active_products": len([p for p in product_performance if p['total_orders'] > 0]),
                    "total_revenue": sum(p['total_revenue'] for p in product_performance)
                }
            }
            
        except Exception as e:
            logger.error(f"Error in product performance analysis: {e}")
            raise e
    
    async def calculate_customer_lifetime_value(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate customer lifetime value (CLV)"""
        try:
            customers = data.get("customers", [])
            orders = data.get("orders", [])
            
            if not customers or not orders:
                return {"clv_data": {}, "segments": {}, "insights": []}
            
            # Create customer CLV dataframe
            customer_df = pd.DataFrame(customers)
            order_df = pd.DataFrame(orders)
            
            clv_data = []
            for customer in customers:
                customer_orders = order_df[order_df['customer_id'] == customer['id']]
                
                if len(customer_orders) > 0:
                    # Calculate CLV components
                    total_revenue = customer_orders['total_amount'].sum()
                    avg_order_value = customer_orders['total_amount'].mean()
                    order_frequency = len(customer_orders)
                    
                    # Calculate customer age (days since first order)
                    first_order = customer_orders['created_at'].min()
                    last_order = customer_orders['created_at'].max()
                    customer_age = (pd.to_datetime(last_order) - pd.to_datetime(first_order)).days
                    
                    # Calculate purchase frequency (orders per month)
                    months_active = max(1, customer_age / 30)
                    purchase_frequency = order_frequency / months_active
                    
                    # Calculate CLV
                    clv = total_revenue * (purchase_frequency / 12) * 12  # Annual projection
                    
                    clv_data.append({
                        "customer_id": customer['id'],
                        "customer_name": customer.get('name', 'Unknown'),
                        "total_revenue": total_revenue,
                        "avg_order_value": avg_order_value,
                        "order_frequency": order_frequency,
                        "customer_age_days": customer_age,
                        "purchase_frequency_monthly": purchase_frequency,
                        "clv": clv,
                        "clv_tier": self.categorize_clv(clv)
                    })
            
            # Sort by CLV
            clv_data.sort(key=lambda x: x['clv'], reverse=True)
            
            # Segment customers by CLV
            segments = {
                "high_value": [c for c in clv_data if c['clv_tier'] == 'high'],
                "medium_value": [c for c in clv_data if c['clv_tier'] == 'medium'],
                "low_value": [c for c in clv_data if c['clv_tier'] == 'low']
            }
            
            # Generate insights
            insights = await self.generate_clv_insights(clv_data, segments)
            
            return {
                "clv_data": {c['customer_id']: c for c in clv_data},
                "segments": segments,
                "insights": insights,
                "summary": {
                    "total_customers": len(customers),
                    "avg_clv": sum(c['clv'] for c in clv_data) / len(clv_data) if clv_data else 0,
                    "total_clv": sum(c['clv'] for c in clv_data),
                    "high_value_customers": len(segments['high_value']),
                    "medium_value_customers": len(segments['medium_value']),
                    "low_value_customers": len(segments['low_value'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error in CLV calculation: {e}")
            raise e
    
    async def generate_operational_insights(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate operational insights and recommendations"""
        try:
            # Collect all relevant data
            orders = data.get("orders", [])
            deliveries = data.get("deliveries", [])
            partners = data.get("partners", [])
            customers = data.get("customers", [])
            
            insights = []
            
            # Order processing insights
            if orders:
                order_insights = await self.analyze_order_operations(orders)
                insights.extend(order_insights)
            
            # Delivery operations insights
            if deliveries:
                delivery_insights = await self.analyze_delivery_operations(deliveries)
                insights.extend(delivery_insights)
            
            # Partner operations insights
            if partners:
                partner_insights = await self.analyze_partner_operations(partners)
                insights.extend(partner_insights)
            
            # Customer operations insights
            if customers:
                customer_insights = await self.analyze_customer_operations(customers)
                insights.extend(customer_insights)
            
            # Generate recommendations
            recommendations = await self.generate_operational_recommendations(insights)
            
            return {
                "insights": insights,
                "recommendations": recommendations,
                "priority_areas": self.identify_priority_areas(insights),
                "summary": {
                    "total_insights": len(insights),
                    "high_priority": len([i for i in insights if i.get('priority') == 'high']),
                    "medium_priority": len([i for i in insights if i.get('priority') == 'medium']),
                    "low_priority": len([i for i in insights if i.get('priority') == 'low'])
                }
            }
            
        except Exception as e:
            logger.error(f"Error in operational insights generation: {e}")
            raise e
    
    # Helper methods
    async def generate_daily_summary(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate daily summary metrics"""
        # Placeholder implementation
        return {
            "total_orders": 150,
            "total_revenue": 25000,
            "active_partners": 25,
            "customer_satisfaction": 4.5
        }
    
    async def calculate_order_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate order-related metrics"""
        # Placeholder implementation
        return {
            "order_count": 150,
            "avg_order_value": 167,
            "order_completion_rate": 0.95
        }
    
    async def calculate_revenue_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate revenue-related metrics"""
        # Placeholder implementation
        return {
            "total_revenue": 25000,
            "avg_daily_revenue": 25000,
            "revenue_growth": 0.15
        }
    
    async def calculate_customer_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate customer-related metrics"""
        # Placeholder implementation
        return {
            "active_customers": 120,
            "new_customers": 15,
            "customer_retention_rate": 0.85
        }
    
    async def calculate_partner_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate partner-related metrics"""
        # Placeholder implementation
        return {
            "active_partners": 25,
            "avg_deliveries_per_partner": 6,
            "partner_satisfaction": 4.3
        }
    
    async def calculate_performance_indicators(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate key performance indicators"""
        # Placeholder implementation
        return {
            "delivery_success_rate": 0.95,
            "avg_delivery_time": 28,
            "customer_satisfaction": 4.5
        }
    
    async def generate_daily_charts(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate daily charts and visualizations"""
        # Placeholder implementation
        return {
            "revenue_chart": "chart_data",
            "orders_chart": "chart_data",
            "delivery_chart": "chart_data"
        }
    
    async def generate_daily_insights(self, data: Dict[str, Any]) -> List[str]:
        """Generate daily insights"""
        # Placeholder implementation
        return [
            "Revenue increased by 15% compared to yesterday",
            "Delivery success rate improved to 95%",
            "Customer satisfaction remains high at 4.5/5"
        ]
    
    async def generate_daily_recommendations(self, data: Dict[str, Any]) -> List[str]:
        """Generate daily recommendations"""
        # Placeholder implementation
        return [
            "Consider increasing partner capacity during peak hours",
            "Focus on reducing delivery time for better customer satisfaction",
            "Monitor order volume trends for inventory planning"
        ]
    
    async def perform_customer_segmentation(self, df: pd.DataFrame) -> List[Dict]:
        """Perform customer segmentation using clustering"""
        # Placeholder implementation
        return [
            {"name": "High Value", "criteria": "High spending, frequent orders"},
            {"name": "Medium Value", "criteria": "Moderate spending, regular orders"},
            {"name": "Low Value", "criteria": "Low spending, occasional orders"}
        ]
    
    def get_top_products(self, segment_data: pd.DataFrame) -> List[str]:
        """Get top products for a customer segment"""
        # Placeholder implementation
        return ["Pizza", "Biryani", "Burger"]
    
    def get_preferred_times(self, segment_data: pd.DataFrame) -> List[int]:
        """Get preferred ordering times for a customer segment"""
        # Placeholder implementation
        return [12, 18, 20]
    
    async def generate_customer_insights(self, segment_analysis: Dict) -> List[str]:
        """Generate insights from customer segmentation"""
        # Placeholder implementation
        return [
            "High-value customers prefer premium products",
            "Medium-value customers order during lunch and dinner",
            "Low-value customers need engagement strategies"
        ]
    
    async def analyze_delivery_performance(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze delivery performance patterns"""
        # Placeholder implementation
        return {
            "peak_hours": [12, 18],
            "efficiency_score": 0.85,
            "improvement_areas": ["Reduce delivery time", "Improve route optimization"]
        }
    
    async def calculate_delivery_efficiency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate delivery efficiency metrics"""
        # Placeholder implementation
        return {
            "fuel_efficiency": 0.78,
            "route_optimization": 0.82,
            "time_efficiency": 0.88
        }
    
    async def identify_revenue_patterns(self, revenue_trends: pd.DataFrame) -> Dict[str, Any]:
        """Identify revenue patterns and seasonality"""
        # Placeholder implementation
        return {
            "weekly_pattern": "Higher revenue on weekends",
            "monthly_pattern": "Peak during exam periods",
            "seasonality": "Summer months show higher food orders"
        }
    
    async def generate_revenue_forecast(self, revenue_trends: pd.DataFrame) -> Dict[str, Any]:
        """Generate revenue forecast"""
        # Placeholder implementation
        return {
            "next_month": 28000,
            "next_quarter": 85000,
            "confidence": 0.85
        }
    
    async def generate_partner_insights(self, partner_metrics: List[Dict]) -> List[str]:
        """Generate insights from partner performance"""
        # Placeholder implementation
        return [
            "Top performers have higher customer ratings",
            "Efficiency correlates with delivery success rate",
            "Training needed for partners with low efficiency scores"
        ]
    
    async def generate_product_insights(self, product_performance: List[Dict]) -> List[str]:
        """Generate insights from product performance"""
        # Placeholder implementation
        return [
            "Premium products show higher margins",
            "Quick-service items have higher volume",
            "Seasonal products need better inventory management"
        ]
    
    async def generate_clv_insights(self, clv_data: List[Dict], segments: Dict) -> List[str]:
        """Generate insights from CLV analysis"""
        # Placeholder implementation
        return [
            "High-value customers contribute 60% of revenue",
            "Customer retention increases CLV significantly",
            "Targeted marketing needed for medium-value customers"
        ]
    
    async def analyze_order_operations(self, orders: List[Dict]) -> List[Dict]:
        """Analyze order processing operations"""
        # Placeholder implementation
        return [
            {"type": "order_processing", "priority": "medium", "insight": "Order processing time is optimal"}
        ]
    
    async def analyze_delivery_operations(self, deliveries: List[Dict]) -> List[Dict]:
        """Analyze delivery operations"""
        # Placeholder implementation
        return [
            {"type": "delivery_efficiency", "priority": "high", "insight": "Route optimization needed"}
        ]
    
    async def analyze_partner_operations(self, partners: List[Dict]) -> List[Dict]:
        """Analyze partner operations"""
        # Placeholder implementation
        return [
            {"type": "partner_management", "priority": "medium", "insight": "Partner satisfaction is good"}
        ]
    
    async def analyze_customer_operations(self, customers: List[Dict]) -> List[Dict]:
        """Analyze customer operations"""
        # Placeholder implementation
        return [
            {"type": "customer_service", "priority": "low", "insight": "Customer satisfaction is high"}
        ]
    
    async def generate_operational_recommendations(self, insights: List[Dict]) -> List[str]:
        """Generate operational recommendations"""
        # Placeholder implementation
        return [
            "Implement route optimization for delivery efficiency",
            "Enhance partner training programs",
            "Monitor customer satisfaction metrics closely"
        ]
    
    def identify_priority_areas(self, insights: List[Dict]) -> List[str]:
        """Identify high-priority operational areas"""
        # Placeholder implementation
        return ["delivery_efficiency", "partner_management"]
    
    def categorize_clv(self, clv: float) -> str:
        """Categorize customer by CLV value"""
        if clv > 1000:
            return "high"
        elif clv > 500:
            return "medium"
        else:
            return "low"
