# Zipzy Python AI Services
__version__ = "2.0.0"
__author__ = "Zipzy Delivery Team"
__description__ = "Advanced AI/ML services for delivery optimization"

from .config import settings
from .main import app

__all__ = [
    "settings",
    "app",
    "__version__",
    "__author__",
    "__description__"
]
