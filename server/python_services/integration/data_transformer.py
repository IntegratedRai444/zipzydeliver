"""
Data Transformer for Python Services Integration
This module handles data transformation between Node.js and Python services
"""

import json
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class DataTransformer:
    """Handles data transformation between Node.js and Python services"""
    
    def __init__(self):
        self.date_format = "%Y-%m-%dT%H:%M:%S.%fZ"
        self.timezone = "UTC"
    
    def transform_order_data(self, orders: List[Dict]) -> Dict[str, Any]:
        """Transform order data for Python services"""
        try:
            if not orders:
                return {"orders": [], "summary": {}}
            
            # Convert to DataFrame for easier processing
            df = pd.DataFrame(orders)
            
            # Transform date fields
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'])
                df['order_date'] = df['created_at'].dt.date
                df['order_hour'] = df['created_at'].dt.hour
                df['order_day_of_week'] = df['created_at'].dt.dayofweek
            
            # Transform amount fields
            if 'total_amount' in df.columns:
                df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce').fillna(0)
            
            # Transform status fields
            if 'status' in df.columns:
                df['status'] = df['status'].astype(str)
            
            # Calculate summary statistics
            summary = {
                "total_orders": len(df),
                "total_revenue": df['total_amount'].sum() if 'total_amount' in df.columns else 0,
                "avg_order_value": df['total_amount'].mean() if 'total_amount' in df.columns else 0,
                "status_distribution": df['status'].value_counts().to_dict() if 'status' in df.columns else {},
                "date_range": {
                    "start": df['created_at'].min().isoformat() if 'created_at' in df.columns else None,
                    "end": df['created_at'].max().isoformat() if 'created_at' in df.columns else None
                }
            }
            
            return {
                "orders": df.to_dict('records'),
                "summary": summary,
                "transformed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error transforming order data: {e}")
            return {"orders": [], "summary": {}, "error": str(e)}
    
    def transform_customer_data(self, customers: List[Dict]) -> Dict[str, Any]:
        """Transform customer data for Python services"""
        try:
            if not customers:
                return {"customers": [], "summary": {}}
            
            df = pd.DataFrame(customers)
            
            # Transform date fields
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'])
                df['customer_age_days'] = (datetime.now() - df['created_at']).dt.days
            
            # Transform numeric fields
            numeric_fields = ['total_spent', 'order_count', 'loyalty_points']
            for field in numeric_fields:
                if field in df.columns:
                    df[field] = pd.to_numeric(df[field], errors='coerce').fillna(0)
            
            # Calculate summary statistics
            summary = {
                "total_customers": len(df),
                "avg_customer_age": df['customer_age_days'].mean() if 'customer_age_days' in df.columns else 0,
                "total_revenue": df['total_spent'].sum() if 'total_spent' in df.columns else 0,
                "avg_order_count": df['order_count'].mean() if 'order_count' in df.columns else 0,
                "avg_loyalty_points": df['loyalty_points'].mean() if 'loyalty_points' in df.columns else 0
            }
            
            return {
                "customers": df.to_dict('records'),
                "summary": summary,
                "transformed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error transforming customer data: {e}")
            return {"customers": [], "summary": {}, "error": str(e)}
    
    def transform_delivery_data(self, deliveries: List[Dict]) -> Dict[str, Any]:
        """Transform delivery data for Python services"""
        try:
            if not deliveries:
                return {"deliveries": [], "summary": {}}
            
            df = pd.DataFrame(deliveries)
            
            # Transform date fields
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'])
            if 'delivered_at' in df.columns:
                df['delivered_at'] = pd.to_datetime(df['delivered_at'])
                df['delivery_time'] = (df['delivered_at'] - df['created_at']).dt.total_seconds() / 60  # minutes
            
            # Transform numeric fields
            numeric_fields = ['distance', 'rating', 'earnings']
            for field in numeric_fields:
                if field in df.columns:
                    df[field] = pd.to_numeric(df[field], errors='coerce').fillna(0)
            
            # Calculate summary statistics
            summary = {
                "total_deliveries": len(df),
                "successful_deliveries": len(df[df['status'] == 'delivered']) if 'status' in df.columns else 0,
                "avg_delivery_time": df['delivery_time'].mean() if 'delivery_time' in df.columns else 0,
                "avg_distance": df['distance'].mean() if 'distance' in df.columns else 0,
                "avg_rating": df['rating'].mean() if 'rating' in df.columns else 0,
                "total_earnings": df['earnings'].sum() if 'earnings' in df.columns else 0
            }
            
            return {
                "deliveries": df.to_dict('records'),
                "summary": summary,
                "transformed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error transforming delivery data: {e}")
            return {"deliveries": [], "summary": {}, "error": str(e)}
    
    def transform_product_data(self, products: List[Dict]) -> Dict[str, Any]:
        """Transform product data for Python services"""
        try:
            if not products:
                return {"products": [], "summary": {}}
            
            df = pd.DataFrame(products)
            
            # Transform numeric fields
            numeric_fields = ['price', 'rating', 'review_count', 'stock']
            for field in numeric_fields:
                if field in df.columns:
                    df[field] = pd.to_numeric(df[field], errors='coerce').fillna(0)
            
            # Transform category fields
            if 'category' in df.columns:
                df['category'] = df['category'].astype(str)
            
            # Calculate summary statistics
            summary = {
                "total_products": len(df),
                "avg_price": df['price'].mean() if 'price' in df.columns else 0,
                "avg_rating": df['rating'].mean() if 'rating' in df.columns else 0,
                "total_stock": df['stock'].sum() if 'stock' in df.columns else 0,
                "category_distribution": df['category'].value_counts().to_dict() if 'category' in df.columns else {}
            }
            
            return {
                "products": df.to_dict('records'),
                "summary": summary,
                "transformed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error transforming product data: {e}")
            return {"products": [], "summary": {}, "error": str(e)}
    
    def transform_partner_data(self, partners: List[Dict]) -> Dict[str, Any]:
        """Transform partner data for Python services"""
        try:
            if not partners:
                return {"partners": [], "summary": {}}
            
            df = pd.DataFrame(partners)
            
            # Transform numeric fields
            numeric_fields = ['rating', 'total_deliveries', 'earnings', 'experience_years']
            for field in numeric_fields:
                if field in df.columns:
                    df[field] = pd.to_numeric(df[field], errors='coerce').fillna(0)
            
            # Transform status fields
            if 'status' in df.columns:
                df['status'] = df['status'].astype(str)
            
            # Calculate summary statistics
            summary = {
                "total_partners": len(df),
                "active_partners": len(df[df['status'] == 'active']) if 'status' in df.columns else 0,
                "avg_rating": df['rating'].mean() if 'rating' in df.columns else 0,
                "avg_deliveries": df['total_deliveries'].mean() if 'total_deliveries' in df.columns else 0,
                "total_earnings": df['earnings'].sum() if 'earnings' in df.columns else 0,
                "avg_experience": df['experience_years'].mean() if 'experience_years' in df.columns else 0
            }
            
            return {
                "partners": df.to_dict('records'),
                "summary": summary,
                "transformed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error transforming partner data: {e}")
            return {"partners": [], "summary": {}, "error": str(e)}
    
    def transform_payment_data(self, payments: List[Dict]) -> Dict[str, Any]:
        """Transform payment data for Python services"""
        try:
            if not payments:
                return {"payments": [], "summary": {}}
            
            df = pd.DataFrame(payments)
            
            # Transform date fields
            if 'created_at' in df.columns:
                df['created_at'] = pd.to_datetime(df['created_at'])
                df['payment_date'] = df['created_at'].dt.date
                df['payment_hour'] = df['created_at'].dt.hour
            
            # Transform numeric fields
            numeric_fields = ['amount', 'fee']
            for field in numeric_fields:
                if field in df.columns:
                    df[field] = pd.to_numeric(df[field], errors='coerce').fillna(0)
            
            # Transform status fields
            if 'status' in df.columns:
                df['status'] = df['status'].astype(str)
            
            # Calculate summary statistics
            summary = {
                "total_payments": len(df),
                "total_amount": df['amount'].sum() if 'amount' in df.columns else 0,
                "avg_amount": df['amount'].mean() if 'amount' in df.columns else 0,
                "status_distribution": df['status'].value_counts().to_dict() if 'status' in df.columns else {},
                "method_distribution": df['method'].value_counts().to_dict() if 'method' in df.columns else {}
            }
            
            return {
                "payments": df.to_dict('records'),
                "summary": summary,
                "transformed_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error transforming payment data: {e}")
            return {"payments": [], "summary": {}, "error": str(e)}
    
    def transform_fraud_detection_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data for fraud detection services"""
        try:
            transformed_data = {}
            
            # Extract order features
            if 'order' in data:
                order = data['order']
                transformed_data.update({
                    "order_amount": float(order.get('total_amount', 0)),
                    "order_time_hour": datetime.now().hour,
                    "is_new_customer": 1 if order.get('customer_age_days', 0) < 30 else 0,
                    "payment_method_risk": self.calculate_payment_method_risk(order.get('payment_method', '')),
                    "order_complexity": len(order.get('items', [])),
                    "delivery_distance": order.get('delivery_distance', 0)
                })
            
            # Extract customer features
            if 'customer' in data:
                customer = data['customer']
                transformed_data.update({
                    "customer_age_days": customer.get('customer_age_days', 0),
                    "customer_order_count": customer.get('order_count', 0),
                    "customer_rating": customer.get('rating', 0),
                    "account_age_days": customer.get('account_age_days', 0)
                })
            
            # Extract payment features
            if 'payment' in data:
                payment = data['payment']
                transformed_data.update({
                    "payment_amount": float(payment.get('amount', 0)),
                    "transaction_time_hour": datetime.now().hour,
                    "card_age_days": payment.get('card_age_days', 0),
                    "card_usage_frequency": payment.get('card_usage_frequency', 0)
                })
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming fraud detection data: {e}")
            return {}
    
    def transform_recommendation_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data for recommendation services"""
        try:
            transformed_data = {}
            
            # Extract user data
            if 'user' in data:
                user = data['user']
                transformed_data.update({
                    "user_id": user.get('id', ''),
                    "user_preferences": {
                        "preferred_categories": user.get('preferred_categories', []),
                        "price_range": user.get('price_range', [0, 1000]),
                        "dietary_restrictions": user.get('dietary_restrictions', [])
                    }
                })
            
            # Extract product catalog
            if 'products' in data:
                transformed_data['product_catalog'] = data['products']
            
            # Extract user history
            if 'user_history' in data:
                transformed_data['user_history'] = data['user_history']
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming recommendation data: {e}")
            return {}
    
    def calculate_payment_method_risk(self, payment_method: str) -> float:
        """Calculate risk score for payment method"""
        risk_scores = {
            'cash': 0.1,
            'upi': 0.2,
            'card': 0.3,
            'wallet': 0.4,
            'crypto': 0.8
        }
        return risk_scores.get(payment_method.lower(), 0.5)
    
    def transform_analytics_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform data for analytics services"""
        try:
            transformed_data = {}
            
            # Transform different data types
            if 'orders' in data:
                transformed_data['orders'] = self.transform_order_data(data['orders'])['orders']
            
            if 'customers' in data:
                transformed_data['customers'] = self.transform_customer_data(data['customers'])['customers']
            
            if 'deliveries' in data:
                transformed_data['deliveries'] = self.transform_delivery_data(data['deliveries'])['deliveries']
            
            if 'products' in data:
                transformed_data['products'] = self.transform_product_data(data['products'])['products']
            
            if 'partners' in data:
                transformed_data['partners'] = self.transform_partner_data(data['partners'])['partners']
            
            if 'payments' in data:
                transformed_data['payments'] = self.transform_payment_data(data['payments'])['payments']
            
            # Add metadata
            transformed_data['metadata'] = {
                "transformed_at": datetime.now().isoformat(),
                "data_sources": list(data.keys()),
                "total_records": sum(len(v) if isinstance(v, list) else 1 for v in data.values())
            }
            
            return transformed_data
            
        except Exception as e:
            logger.error(f"Error transforming analytics data: {e}")
            return {}
    
    def reverse_transform_results(self, results: Dict[str, Any], service_type: str) -> Dict[str, Any]:
        """Reverse transform Python service results for Node.js"""
        try:
            if service_type == "analytics":
                return self.reverse_transform_analytics_results(results)
            elif service_type == "recommendations":
                return self.reverse_transform_recommendation_results(results)
            elif service_type == "fraud_detection":
                return self.reverse_transform_fraud_results(results)
            else:
                return results
                
        except Exception as e:
            logger.error(f"Error reverse transforming results: {e}")
            return {"error": str(e)}
    
    def reverse_transform_analytics_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Reverse transform analytics results"""
        try:
            # Convert numpy types to native Python types
            def convert_numpy_types(obj):
                if isinstance(obj, np.integer):
                    return int(obj)
                elif isinstance(obj, np.floating):
                    return float(obj)
                elif isinstance(obj, np.ndarray):
                    return obj.tolist()
                elif isinstance(obj, dict):
                    return {k: convert_numpy_types(v) for k, v in obj.items()}
                elif isinstance(obj, list):
                    return [convert_numpy_types(item) for item in obj]
                else:
                    return obj
            
            return convert_numpy_types(results)
            
        except Exception as e:
            logger.error(f"Error reverse transforming analytics results: {e}")
            return results
    
    def reverse_transform_recommendation_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Reverse transform recommendation results"""
        try:
            # Ensure all scores are floats
            if 'recommendations' in results:
                for rec in results['recommendations']:
                    if 'similarity_score' in rec:
                        rec['similarity_score'] = float(rec['similarity_score'])
                    if 'combined_score' in rec:
                        rec['combined_score'] = float(rec['combined_score'])
            
            return results
            
        except Exception as e:
            logger.error(f"Error reverse transforming recommendation results: {e}")
            return results
    
    def reverse_transform_fraud_results(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Reverse transform fraud detection results"""
        try:
            # Ensure fraud scores are floats
            if 'fraud_score' in results:
                results['fraud_score'] = float(results['fraud_score'])
            
            if 'risk_score' in results:
                results['risk_score'] = float(results['risk_score'])
            
            return results
            
        except Exception as e:
            logger.error(f"Error reverse transforming fraud results: {e}")
            return results
