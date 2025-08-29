# Python AI Services Package
__version__ = "2.0.0"
__author__ = "Zipzy Delivery Team"

from .demand_prediction import DemandPredictionService
from .route_optimization import RouteOptimizationService
from .nlp_service import NLPService
from .analytics_service import AnalyticsService
from .recommendation_service import RecommendationService
from .fraud_detection import FraudDetectionService
from .weather_service import WeatherService
from .traffic_service import TrafficService
from .inventory_service import InventoryService
from .pricing_service import PricingService
from .customer_service import CustomerService
from .operational_service import OperationalService
from .financial_service import FinancialService

__all__ = [
    "DemandPredictionService",
    "RouteOptimizationService", 
    "NLPService",
    "AnalyticsService",
    "RecommendationService",
    "FraudDetectionService",
    "WeatherService",
    "TrafficService",
    "InventoryService",
    "PricingService",
    "CustomerService",
    "OperationalService",
    "FinancialService"
]
