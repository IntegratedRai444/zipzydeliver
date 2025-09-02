#!/usr/bin/env python3
"""
Startup script for Python services
This script installs dependencies and starts the Python services
"""

import subprocess
import sys
import os
import time
import signal
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class PythonServiceManager:
    def __init__(self):
        self.script_dir = Path(__file__).parent
        self.requirements_file = self.script_dir / "requirements.txt"
        self.bridge_file = self.script_dir / "integration" / "nodejs_bridge.py"
        self.process = None
        
    def check_python_version(self):
        """Check if Python version is compatible"""
        version = sys.version_info
        if version.major < 3 or (version.major == 3 and version.minor < 8):
            logger.error("Python 3.8 or higher is required")
            return False
        
        logger.info(f"Python version: {version.major}.{version.minor}.{version.micro}")
        return True
    
    def install_dependencies(self):
        """Install Python dependencies"""
        try:
            logger.info("Installing Python dependencies...")
            
            # Check if requirements.txt exists
            if not self.requirements_file.exists():
                logger.warning("requirements.txt not found, creating basic requirements...")
                self.create_basic_requirements()
            
            # Install dependencies
            result = subprocess.run([
                sys.executable, "-m", "pip", "install", "-r", str(self.requirements_file)
            ], capture_output=True, text=True, cwd=self.script_dir)
            
            if result.returncode == 0:
                logger.info("Dependencies installed successfully")
                return True
            else:
                logger.error(f"Failed to install dependencies: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Error installing dependencies: {e}")
            return False
    
    def create_basic_requirements(self):
        """Create basic requirements.txt if it doesn't exist"""
        basic_requirements = """fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0
tensorflow==2.13.0
plotly==5.17.0
aiohttp==3.9.1
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
requests==2.31.0
asyncio==3.4.3
joblib==1.3.2
"""
        
        with open(self.requirements_file, 'w') as f:
            f.write(basic_requirements)
        
        logger.info("Created basic requirements.txt")
    
    def start_services(self):
        """Start Python services"""
        try:
            if not self.bridge_file.exists():
                logger.error(f"Bridge file not found: {self.bridge_file}")
                return False
            
            logger.info("Starting Python services...")
            
            # Start the FastAPI server
            self.process = subprocess.Popen([
                sys.executable, str(self.bridge_file)
            ], cwd=self.script_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            # Wait a moment for the service to start
            time.sleep(3)
            
            # Check if the process is still running
            if self.process.poll() is None:
                logger.info("Python services started successfully")
                return True
            else:
                stdout, stderr = self.process.communicate()
                logger.error(f"Failed to start Python services: {stderr.decode()}")
                return False
                
        except Exception as e:
            logger.error(f"Error starting Python services: {e}")
            return False
    
    def stop_services(self):
        """Stop Python services"""
        if self.process:
            logger.info("Stopping Python services...")
            self.process.terminate()
            try:
                self.process.wait(timeout=10)
                logger.info("Python services stopped successfully")
            except subprocess.TimeoutExpired:
                logger.warning("Force killing Python services...")
                self.process.kill()
                self.process.wait()
            self.process = None
    
    def setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            logger.info(f"Received signal {signum}, shutting down...")
            self.stop_services()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    def run(self):
        """Main run method"""
        logger.info("Starting Python Service Manager...")
        
        # Check Python version
        if not self.check_python_version():
            return False
        
        # Install dependencies
        if not self.install_dependencies():
            return False
        
        # Setup signal handlers
        self.setup_signal_handlers()
        
        # Start services
        if not self.start_services():
            return False
        
        try:
            # Keep the process running
            logger.info("Python services are running. Press Ctrl+C to stop.")
            while True:
                time.sleep(1)
                
                # Check if process is still running
                if self.process and self.process.poll() is not None:
                    logger.error("Python services process died unexpectedly")
                    return False
                    
        except KeyboardInterrupt:
            logger.info("Received keyboard interrupt")
        finally:
            self.stop_services()
        
        return True

def main():
    """Main entry point"""
    manager = PythonServiceManager()
    success = manager.run()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
