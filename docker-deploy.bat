@echo off
REM ZipzyDeliver Docker Production Deployment Script for Windows
REM Usage: docker-deploy.bat [production|staging]

setlocal enabledelayedexpansion

REM Configuration
set APP_NAME=zipzydeliver
set DEPLOY_ENV=%1
if "%DEPLOY_ENV%"=="" set DEPLOY_ENV=production
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set LOG_FILE=.\docker-deploy_%TIMESTAMP%.log

echo 🐳 ZipzyDeliver Docker Production Deployment for Windows
echo Environment: %DEPLOY_ENV%
echo Timestamp: %TIMESTAMP%
echo.

REM Create logs directory
if not exist "logs" mkdir logs
if not exist "backups" mkdir backups
if not exist "uploads" mkdir uploads
if not exist "ssl" mkdir ssl

REM Function to log messages
:log
echo [%date% %time%] %~1 | tee -a "%LOG_FILE%"
goto :eof

REM Check Docker prerequisites
call :log "Checking Docker prerequisites..."

docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    exit /b 1
)

for /f "tokens=*" %%i in ('docker --version') do set DOCKER_VERSION=%%i
for /f "tokens=*" %%i in ('docker-compose --version') do set COMPOSE_VERSION=%%i

call :log "Docker version: %DOCKER_VERSION%"
call :log "Docker Compose version: %COMPOSE_VERSION%"

REM Check if Docker daemon is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker daemon is not running
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found. Please create one based on env.production
    exit /b 1
)

REM Check SSL certificates
if not exist "ssl\cert.pem" (
    call :log "SSL certificates not found. Please add your SSL certificates to ssl\ directory"
    call :log "For development, you can create self-signed certificates using OpenSSL"
)

REM Stop existing containers
call :log "Stopping existing containers..."
docker-compose down --remove-orphans
if %errorlevel% neq 0 (
    call :log "No existing containers to stop"
)

REM Remove old images if --clean flag is used
if "%2"=="--clean" (
    call :log "Cleaning old images..."
    docker image prune -f
    docker system prune -f
)

REM Build and start services
call :log "Building and starting services..."
docker-compose up --build -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    exit /b 1
)

REM Wait for services to be healthy
call :log "Waiting for services to be healthy..."
timeout /t 30 /nobreak >nul

REM Check service health
call :log "Checking service health..."
docker-compose ps | findstr "unhealthy" >nul
if %errorlevel% equ 0 (
    echo [WARNING] Some services are unhealthy. Check logs with: docker-compose logs
)

REM Show service status
call :log "Service status:"
docker-compose ps

REM Show logs
call :log "Recent logs:"
docker-compose logs --tail=20

REM Health check
call :log "Performing health check..."
set HEALTH_CHECK_URL=http://localhost/health

REM Try to use PowerShell for health check
powershell -Command "try { Invoke-WebRequest -Uri '%HEALTH_CHECK_URL%' -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    call :log "✅ Health check passed"
) else (
    call :log "⚠️ Health check failed. Service might still be starting..."
)

REM Show final status
call :log "🚀 Deployment completed successfully!"
call :log "📱 Application is accessible at:"
call :log "   - HTTP:  http://localhost (redirects to HTTPS)"
call :log "   - HTTPS: https://localhost"
call :log "   - API:   https://localhost/api"
call :log "   - Health: https://localhost/health"

call :log "🔧 Useful commands:"
call :log "   - View logs: docker-compose logs -f"
call :log "   - Stop services: docker-compose down"
call :log "   - Restart services: docker-compose restart"
call :log "   - Update services: docker-compose pull && docker-compose up -d"

REM Save deployment info
echo Deployment completed at %date% %time% >> "%LOG_FILE%"
echo Environment: %DEPLOY_ENV% >> "%LOG_FILE%"
echo Docker version: %DOCKER_VERSION% >> "%LOG_FILE%"
echo Compose version: %COMPOSE_VERSION% >> "%LOG_FILE%"

pause
