@echo off
title ZK4500 Fingerprint Scanner Service
echo Starting ZK4500 Fingerprint Scanner Web Bridge Service...
echo Please ensure your ZK4500 scanner is plugged into a USB port.
echo.
python zk_scanner_service.py
if %errorlevel% neq 0 (
    echo.
    echo Service failed to start.
    echo Please make sure Python 3.x is installed, added to PATH, and has the Pillow package.
    echo You can install Pillow by running: python -m pip install pillow
    pause
)
