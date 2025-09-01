@echo off
REM ZipzyDeliver Restart Script for Windows
REM Stops the current application and redeploys it

echo 🔄 ZipzyDeliver Restart Script for Windows

REM Get deployment environment from argument or use production
set DEPLOY_ENV=%1
if "%DEPLOY_ENV%"=="" set DEPLOY_ENV=production

echo Restarting application in %DEPLOY_ENV% mode...

REM Stop the current application
echo Stopping current application...
call stop.bat

REM Wait a moment for cleanup
timeout /t 2 /nobreak >nul

REM Deploy the application again
echo Redeploying application...
call deploy.bat %DEPLOY_ENV%

echo ✅ Restart completed successfully!
pause
