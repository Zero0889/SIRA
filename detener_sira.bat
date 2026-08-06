@echo off
chcp 65001 >nul
title SIRA - Detener
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0detener_sira.ps1"
echo.
pause
