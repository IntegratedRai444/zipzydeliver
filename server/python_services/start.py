#!/usr/bin/env python3
"""
Startup script for Zipzy Python AI Services
"""

import uvicorn
import os
from config import settings

def main():
    """Start the FastAPI application"""
    print("🚀 Starting Zipzy Python AI Services...")
    print(f"📊 Version: {settings.PROJECT_NAME}")
    print(f"🌐 Host: 0.0.0.0")
    print(f"🔌 Port: 8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"🔍 ReDoc: http://localhost:8000/redoc")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    main()
