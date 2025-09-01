@echo off
REM ZipzyDeliver Stop Script for Windows
REM Stops the running application gracefully

echo 🛑 ZipzyDeliver Stop Script for Windows

REM Check if PID file exists
if not exist ".app.pid" (
    echo No PID file found. Application may not be running.
    pause
    exit /b 0
)

REM Read PID from file
for /f "tokens=*" %%i in (.app.pid) do set APP_PID=%%i

REM Check if process is running
tasklist /FI "PID eq %APP_PID%" 2>nul | find "%APP_PID%" >nul
if %errorlevel% neq 0 (
    echo Process %APP_PID% is not running. Cleaning up PID file.
    del .app.pid
    pause
    exit /b 0
)

echo Stopping application with PID: %APP_PID%

REM Try graceful shutdown first
taskkill /PID %APP_PID% /T

REM Wait for graceful shutdown (up to 10 seconds)
for /l %%i in (1,1,10) do (
    tasklist /FI "PID eq %APP_PID%" 2>nul | find "%APP_PID%" >nul
    if !errorlevel! neq 0 (
        echo ✅ Application stopped gracefully
        del .app.pid
        pause
        exit /b 0
    )
    echo Waiting for graceful shutdown... (%%i/10)
    timeout /t 1 /nobreak >nul
)

REM Force kill if still running
echo Force killing application...
taskkill /PID %APP_PID% /F /T

REM Wait a moment and check
timeout /t 2 /nobreak >nul
tasklist /FI "PID eq %APP_PID%" 2>nul | find "%APP_PID%" >nul
if %errorlevel% neq 0 (
    echo ✅ Application force stopped
    del .app.pid
) else (
    echo ❌ Failed to stop application
    pause
    exit /b 1
)

pause
