@echo off
echo 🚀 Starting Zipzy Deliver and opening all tabs...
echo.

REM Check if server is already running
netstat -an | findstr ":5000" >nul
if %errorlevel% equ 0 (
    echo ✅ Server is already running on port 5000
) else (
    echo 🔄 Starting server...
    start "Zipzy Server" cmd /k "npm run dev"
    timeout /t 5 /nobreak >nul
)

REM Check if client is running
netstat -an | findstr ":3000" >nul
if %errorlevel% equ 0 (
    echo ✅ Client is already running on port 3000
) else (
    echo 🔄 Starting client...
    start "Zipzy Client" cmd /k "cd client && npm run dev"
    timeout /t 5 /nobreak >nul
)

echo.
echo 🌐 Opening quick access page...
echo 📁 File location: %cd%\quick-access.html
echo.

REM Open the quick access HTML file
start "" "quick-access.html"

echo ✅ Done! The quick access page should open in your browser.
echo.
echo 📋 What will open:
echo   1. 🏠 Main Application (http://localhost:3000)
echo   2. 👑 Admin Bypass (rishabhkapoor@atomicmail.io)
echo   3. 👤 User Bypass (rishabh.kapoor@test.com)
echo.
echo ⏳ If tabs don't open automatically, click the buttons on the page.
pause
