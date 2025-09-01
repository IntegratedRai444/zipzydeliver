@echo off
echo 🔴 Stopping ZipzyDeliver Development Environment...
echo.

echo 🛑 Stopping all Node.js processes...
taskkill /f /im node.exe 2>nul

if %errorlevel% equ 0 (
    echo ✅ All Node.js processes stopped successfully
) else (
    echo ℹ️  No Node.js processes were running
)

echo.
echo 🧹 Ports 3000 and 5000 are now free
echo.
echo Press any key to close this window...
pause >nul
