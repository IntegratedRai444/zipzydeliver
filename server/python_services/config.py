import os
from typing import Optional

class Settings:
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Zipzy Python AI Services"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/zipzy")
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Model Paths
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./models")
    
    # Service URLs
    NODEJS_SERVICE_URL: str = os.getenv("NODEJS_SERVICE_URL", "http://localhost:3000")
    
    # CORS Origins
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080"
    ]
    
    # ML Model Configuration
    DEMAND_PREDICTION_MODEL_PATH: str = os.path.join(MODEL_DIR, "demand_predictor.pkl")
    ROUTE_OPTIMIZATION_MODEL_PATH: str = os.path.join(MODEL_DIR, "route_optimizer.pkl")
    FRAUD_DETECTION_MODEL_PATH: str = os.path.join(MODEL_DIR, "fraud_detector.pkl")
    
    # Cache Configuration
    CACHE_TTL: int = 3600  # 1 hour
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # Security Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days

settings = Settings()
