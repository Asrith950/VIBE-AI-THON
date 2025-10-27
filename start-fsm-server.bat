@echo off
echo ================================================
echo Starting Bot FSM API Server
echo ================================================
echo.
cd /d "%~dp0"
python fsm_server.py
pause
