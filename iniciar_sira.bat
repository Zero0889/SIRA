@echo off
chcp 65001 >nul 2>nul
title SIRA - Sistema Inteligente de Riego Agricola

:: ---------------------------------------------------------------
::  Lanzador de UNA sola ventana.
::  Puedes pasar el COM como argumento:   iniciar_sira.bat COM3
::  o dejar que te lo pregunte (Enter = COM2, el de Proteus).
:: ---------------------------------------------------------------

set "COM=%~1"
set "DEVICE=%~2"

if "%COM%"=="" (
    echo.
    echo  Puertos COM disponibles:
    "%~dp0backend\.venv\Scripts\python.exe" "%~dp0simulator\serial_bridge.py" --list
    echo.
    set /p "COM=  Puerto COM del Arduino/Proteus [COM2]: "
)
if "%COM%"=="" set "COM=COM2"
if "%DEVICE%"=="" set "DEVICE=ESP32-001"

powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0iniciar_sira.ps1" -Com %COM% -Device %DEVICE%
