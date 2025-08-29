import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow import keras
import joblib
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

class FraudDetectionService:
    def __init__(self):
        self.models = {
            'isolation_forest': IsolationForest(contamination=0.1, random_state=42),
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'neural_network': self.build_fraud_neural_network(),
            'lstm': self.build_fraud_lstm_model()
        }
        self.scaler = StandardScaler()
        self.is_trained = False
        self.fraud_threshold = 0.7
        
    def build_fraud_neural_network(self):
        """Build neural network for fraud detection"""
        model = keras.Sequential([
            keras.layers.Dense(128, activation='relu', input_shape=(25,)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dense(16, activation='relu'),
            keras.layers.Dense(1, activation='sigmoid')
        ])
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        return model
    
    def build_fraud_lstm_model(self):
        """Build LSTM model for sequential fraud detection"""
        model = keras.Sequential([
            keras.layers.LSTM(64, return_sequences=True, input_shape=(10, 25)),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.2),
            keras.layers.LSTM(32, return_sequences=False),
            keras.layers.BatchNormalization(),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(16, activation='relu'),
            keras.layers.Dense(1, activation='sigmoid')
        ])
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        return model
    
    async def detect_fake_orders(self, data: Dict[str, Any]) -> float:
        """Detect fraudulent/fake orders"""
        try:
            # Extract order features
            features = self.extract_order_fraud_features(data)
            
            # Make predictions with all models
            predictions = {}
            for model_name, model in self.models.items():
                if model_name == 'lstm':
                    # Reshape for LSTM
                    lstm_features = features.reshape(1, 10, 25)
                    pred = model.predict(lstm_features, verbose=0)[0][0]
                elif model_name == 'isolation_forest':
                    # Isolation Forest returns -1 for anomalies, 1 for normal
                    pred = 1 - (model.predict([features])[0] + 1) / 2  # Convert to 0-1 scale
                else:
                    pred = model.predict_proba([features])[0][1]  # Probability of fraud
                
                predictions[model_name] = float(pred)
            
            # Ensemble prediction (weighted average)
            weights = {'isolation_forest': 0.3, 'random_forest': 0.3, 'neural_network': 0.2, 'lstm': 0.2}
            fraud_score = sum(predictions[model] * weights[model] for model in predictions)
            
            return fraud_score
            
        except Exception as e:
            logger.error(f"Error in fake order detection: {e}")
            raise e
    
    async def detect_payment_fraud(self, data: Dict[str, Any]) -> float:
        """Detect payment fraud patterns"""
        try:
            # Extract payment features
            features = self.extract_payment_fraud_features(data)
            
            # Make predictions with all models
            predictions = {}
            for model_name, model in self.models.items():
                if model_name == 'lstm':
                    # Reshape for LSTM
                    lstm_features = features.reshape(1, 10, 25)
                    pred = model.predict(lstm_features, verbose=0)[0][0]
                elif model_name == 'isolation_forest':
                    # Isolation Forest returns -1 for anomalies, 1 for normal
                    pred = 1 - (model.predict([features])[0] + 1) / 2  # Convert to 0-1 scale
                else:
                    pred = model.predict_proba([features])[0][1]  # Probability of fraud
                
                predictions[model_name] = float(pred)
            
            # Ensemble prediction (weighted average)
            weights = {'isolation_forest': 0.25, 'random_forest': 0.35, 'neural_network': 0.25, 'lstm': 0.15}
            fraud_score = sum(predictions[model] * weights[model] for model in predictions)
            
            return fraud_score
            
        except Exception as e:
            logger.error(f"Error in payment fraud detection: {e}")
            raise e
    
    async def detect_account_takeover(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect account takeover attempts"""
        try:
            account_data = data.get("account_data", {})
            login_attempts = data.get("login_attempts", [])
            device_info = data.get("device_info", {})
            
            # Calculate risk factors
            risk_factors = {
                "failed_login_attempts": len([attempt for attempt in login_attempts if not attempt.get("success", True)]),
                "multiple_devices": len(set(attempt.get("device_id") for attempt in login_attempts)),
                "unusual_location": self.check_unusual_location(account_data, login_attempts),
                "password_changes": self.check_recent_password_changes(account_data),
                "suspicious_activity": self.check_suspicious_activity(account_data)
            }
            
            # Calculate overall risk score
            risk_score = self.calculate_account_risk_score(risk_factors)
            
            # Determine threat level
            threat_level = self.determine_threat_level(risk_score)
            
            # Generate recommendations
            recommendations = self.generate_account_security_recommendations(risk_factors, risk_score)
            
            return {
                "risk_score": risk_score,
                "threat_level": threat_level,
                "risk_factors": risk_factors,
                "recommendations": recommendations,
                "is_takeover_attempt": risk_score > self.fraud_threshold,
                "confidence": 0.92,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in account takeover detection: {e}")
            raise e
    
    async def detect_delivery_fraud(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect delivery-related fraud"""
        try:
            delivery_data = data.get("delivery_data", {})
            order_data = data.get("order_data", {})
            partner_data = data.get("partner_data", {})
            
            # Calculate fraud indicators
            fraud_indicators = {
                "unusual_delivery_time": self.check_unusual_delivery_time(delivery_data),
                "suspicious_route": self.check_suspicious_route(delivery_data),
                "fake_delivery_photos": self.check_delivery_photos(delivery_data),
                "partner_anomalies": self.check_partner_anomalies(partner_data),
                "order_pattern_anomalies": self.check_order_pattern_anomalies(order_data)
            }
            
            # Calculate fraud score
            fraud_score = self.calculate_delivery_fraud_score(fraud_indicators)
            
            # Determine fraud type
            fraud_type = self.determine_delivery_fraud_type(fraud_indicators)
            
            # Generate evidence
            evidence = self.collect_delivery_fraud_evidence(fraud_indicators)
            
            return {
                "fraud_score": fraud_score,
                "fraud_type": fraud_type,
                "fraud_indicators": fraud_indicators,
                "evidence": evidence,
                "is_fraudulent": fraud_score > self.fraud_threshold,
                "confidence": 0.89,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in delivery fraud detection: {e}")
            raise e
    
    async def detect_collusion_fraud(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect collusion between customers and delivery partners"""
        try:
            orders = data.get("orders", [])
            partners = data.get("partners", [])
            customers = data.get("customers", [])
            
            # Analyze patterns for collusion
            collusion_patterns = {
                "repeated_partner_customer_pairs": self.analyze_partner_customer_pairs(orders, partners, customers),
                "unusual_order_patterns": self.analyze_order_patterns(orders),
                "suspicious_ratings": self.analyze_suspicious_ratings(orders),
                "fake_deliveries": self.analyze_fake_deliveries(orders),
                "payment_anomalies": self.analyze_payment_anomalies(orders)
            }
            
            # Calculate collusion probability
            collusion_probability = self.calculate_collusion_probability(collusion_patterns)
            
            # Identify suspicious entities
            suspicious_entities = self.identify_suspicious_entities(collusion_patterns)
            
            # Generate investigation recommendations
            investigation_steps = self.generate_investigation_recommendations(collusion_patterns, collusion_probability)
            
            return {
                "collusion_probability": collusion_probability,
                "collusion_patterns": collusion_patterns,
                "suspicious_entities": suspicious_entities,
                "investigation_steps": investigation_steps,
                "is_collusion": collusion_probability > self.fraud_threshold,
                "confidence": 0.87,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in collusion fraud detection: {e}")
            raise e
    
    async def detect_identity_theft(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect identity theft and fake accounts"""
        try:
            user_data = data.get("user_data", {})
            registration_data = data.get("registration_data", {})
            activity_data = data.get("activity_data", {})
            
            # Analyze identity indicators
            identity_indicators = {
                "fake_phone_numbers": self.check_fake_phone_numbers(registration_data),
                "suspicious_emails": self.check_suspicious_emails(registration_data),
                "fake_addresses": self.check_fake_addresses(registration_data),
                "unusual_registration_patterns": self.check_registration_patterns(registration_data),
                "suspicious_activity_patterns": self.check_activity_patterns(activity_data)
            }
            
            # Calculate identity theft probability
            theft_probability = self.calculate_identity_theft_probability(identity_indicators)
            
            # Determine risk level
            risk_level = self.determine_identity_risk_level(theft_probability)
            
            # Generate verification steps
            verification_steps = self.generate_identity_verification_steps(identity_indicators, theft_probability)
            
            return {
                "theft_probability": theft_probability,
                "risk_level": risk_level,
                "identity_indicators": identity_indicators,
                "verification_steps": verification_steps,
                "is_identity_theft": theft_probability > self.fraud_threshold,
                "confidence": 0.91,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error in identity theft detection: {e}")
            raise e
    
    # Helper methods for feature extraction
    def extract_order_fraud_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Extract features for order fraud detection"""
        features = [
            data.get("order_amount", 0),
            data.get("customer_age_days", 0),
            data.get("customer_order_count", 0),
            data.get("delivery_distance", 0),
            data.get("order_time_hour", 12),
            data.get("is_new_customer", 0),
            data.get("payment_method_risk", 0),
            data.get("device_fingerprint_risk", 0),
            data.get("location_risk", 0),
            data.get("order_pattern_anomaly", 0),
            data.get("customer_rating", 0),
            data.get("previous_fraud_incidents", 0),
            data.get("order_complexity", 0),
            data.get("delivery_time_anomaly", 0),
            data.get("payment_failure_rate", 0),
            data.get("account_age_days", 0),
            data.get("social_media_verification", 0),
            data.get("email_verification", 0),
            data.get("phone_verification", 0),
            data.get("address_verification", 0),
            data.get("order_frequency_anomaly", 0),
            data.get("delivery_address_risk", 0),
            data.get("payment_card_risk", 0),
            data.get("browser_fingerprint_risk", 0),
            data.get("network_risk", 0)
        ]
        return np.array(features)
    
    def extract_payment_fraud_features(self, data: Dict[str, Any]) -> np.ndarray:
        """Extract features for payment fraud detection"""
        features = [
            data.get("payment_amount", 0),
            data.get("card_age_days", 0),
            data.get("card_usage_frequency", 0),
            data.get("card_geographic_risk", 0),
            data.get("card_issuer_risk", 0),
            data.get("transaction_time_hour", 12),
            data.get("transaction_day_of_week", 1),
            data.get("merchant_category_risk", 0),
            data.get("transaction_amount_anomaly", 0),
            data.get("card_velocity", 0),
            data.get("previous_declines", 0),
            data.get("card_not_present", 0),
            data.get("international_transaction", 0),
            data.get("card_verification_method", 0),
            data.get("billing_address_mismatch", 0),
            data.get("shipping_address_mismatch", 0),
            data.get("device_fingerprint_risk", 0),
            data.get("ip_address_risk", 0),
            data.get("user_agent_risk", 0),
            data.get("session_duration", 0),
            data.get("page_load_time", 0),
            data.get("form_fill_time", 0),
            data.get("mouse_movement_pattern", 0),
            data.get("keyboard_pattern", 0),
            data.get("previous_fraud_incidents", 0)
        ]
        return np.array(features)
    
    # Helper methods for fraud detection
    def check_unusual_location(self, account_data: Dict, login_attempts: List[Dict]) -> float:
        """Check for unusual login locations"""
        # Placeholder implementation
        return 0.1
    
    def check_recent_password_changes(self, account_data: Dict) -> float:
        """Check for recent password changes"""
        # Placeholder implementation
        return 0.05
    
    def check_suspicious_activity(self, account_data: Dict) -> float:
        """Check for suspicious account activity"""
        # Placeholder implementation
        return 0.2
    
    def calculate_account_risk_score(self, risk_factors: Dict) -> float:
        """Calculate overall account risk score"""
        # Placeholder implementation
        weights = {
            "failed_login_attempts": 0.3,
            "multiple_devices": 0.2,
            "unusual_location": 0.25,
            "password_changes": 0.15,
            "suspicious_activity": 0.1
        }
        
        risk_score = sum(risk_factors[factor] * weights[factor] for factor in risk_factors)
        return min(1.0, risk_score)
    
    def determine_threat_level(self, risk_score: float) -> str:
        """Determine threat level based on risk score"""
        if risk_score > 0.8:
            return "critical"
        elif risk_score > 0.6:
            return "high"
        elif risk_score > 0.4:
            return "medium"
        elif risk_score > 0.2:
            return "low"
        else:
            return "minimal"
    
    def generate_account_security_recommendations(self, risk_factors: Dict, risk_score: float) -> List[str]:
        """Generate account security recommendations"""
        recommendations = []
        
        if risk_factors["failed_login_attempts"] > 3:
            recommendations.append("Implement account lockout after failed attempts")
        
        if risk_factors["multiple_devices"] > 5:
            recommendations.append("Enable device verification for new logins")
        
        if risk_factors["unusual_location"] > 0.5:
            recommendations.append("Enable location-based authentication")
        
        if risk_score > 0.7:
            recommendations.append("Require additional verification for sensitive operations")
        
        return recommendations
    
    def check_unusual_delivery_time(self, delivery_data: Dict) -> float:
        """Check for unusual delivery times"""
        # Placeholder implementation
        return 0.15
    
    def check_suspicious_route(self, delivery_data: Dict) -> float:
        """Check for suspicious delivery routes"""
        # Placeholder implementation
        return 0.2
    
    def check_delivery_photos(self, delivery_data: Dict) -> float:
        """Check delivery photos for authenticity"""
        # Placeholder implementation
        return 0.1
    
    def check_partner_anomalies(self, partner_data: Dict) -> float:
        """Check for partner behavior anomalies"""
        # Placeholder implementation
        return 0.25
    
    def check_order_pattern_anomalies(self, order_data: Dict) -> float:
        """Check for order pattern anomalies"""
        # Placeholder implementation
        return 0.3
    
    def calculate_delivery_fraud_score(self, fraud_indicators: Dict) -> float:
        """Calculate delivery fraud score"""
        # Placeholder implementation
        weights = {
            "unusual_delivery_time": 0.2,
            "suspicious_route": 0.25,
            "fake_delivery_photos": 0.15,
            "partner_anomalies": 0.25,
            "order_pattern_anomalies": 0.15
        }
        
        fraud_score = sum(fraud_indicators[factor] * weights[factor] for factor in fraud_indicators)
        return min(1.0, fraud_score)
    
    def determine_delivery_fraud_type(self, fraud_indicators: Dict) -> str:
        """Determine type of delivery fraud"""
        # Placeholder implementation
        if fraud_indicators["fake_delivery_photos"] > 0.5:
            return "fake_delivery_photos"
        elif fraud_indicators["suspicious_route"] > 0.5:
            return "route_manipulation"
        elif fraud_indicators["partner_anomalies"] > 0.5:
            return "partner_collusion"
        else:
            return "general_delivery_fraud"
    
    def collect_delivery_fraud_evidence(self, fraud_indicators: Dict) -> List[Dict]:
        """Collect evidence for delivery fraud"""
        # Placeholder implementation
        evidence = []
        
        for indicator, score in fraud_indicators.items():
            if score > 0.3:
                evidence.append({
                    "type": indicator,
                    "score": score,
                    "description": f"High {indicator} score detected"
                })
        
        return evidence
    
    def analyze_partner_customer_pairs(self, orders: List[Dict], partners: List[Dict], customers: List[Dict]) -> float:
        """Analyze partner-customer pairs for collusion"""
        # Placeholder implementation
        return 0.2
    
    def analyze_order_patterns(self, orders: List[Dict]) -> float:
        """Analyze order patterns for anomalies"""
        # Placeholder implementation
        return 0.15
    
    def analyze_suspicious_ratings(self, orders: List[Dict]) -> float:
        """Analyze ratings for suspicious patterns"""
        # Placeholder implementation
        return 0.25
    
    def analyze_fake_deliveries(self, orders: List[Dict]) -> float:
        """Analyze deliveries for fake patterns"""
        # Placeholder implementation
        return 0.3
    
    def analyze_payment_anomalies(self, orders: List[Dict]) -> float:
        """Analyze payment patterns for anomalies"""
        # Placeholder implementation
        return 0.2
    
    def calculate_collusion_probability(self, collusion_patterns: Dict) -> float:
        """Calculate collusion probability"""
        # Placeholder implementation
        weights = {
            "repeated_partner_customer_pairs": 0.25,
            "unusual_order_patterns": 0.2,
            "suspicious_ratings": 0.25,
            "fake_deliveries": 0.2,
            "payment_anomalies": 0.1
        }
        
        probability = sum(collusion_patterns[pattern] * weights[pattern] for pattern in collusion_patterns)
        return min(1.0, probability)
    
    def identify_suspicious_entities(self, collusion_patterns: Dict) -> List[Dict]:
        """Identify suspicious entities"""
        # Placeholder implementation
        return [
            {"type": "customer", "id": "cust_123", "risk_score": 0.8},
            {"type": "partner", "id": "partner_456", "risk_score": 0.7}
        ]
    
    def generate_investigation_recommendations(self, collusion_patterns: Dict, collusion_probability: float) -> List[str]:
        """Generate investigation recommendations"""
        recommendations = []
        
        if collusion_probability > 0.7:
            recommendations.append("Immediate investigation required")
            recommendations.append("Suspend suspicious accounts temporarily")
        
        if collusion_patterns["fake_deliveries"] > 0.5:
            recommendations.append("Review delivery verification process")
        
        if collusion_patterns["suspicious_ratings"] > 0.5:
            recommendations.append("Audit rating system for manipulation")
        
        return recommendations
    
    def check_fake_phone_numbers(self, registration_data: Dict) -> float:
        """Check for fake phone numbers"""
        # Placeholder implementation
        return 0.1
    
    def check_suspicious_emails(self, registration_data: Dict) -> float:
        """Check for suspicious email patterns"""
        # Placeholder implementation
        return 0.15
    
    def check_fake_addresses(self, registration_data: Dict) -> float:
        """Check for fake addresses"""
        # Placeholder implementation
        return 0.2
    
    def check_registration_patterns(self, registration_data: Dict) -> float:
        """Check for suspicious registration patterns"""
        # Placeholder implementation
        return 0.25
    
    def check_activity_patterns(self, activity_data: Dict) -> float:
        """Check for suspicious activity patterns"""
        # Placeholder implementation
        return 0.3
    
    def calculate_identity_theft_probability(self, identity_indicators: Dict) -> float:
        """Calculate identity theft probability"""
        # Placeholder implementation
        weights = {
            "fake_phone_numbers": 0.2,
            "suspicious_emails": 0.15,
            "fake_addresses": 0.25,
            "unusual_registration_patterns": 0.25,
            "suspicious_activity_patterns": 0.15
        }
        
        probability = sum(identity_indicators[indicator] * weights[indicator] for indicator in identity_indicators)
        return min(1.0, probability)
    
    def determine_identity_risk_level(self, theft_probability: float) -> str:
        """Determine identity risk level"""
        if theft_probability > 0.8:
            return "critical"
        elif theft_probability > 0.6:
            return "high"
        elif theft_probability > 0.4:
            return "medium"
        elif theft_probability > 0.2:
            return "low"
        else:
            return "minimal"
    
    def generate_identity_verification_steps(self, identity_indicators: Dict, theft_probability: float) -> List[str]:
        """Generate identity verification steps"""
        verification_steps = []
        
        if theft_probability > 0.6:
            verification_steps.append("Require government ID verification")
            verification_steps.append("Enable two-factor authentication")
        
        if identity_indicators["fake_phone_numbers"] > 0.5:
            verification_steps.append("Verify phone number with SMS code")
        
        if identity_indicators["suspicious_emails"] > 0.5:
            verification_steps.append("Verify email address")
        
        if identity_indicators["fake_addresses"] > 0.5:
            verification_steps.append("Verify address with utility bill")
        
        return verification_steps
