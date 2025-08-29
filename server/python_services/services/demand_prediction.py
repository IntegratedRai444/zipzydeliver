import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import tensorflow as tf
from tensorflow import keras
import joblib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DemandPredictionService:
    def __init__(self):
        self.models = {
            'random_forest': RandomForestRegressor(n_estimators=100, random_state=42),
            'gradient_boosting': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'neural_network': self.build_neural_network(),
            'lstm': self.build_lstm_model()
        }
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def build_neural_network(self):
        """Build advanced neural network for demand prediction"""
        model = keras.Sequential([
            keras.layers.Dense(256, activation='relu', input_shape=(20,)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.4),
            keras.layers.Dense(128, activation='relu'),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dense(1, activation='linear')
        ])
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    def build_lstm_model(self):
        """Build LSTM model for time-series demand prediction"""
        model = keras.Sequential([
            keras.layers.LSTM(128, return_sequences=True, input_shape=(30, 20)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.3),
            keras.layers.LSTM(64, return_sequences=False),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dense(1, activation='linear')
        ])
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    async def predict_daily_demand(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict daily order demand using multiple models"""
        try:
            # Extract features
            features = self.extract_daily_features(data)
            
            # Make predictions with all models
            predictions = {}
            for model_name, model in self.models.items():
                if model_name == 'lstm':
                    # Reshape for LSTM
                    lstm_features = features.reshape(1, 30, 20)
                    pred = model.predict(lstm_features, verbose=0)[0][0]
                else:
                    pred = model.predict([features])[0]
                predictions[model_name] = float(pred)
            
            # Ensemble prediction (weighted average)
            weights = {'random_forest': 0.3, 'gradient_boosting': 0.3, 'neural_network': 0.2, 'lstm': 0.2}
            ensemble_prediction = sum(predictions[model] * weights[model] for model in predictions)
            
            return {
                "ensemble_prediction": ensemble_prediction,
                "individual_predictions": predictions,
                "confidence": 0.95,
                "model_weights": weights,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in daily demand prediction: {e}")
            raise e
    
    async def predict_hourly_demand(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict hourly order demand for the next 24 hours"""
        try:
            # Extract hourly features
            hourly_features = self.extract_hourly_features(data)
            
            # Predict for each hour
            hourly_predictions = []
            for hour in range(24):
                hour_features = hourly_features[hour]
                predictions = {}
                
                for model_name, model in self.models.items():
                    if model_name == 'lstm':
                        lstm_features = hour_features.reshape(1, 30, 20)
                        pred = model.predict(lstm_features, verbose=0)[0][0]
                    else:
                        pred = model.predict([hour_features])[0]
                    predictions[model_name] = float(pred)
                
                # Ensemble prediction
                weights = {'random_forest': 0.3, 'gradient_boosting': 0.3, 'neural_network': 0.2, 'lstm': 0.2}
                ensemble_pred = sum(predictions[model] * weights[model] for model in predictions)
                
                hourly_predictions.append({
                    "hour": hour,
                    "prediction": ensemble_pred,
                    "individual_predictions": predictions
                })
            
            return {
                "hourly_predictions": hourly_predictions,
                "peak_hours": self.identify_peak_hours(hourly_predictions),
                "confidence": 0.92,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in hourly demand prediction: {e}")
            raise e
    
    async def predict_weather_impact(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict how weather affects order demand"""
        try:
            weather_features = self.extract_weather_features(data)
            
            # Weather impact analysis
            weather_impact = {
                "rainy": -0.15,  # 15% decrease in orders
                "sunny": 0.10,   # 10% increase in orders
                "cloudy": 0.05,  # 5% increase in orders
                "stormy": -0.25, # 25% decrease in orders
                "hot": 0.08,     # 8% increase in orders
                "cold": 0.12     # 12% increase in orders
            }
            
            current_weather = data.get("weather_condition", "sunny")
            impact_factor = weather_features.get("impact_factor", weather_impact.get(current_weather, 0))
            
            # Adjust base prediction
            base_prediction = data.get("base_demand", 100)
            adjusted_prediction = base_prediction * (1 + impact_factor)
            
            return {
                "weather_condition": current_weather,
                "impact_factor": impact_factor,
                "base_demand": base_prediction,
                "adjusted_demand": adjusted_prediction,
                "demand_change_percentage": impact_factor * 100,
                "confidence": 0.88,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in weather impact prediction: {e}")
            raise e
    
    async def predict_event_demand(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict demand impact from special events"""
        try:
            event_features = self.extract_event_features(data)
            
            # Event impact analysis
            event_impacts = {
                "sports_event": 0.25,      # 25% increase
                "festival": 0.30,          # 30% increase
                "exam_period": 0.15,       # 15% increase
                "holiday": 0.20,           # 20% increase
                "weekend": 0.10,           # 10% increase
                "regular_day": 0.00        # No change
            }
            
            event_type = data.get("event_type", "regular_day")
            impact_factor = event_impacts.get(event_type, 0)
            
            # Calculate event demand
            base_demand = data.get("base_demand", 100)
            event_demand = base_demand * (1 + impact_factor)
            
            return {
                "event_type": event_type,
                "impact_factor": impact_factor,
                "base_demand": base_demand,
                "event_demand": event_demand,
                "demand_increase": event_demand - base_demand,
                "confidence": 0.90,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in event demand prediction: {e}")
            raise e
    
    async def predict_customer_behavior(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict customer ordering patterns and behavior"""
        try:
            customer_features = self.extract_customer_features(data)
            
            # Customer behavior analysis
            behavior_patterns = {
                "ordering_frequency": self.predict_ordering_frequency(customer_features),
                "preferred_times": self.predict_preferred_times(customer_features),
                "average_order_value": self.predict_average_order_value(customer_features),
                "loyalty_score": self.predict_loyalty_score(customer_features),
                "churn_probability": self.predict_churn_probability(customer_features)
            }
            
            return {
                "customer_id": data.get("customer_id"),
                "behavior_patterns": behavior_patterns,
                "confidence": 0.87,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in customer behavior prediction: {e}")
            raise e
    
    async def predict_product_popularity(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict product demand trends and popularity"""
        try:
            product_features = self.extract_product_features(data)
            
            # Product popularity analysis
            popularity_metrics = {
                "demand_trend": self.calculate_demand_trend(product_features),
                "seasonal_factor": self.calculate_seasonal_factor(product_features),
                "competition_impact": self.calculate_competition_impact(product_features),
                "price_elasticity": self.calculate_price_elasticity(product_features),
                "future_popularity": self.predict_future_popularity(product_features)
            }
            
            return {
                "product_id": data.get("product_id"),
                "popularity_metrics": popularity_metrics,
                "confidence": 0.89,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in product popularity prediction: {e}")
            raise e
    
    async def predict_delivery_times(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict expected delivery times based on various factors"""
        try:
            delivery_features = self.extract_delivery_features(data)
            
            # Delivery time prediction
            base_delivery_time = 30  # minutes
            adjustments = {
                "distance_factor": self.calculate_distance_factor(delivery_features),
                "traffic_factor": self.calculate_traffic_factor(delivery_features),
                "weather_factor": self.calculate_weather_factor(delivery_features),
                "time_of_day_factor": self.calculate_time_factor(delivery_features),
                "partner_availability_factor": self.calculate_partner_factor(delivery_features)
            }
            
            # Calculate adjusted delivery time
            total_adjustment = sum(adjustments.values())
            predicted_delivery_time = max(15, base_delivery_time + total_adjustment)
            
            return {
                "base_delivery_time": base_delivery_time,
                "adjustments": adjustments,
                "predicted_delivery_time": predicted_delivery_time,
                "confidence": 0.85,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in delivery time prediction: {e}")
            raise e
    
    async def predict_peak_hours(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Identify peak ordering hours and patterns"""
        try:
            hourly_data = data.get("hourly_data", [])
            
            # Analyze hourly patterns
            hourly_analysis = []
            for hour in range(24):
                hour_data = [entry for entry in hourly_data if entry.get("hour") == hour]
                if hour_data:
                    avg_orders = np.mean([entry.get("orders", 0) for entry in hour_data])
                    hourly_analysis.append({
                        "hour": hour,
                        "average_orders": avg_orders,
                        "is_peak": avg_orders > np.mean([entry.get("orders", 0) for entry in hourly_data]) * 1.2
                    })
            
            # Identify peak hours
            peak_hours = [hour for hour in hourly_analysis if hour["is_peak"]]
            off_peak_hours = [hour for hour in hourly_analysis if not hour["is_peak"]]
            
            return {
                "peak_hours": peak_hours,
                "off_peak_hours": off_peak_hours,
                "hourly_analysis": hourly_analysis,
                "peak_hour_count": len(peak_hours),
                "confidence": 0.93,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in peak hours prediction: {e}")
            raise e
    
    # Helper methods for feature extraction
    def extract_daily_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Extract features for daily demand prediction"""
        features = [
            data.get("day_of_week", 1),
            data.get("month", 1),
            data.get("is_holiday", 0),
            data.get("is_weekend", 0),
            data.get("previous_day_demand", 100),
            data.get("weather_temp", 25),
            data.get("weather_condition", 1),
            data.get("special_event", 0),
            data.get("campus_activity_level", 0.5),
            data.get("previous_week_avg", 95),
            data.get("previous_month_avg", 90),
            data.get("seasonal_factor", 1.0),
            data.get("marketing_campaign", 0),
            data.get("competitor_activity", 0),
            data.get("delivery_partner_count", 10),
            data.get("average_order_value", 150),
            data.get("customer_satisfaction", 4.5),
            data.get("delivery_success_rate", 0.95),
            data.get("payment_success_rate", 0.98),
            data.get("overall_rating", 4.2)
        ]
        return np.array(features)
    
    def extract_hourly_features(self, data: Dict[str, Any]) -> List[np.ndarray]:
        """Extract features for hourly demand prediction"""
        hourly_features = []
        for hour in range(24):
            features = [
                hour,
                data.get("day_of_week", 1),
                data.get("is_peak_hour", 0),
                data.get("previous_hour_demand", 50),
                data.get("weather_temp", 25),
                data.get("traffic_level", 0.5),
                data.get("campus_activity", 0.7),
                data.get("meal_time", 0),
                data.get("special_event", 0),
                data.get("partner_availability", 0.8),
                data.get("previous_day_same_hour", 45),
                data.get("previous_week_same_hour", 48),
                data.get("seasonal_hour_factor", 1.0),
                data.get("marketing_promotion", 0),
                data.get("competitor_promotion", 0),
                data.get("delivery_zone_capacity", 0.9),
                data.get("average_delivery_time", 30),
                data.get("customer_wait_time", 15),
                data.get("order_completion_rate", 0.92),
                data.get("customer_feedback_score", 4.3)
            ]
            hourly_features.append(np.array(features))
        return hourly_features
    
    def extract_weather_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract weather-related features"""
        return {
            "temperature": data.get("temperature", 25),
            "humidity": data.get("humidity", 60),
            "wind_speed": data.get("wind_speed", 10),
            "precipitation": data.get("precipitation", 0),
            "weather_condition": data.get("weather_condition", "sunny"),
            "impact_factor": data.get("weather_impact_factor", 0)
        }
    
    def extract_event_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract event-related features"""
        return {
            "event_type": data.get("event_type", "regular_day"),
            "event_size": data.get("event_size", 0),
            "event_duration": data.get("event_duration", 0),
            "event_location": data.get("event_location", "campus"),
            "previous_event_impact": data.get("previous_event_impact", 0)
        }
    
    def extract_customer_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract customer-related features"""
        return {
            "customer_id": data.get("customer_id"),
            "age": data.get("age", 25),
            "gender": data.get("gender", "unknown"),
            "location": data.get("location", "campus"),
            "order_history": data.get("order_history", []),
            "preferences": data.get("preferences", {}),
            "loyalty_points": data.get("loyalty_points", 0),
            "last_order_date": data.get("last_order_date"),
            "average_order_value": data.get("average_order_value", 0),
            "delivery_address": data.get("delivery_address", "")
        }
    
    def extract_product_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract product-related features"""
        return {
            "product_id": data.get("product_id"),
            "category": data.get("category", "food"),
            "price": data.get("price", 0),
            "rating": data.get("rating", 0),
            "review_count": data.get("review_count", 0),
            "availability": data.get("availability", True),
            "seasonal": data.get("seasonal", False),
            "competitor_price": data.get("competitor_price", 0),
            "marketing_promotion": data.get("marketing_promotion", False)
        }
    
    def extract_delivery_features(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract delivery-related features"""
        return {
            "distance": data.get("distance", 2.0),
            "traffic_level": data.get("traffic_level", 0.5),
            "weather_condition": data.get("weather_condition", "sunny"),
            "time_of_day": data.get("time_of_day", 12),
            "day_of_week": data.get("day_of_week", 1),
            "partner_availability": data.get("partner_availability", 0.8),
            "delivery_zone": data.get("delivery_zone", "campus"),
            "special_instructions": data.get("special_instructions", "")
        }
    
    # Additional helper methods
    def identify_peak_hours(self, hourly_predictions: List[Dict]) -> List[int]:
        """Identify peak hours from hourly predictions"""
        if not hourly_predictions:
            return []
        
        predictions = [hour["prediction"] for hour in hourly_predictions]
        mean_prediction = np.mean(predictions)
        threshold = mean_prediction * 1.2
        
        peak_hours = [hour["hour"] for hour in hourly_predictions if hour["prediction"] > threshold]
        return sorted(peak_hours)
    
    def predict_ordering_frequency(self, customer_features: Dict[str, Any]) -> float:
        """Predict customer ordering frequency"""
        # Simple heuristic-based prediction
        base_frequency = 2.0  # orders per week
        factors = {
            "loyalty_points": customer_features.get("loyalty_points", 0) / 1000,
            "average_order_value": customer_features.get("average_order_value", 0) / 200,
            "order_history_length": len(customer_features.get("order_history", [])) / 10
        }
        
        adjustment = sum(factors.values()) * 0.5
        return max(0.5, base_frequency + adjustment)
    
    def predict_preferred_times(self, customer_features: Dict[str, Any]) -> List[int]:
        """Predict customer preferred ordering times"""
        # Analyze order history for preferred times
        order_history = customer_features.get("order_history", [])
        if not order_history:
            return [12, 18]  # Default lunch and dinner times
        
        # Extract ordering times and find most common
        times = [order.get("hour", 12) for order in order_history if order.get("hour")]
        if times:
            from collections import Counter
            time_counts = Counter(times)
            return [time for time, count in time_counts.most_common(3)]
        
        return [12, 18]
    
    def predict_average_order_value(self, customer_features: Dict[str, Any]) -> float:
        """Predict customer average order value"""
        current_avg = customer_features.get("average_order_value", 150)
        loyalty_factor = customer_features.get("loyalty_points", 0) / 1000
        
        # Loyalty increases order value
        adjustment = loyalty_factor * 20
        return max(50, current_avg + adjustment)
    
    def predict_loyalty_score(self, customer_features: Dict[str, Any]) -> float:
        """Predict customer loyalty score (0-1)"""
        factors = {
            "order_frequency": len(customer_features.get("order_history", [])) / 50,
            "loyalty_points": customer_features.get("loyalty_points", 0) / 5000,
            "average_order_value": customer_features.get("average_order_value", 0) / 300,
            "recency": 1.0  # Placeholder for recency calculation
        }
        
        loyalty_score = sum(factors.values()) / len(factors)
        return min(1.0, max(0.0, loyalty_score))
    
    def predict_churn_probability(self, customer_features: Dict[str, Any]) -> float:
        """Predict customer churn probability (0-1)"""
        # Inverse of loyalty score
        loyalty_score = self.predict_loyalty_score(customer_features)
        churn_probability = 1 - loyalty_score
        
        # Additional churn factors
        last_order_days = customer_features.get("days_since_last_order", 30)
        if last_order_days > 30:
            churn_probability += 0.2
        if last_order_days > 60:
            churn_probability += 0.3
        
        return min(1.0, max(0.0, churn_probability))
    
    def calculate_demand_trend(self, product_features: Dict[str, Any]) -> str:
        """Calculate product demand trend"""
        # Placeholder implementation
        return "increasing"
    
    def calculate_seasonal_factor(self, product_features: Dict[str, Any]) -> float:
        """Calculate seasonal factor for product"""
        # Placeholder implementation
        return 1.0
    
    def calculate_competition_impact(self, product_features: Dict[str, Any]) -> float:
        """Calculate competition impact on product"""
        # Placeholder implementation
        return 0.0
    
    def calculate_price_elasticity(self, product_features: Dict[str, Any]) -> float:
        """Calculate price elasticity for product"""
        # Placeholder implementation
        return -1.5
    
    def predict_future_popularity(self, product_features: Dict[str, Any]) -> float:
        """Predict future popularity of product"""
        # Placeholder implementation
        return 0.8
    
    def calculate_distance_factor(self, delivery_features: Dict[str, Any]) -> float:
        """Calculate distance factor for delivery time"""
        distance = delivery_features.get("distance", 2.0)
        return (distance - 2.0) * 5  # 5 minutes per km over 2km
    
    def calculate_traffic_factor(self, delivery_features: Dict[str, Any]) -> float:
        """Calculate traffic factor for delivery time"""
        traffic_level = delivery_features.get("traffic_level", 0.5)
        return (traffic_level - 0.5) * 20  # 20 minutes for heavy traffic
    
    def calculate_weather_factor(self, delivery_features: Dict[str, Any]) -> float:
        """Calculate weather factor for delivery time"""
        weather = delivery_features.get("weather_condition", "sunny")
        weather_factors = {
            "sunny": 0,
            "cloudy": 2,
            "rainy": 8,
            "stormy": 15,
            "snowy": 12
        }
        return weather_factors.get(weather, 0)
    
    def calculate_time_factor(self, delivery_features: Dict[str, Any]) -> float:
        """Calculate time of day factor for delivery time"""
        hour = delivery_features.get("time_of_day", 12)
        if 7 <= hour <= 9:  # Morning rush
            return 5
        elif 17 <= hour <= 19:  # Evening rush
            return 8
        else:
            return 0
    
    def calculate_partner_factor(self, delivery_features: Dict[str, Any]) -> float:
        """Calculate partner availability factor for delivery time"""
        availability = delivery_features.get("partner_availability", 0.8)
        if availability < 0.5:
            return 10  # 10 minutes delay for low availability
        elif availability < 0.8:
            return 5   # 5 minutes delay for medium availability
        else:
            return 0   # No delay for high availability
