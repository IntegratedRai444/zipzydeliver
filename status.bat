@echo off
REM ZipzyDeliver Status Script for Windows
REM Shows the current status of the application

echo 📊 ZipzyDeliver Status Check for Windows
echo.

REM Check if PID file exists
if not exist ".app.pid" (
    echo ❌ Application Status: NOT RUNNING
    echo    No PID file found
    pause
    exit /b 1
)

REM Read PID from file
for /f "tokens=*" %%i in (.app.pid) do set APP_PID=%%i

REM Check if process is running
tasklist /FI "PID eq %APP_PID%" 2>nul | find "%APP_PID%" >nul
if %errorlevel% neq 0 (
    echo ❌ Application Status: NOT RUNNING
    echo    Process %APP_PID% is not running
    echo    Cleaning up stale PID file...
    del .app.pid
    pause
    exit /b 1
)

echo ✅ Application Status: RUNNING
echo    PID: %APP_PID%

REM Get process start time and memory info
for /f "tokens=1,2,3,4,5" %%a in ('tasklist /FI "PID eq %APP_PID%" /FO CSV /V ^| find "%APP_PID%"') do (
    set START_TIME=%%e
    set MEMORY=%%c
)

echo    Started: %START_TIME%
echo    Memory: %MEMORY%

echo.

echo 🏥 Health Check:

REM Health check using PowerShell
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:5000/health' -UseBasicParsing | Out-Null; Write-Host '   ✅ Health endpoint: OK' } catch { Write-Host '   ❌ Health endpoint: FAILED' }"

REM Check if port is listening
netstat -an | find ":5000 " >nul
if %errorlevel% equ 0 (
    echo    ✅ Port 5000: LISTENING
) else (
    echo    ❌ Port 5000: NOT LISTENING
)

echo.

echo 📝 Recent Logs:
if exist "logs" (
    for /f "delims=" %%i in ('dir /b /o-d logs\app_*.log 2^>nul') do (
        echo    Latest log: %%i
        echo    Last 5 lines:
        powershell -Command "Get-Content 'logs\%%i' | Select-Object -Last 5 | ForEach-Object { Write-Host '     ' $_ }"
        goto :found_log
    )
    echo    No log files found
) else (
    echo    Logs directory not found
)

:found_log

echo.
echo 🔧 Management Commands:
echo    Stop:     stop.bat
echo    Restart:  restart.bat
echo    Deploy:   deploy.bat [production^|staging]
echo    Status:   status.bat

pause
