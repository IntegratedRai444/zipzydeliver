@echo off
echo 🚀 Starting ZipzyDeliver Development Environment...
echo.

echo 🔴 Stopping any existing Node processes...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Stopped existing processes
) else (
    echo ℹ️  No existing processes to stop
)

echo.
echo ⏳ Waiting 3 seconds for ports to be released...
timeout /t 3 /nobreak >nul

echo.
echo 🟢 Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "npm run dev:backend"

echo.
echo ⏳ Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo 🟢 Starting Frontend Server (Port 3000)...
start "Frontend Server" cmd /k "npm run dev:frontend"

echo.
echo ⏳ Waiting 5 seconds for frontend to start...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Opening browser...
start http://localhost:3000

echo.
echo ✅ Development environment started!
echo 📍 Backend: http://localhost:5000
echo 📍 Frontend: http://localhost:3000
echo 📍 Admin Bypass: http://localhost:3000/test-admin-bypass
echo 📍 User Bypass: http://localhost:3000/test-user-bypass
echo.
echo Press any key to close this window...
pause >nul
