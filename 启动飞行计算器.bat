@echo off
title Flight Calculator
cd /d "%~dp0"
if exist "Flight Calculator V3.exe" (
    start "" "Flight Calculator V3.exe"
    exit /b 0
)
if exist "Flight Calculator V2.exe" (
    start "" "Flight Calculator V2.exe"
    exit /b 0
)
if exist "src-tauri\target\release\flight-calculator.exe" (
    start "" "src-tauri\target\release\flight-calculator.exe"
    exit /b 0
)
echo Please download the Windows EXE from GitHub Releases, or run npm run tauri:build.
pause
exit /b 1
