@echo off
chcp 65001 >nul
title AutoBot v1.1.0 — Seidor Peru

echo ╔══════════════════════════════════════╗
echo ║         AutoBot v1.1.0               ║
echo ║         Seidor Peru                  ║
echo ╚══════════════════════════════════════╝
echo.

cd /d "%~dp0"

:: Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo         Descargalo en: https://nodejs.org
    pause
    exit /b 1
)

:: Instalar dependencias si faltan
if not exist "node_modules\" (
    echo [INFO] Primera vez - instalando dependencias del servidor...
    call npm install
)

if not exist "ui\node_modules\" (
    echo [INFO] Primera vez - instalando dependencias del dashboard...
    cd ui && call npm install && cd ..
)

echo.
echo [OK] Iniciando AutoBot...
echo      Dashboard: http://localhost:5173
echo      Backend:   http://localhost:3001
echo.
echo      Cierra esta ventana para detener AutoBot.
echo.

:: Abrir navegador despues de 3 segundos
start "" /b cmd /c "timeout /t 3 >nul && start http://localhost:5173"

:: Lanzar servidor + UI
call npm start
