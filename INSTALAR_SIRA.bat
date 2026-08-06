@echo off
chcp 65001 >nul 2>nul
title Instalador de SIRA
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0instalar_sira.ps1"
if errorlevel 1 (
  echo.
  echo La instalacion no pudo completarse.
  pause
)
