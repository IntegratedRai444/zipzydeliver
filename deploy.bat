@echo off
REM ZipzyDeliver Production Deployment Script for Windows
REM Usage: deploy.bat [production|staging]

setlocal enabledelayedexpansion

REM Configuration
set APP_NAME=zipzydeliver
set DEPLOY_ENV=%1
if "%DEPLOY_ENV%"=="" set DEPLOY_ENV=production
set TIMESTAMP=%date:~10,4%%date:~4,2%%date:~7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=.\backups
set LOG_FILE=.\deploy_%TIMESTAMP%.log

echo 🚀 ZipzyDeliver Deployment Script for Windows
echo Environment: %DEPLOY_ENV%
echo Timestamp: %TIMESTAMP%
echo.

REM Create logs directory
if not exist "logs" mkdir logs
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Function to log messages
:log
echo [%date% %time%] %~1 | tee -a "%LOG_FILE%"
goto :eof

REM Check prerequisites
call :log "Checking prerequisites..."

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    exit /b 1
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

call :log "Node.js version: %NODE_VERSION%"
call :log "npm version: %NPM_VERSION%"

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found. Please create one based on env.example
    exit /b 1
)

REM Backup current deployment if exists
if exist "dist" (
    call :log "Creating backup of current deployment..."
    powershell -Command "Compress-Archive -Path 'dist' -DestinationPath '%BACKUP_DIR%\backup_%TIMESTAMP%.zip' -Force" || echo [WARNING] Failed to create backup
)

REM Install dependencies
call :log "Installing dependencies..."
call npm ci --only=production
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies
    exit /b 1
)

REM Build the application
call :log "Building application..."
if "%DEPLOY_ENV%"=="production" (
    call :log "Building for production..."
    call npm run build
) else (
    call :log "Building for staging..."
    call npm run build:mongodb
)

if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    exit /b 1
)

REM Verify build output
if not exist "dist" (
    echo [ERROR] Build failed - dist directory not found
    exit /b 1
)

call :log "Build completed successfully"

REM Set environment variables
set NODE_ENV=%DEPLOY_ENV%
call :log "Set NODE_ENV to %DEPLOY_ENV%"

REM Create production .env if needed
if "%DEPLOY_ENV%"=="production" if exist "env.production" (
    call :log "Setting up production environment..."
    copy "env.production" ".env.production.backup" >nul
)

REM Start the application
call :log "Starting application..."
if "%DEPLOY_ENV%"=="production" (
    call :log "Starting production server..."
    start /B npm start > "logs\app_%TIMESTAMP%.log" 2>&1
) else (
    call :log "Starting staging server..."
    start /B npm run start:mongodb > "logs\app_%TIMESTAMP%.log" 2>&1
)

REM Wait a moment for the app to start
timeout /t 5 /nobreak >nul

REM Check if application is running
for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq node.exe" /FO CSV ^| findstr "node.exe"') do set APP_PID=%%i
set APP_PID=!APP_PID:"=!

if "%APP_PID%"=="" (
    echo [ERROR] Application failed to start. Check logs\app_%TIMESTAMP%.log
    exit /b 1
)

call :log "Application started with PID: %APP_PID%"

REM Save PID to file for easy management
echo %APP_PID% > .app.pid

REM Health check
call :log "Performing health check..."
set MAX_ATTEMPTS=30
set ATTEMPT=1

:health_check_loop
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    call :log "✅ Health check passed! Application is running successfully"
    goto :health_check_success
)

if %ATTEMPT% geq %MAX_ATTEMPTS% (
    echo [ERROR] Health check failed after %MAX_ATTEMPTS% attempts
    exit /b 1
)

call :log "Health check attempt %ATTEMPT%/%MAX_ATTEMPTS% failed, waiting 2 seconds..."
timeout /t 2 /nobreak >nul
set /a ATTEMPT+=1
goto :health_check_loop

:health_check_success

REM Final status
call :log "🎉 Deployment completed successfully!"
call :log "Application is running on http://localhost:5000"
call :log "Health endpoint: http://localhost:5000/health"
call :log "PID file: .app.pid"
call :log "Log file: logs\app_%TIMESTAMP%.log"
call :log "Deployment log: %LOG_FILE%"

echo.
echo ✅ Deployment Summary:
echo   Environment: %DEPLOY_ENV%
echo   Status: Running
echo   PID: %APP_PID%
echo   URL: http://localhost:5000
echo   Health: http://localhost:5000/health
echo.
echo Useful commands:
echo   Stop app: stop.bat
echo   Restart app: restart.bat
echo   View logs: type logs\app_%TIMESTAMP%.log
echo   Check status: status.bat

pause
