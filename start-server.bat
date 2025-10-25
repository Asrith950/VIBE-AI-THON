@echo off
echo ========================================
echo 3D BATTLEGROUND - Multiplayer Server
echo ========================================
echo.

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)
echo.

echo Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo ========================================
echo Starting Flask Server...
echo ========================================
echo Server will run on http://localhost:5000
echo Press Ctrl+C to stop the server
echo.
echo Open your browser to http://localhost:5000
echo Open multiple tabs to test multiplayer!
echo ========================================
echo.

python server.py

pause
